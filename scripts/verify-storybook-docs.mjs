import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

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

async function runBrowserCheck() {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
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
  const browser = await playwright.chromium.launch({ headless: true });

  const violations = [];
  try {
    const page = await browser.newPage();
    for (const entry of docsEntries) {
      await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=docs`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector("#storybook-docs, .sbdocs", { timeout: 10000 });
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
  } finally {
    await browser.close();
    server.close();
  }

  if (violations.length > 0) {
    console.error("Unsolicited open dialogs detected in Storybook Docs:", JSON.stringify(violations, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      checkedStaticIndex: true,
      docsCount: docsEntries.length,
      browserCheck: "passed",
      violations: 0,
    }),
  );
}

runBrowserCheck().catch((err) => {
  console.error(err);
  process.exit(1);
});
