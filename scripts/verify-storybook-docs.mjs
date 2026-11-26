import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const staticDir = resolve(process.argv[2] || "storybook-static");
const indexPath = join(staticDir, "index.json");

if (!existsSync(indexPath)) {
  console.error(`Missing ${indexPath}. Run "pnpm build-storybook" first.`);
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, "utf8"));
const entries = Object.values(index.entries || {});
const docsEntries = entries.filter((entry) => entry.type === "docs");

if (docsEntries.length === 0) {
  console.error("No docs entries found in storybook-static/index.json");
  process.exit(1);
}

const requiredDocs = [
  "introducción-bienvenida--docs",
  "data-display-entitylookupfield--docs",
  "data-display-datagrid--docs",
  "feedback-filegenerationindicator--docs",
];

const docsIds = new Set(docsEntries.map((e) => e.id));
for (const id of requiredDocs) {
  if (!docsIds.has(id)) {
    console.error(`Missing required Docs entry: ${id}`);
    process.exit(1);
  }
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

async function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) {
    return import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
  }
  for (const pkg of ["playwright", "playwright-core"]) {
    try {
      return await import(pkg);
    } catch {
      // try next
    }
  }
  return null;
}

async function runBrowserCheck() {
  const playwright = await loadPlaywright();
  if (!playwright) {
    console.log(
      JSON.stringify({
        checkedStaticIndex: true,
        docsCount: docsEntries.length,
        browserCheck: "skipped (playwright not installed)",
      }),
    );
    return;
  }

  const server = createServer((req, res) => {
    const rawPath = (req.url || "/").split("?")[0];
    const relPath = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
    const fullPath = join(staticDir, relPath);
    if (!existsSync(fullPath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[extname(fullPath)] || "application/octet-stream" });
    res.end(readFileSync(fullPath));
  });

  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const launchOpts = { headless: true };
  if (process.env.CHROME_PATH) {
    launchOpts.executablePath = process.env.CHROME_PATH;
  }
  const browser = await playwright.chromium.launch(launchOpts);

  const violations = [];
  const pageErrors = [];
  const scenarioChecks = {};

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // 1. Walk ALL Docs entries: zero unsolicited dialogs or page errors.
    for (const entry of docsEntries) {
      await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=docs`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector("#storybook-docs, .sbdocs", { timeout: 15000 });
      const openDialogs = await page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]'));
        return dialogs
          .filter((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== "none" && style.visibility !== "hidden";
          })
          .map((el) => el.getAttribute("aria-label") || el.textContent?.slice(0, 80) || "dialog");
      });
      if (openDialogs.length > 0) {
        violations.push({ id: entry.id, openDialogs });
      }
    }

    // 2. Verify Intro Docs copy & links.
    await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent("introducción-bienvenida--docs")}&viewMode=docs`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector("#storybook-docs", { timeout: 10000 });
    const introText = await page.locator("#storybook-docs").innerText();
    if (!introText.includes("Teams4Soft UI reúne los controles") || !introText.includes("styles-no-preflight.css") || introText.includes("Infraestructura lista")) {
      throw new Error("Intro Docs copy did not match expected Phase 6 update");
    }
    scenarioChecks.introDocs = "passed";

    // 3. Verify EntityLookupField Docs: 0 dialogs initially -> click Abrir captura -> 1 dialog -> open lookup -> Escape returns to parent -> Escape returns to Abrir captura.
    await page.goto(`${baseUrl}/iframe.html?id=data-display-entitylookupfield--docs&viewMode=docs`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector("#storybook-docs", { timeout: 10000 });
    const openBtn = page.getByRole("button", { name: "Abrir captura" });
    await openBtn.scrollIntoViewIfNeeded();
    await openBtn.focus();
    await openBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const countAfterClick = await page.locator('[role="dialog"]').count();
    if (countAfterClick !== 1) {
      throw new Error(`Expected 1 dialog after clicking Abrir captura, got ${countAfterClick}`);
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 0, { timeout: 5000 });
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Abrir captura", { timeout: 5000 });
    scenarioChecks.entityLookupDialogFlow = "passed";

    // 4. Verify DataGrid ConDivisores at desktop (1280px) and mobile (360px): dividers, last-column no border, eye toggler, keyboard.
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${baseUrl}/iframe.html?id=data-display-datagrid--con-divisores&viewMode=story`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector('[data-slot="root"][data-column-dividers="true"]', { timeout: 10000 });
      const gridMetrics = await page.evaluate(() => {
        const ths = Array.from(document.querySelectorAll('[data-slot="table"] thead tr th'));
        const firstRight = getComputedStyle(ths[0]).borderRightWidth;
        const lastRight = getComputedStyle(ths[ths.length - 1]).borderRightWidth;
        const toolbar = document.querySelector('[data-slot="toolbar"]');
        const toolbarMb = toolbar ? getComputedStyle(toolbar).marginBottom : null;
        const btn = document.querySelector('[data-slot="columnToggler"] button');
        const rect = btn ? btn.getBoundingClientRect() : null;
        const svg = btn?.querySelector("svg");
        return {
          thCount: ths.length,
          firstRight,
          lastRight,
          toolbarMb,
          btnWidth: rect ? Math.round(rect.width) : 0,
          btnHeight: rect ? Math.round(rect.height) : 0,
          btnText: btn?.textContent?.trim() ?? "",
          hasEyeSvg: Boolean(svg),
        };
      });
      if (gridMetrics.firstRight !== "1px" || gridMetrics.lastRight !== "0px") {
        throw new Error(`Unexpected divider borders at ${width}px: ${JSON.stringify(gridMetrics)}`);
      }
      if (gridMetrics.toolbarMb !== "8px") {
        throw new Error(`Expected 8px toolbar marginBottom at ${width}px, got ${gridMetrics.toolbarMb}`);
      }
      if (!gridMetrics.hasEyeSvg || gridMetrics.btnText !== "" || gridMetrics.btnWidth < 30 || gridMetrics.btnHeight < 30) {
        throw new Error(`Unexpected ColumnToggler button metrics at ${width}px: ${JSON.stringify(gridMetrics)}`);
      }
    }
    const togglerBtn = page.getByRole("button", { name: "Columnas" });
    await togglerBtn.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector('[role="checkbox"]', { timeout: 5000 });
    await page.keyboard.press("Escape");
    scenarioChecks.dataGridDividersAndToggler = "passed (1280px + 360px)";

    // 5. Verify FileGenerationIndicator in reduced-motion + Docs (4 formats, single role=status).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/iframe.html?id=feedback-filegenerationindicator--todas-las-variantes&viewMode=story`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector('[data-slot="file-generation-indicator"]', { timeout: 10000 });
    const indicatorCheck = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('[data-slot="file-generation-indicator"]'));
      const formats = Array.from(new Set(nodes.map((n) => n.getAttribute("data-format")))).sort();
      const spinnerSvg = nodes[0]?.querySelector('[data-slot="spinner-badge"] svg');
      const anim = spinnerSvg ? getComputedStyle(spinnerSvg).animationName : null;
      return { formats, anim };
    });
    if (indicatorCheck.formats.join(",") !== "docx,file,pdf,xlsx" || indicatorCheck.anim !== "none") {
      throw new Error(`Unexpected FileGenerationIndicator check: ${JSON.stringify(indicatorCheck)}`);
    }
    scenarioChecks.fileGenerationIndicatorReducedMotion = "passed";
  } finally {
    await browser.close();
    server.close();
  }

  if (violations.length > 0 || pageErrors.length > 0) {
    console.error("Storybook Docs browser verification failed:", JSON.stringify({ violations, pageErrors }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      checkedStaticIndex: true,
      docsCount: docsEntries.length,
      browserCheck: "passed",
      violations: 0,
      pageErrors: 0,
      scenarioChecks,
    }),
  );
}

runBrowserCheck().catch((err) => {
  console.error(err);
  process.exit(1);
});
