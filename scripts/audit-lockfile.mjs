import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const OSV_BASE_URL = "https://api.osv.dev";
const BATCH_SIZE = 500;
const MAX_PAGES = 20;

function unquote(value) {
  const s = value.trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

function stripPeerSuffix(version) {
  const idx = version.indexOf("(");
  return idx === -1 ? version : version.slice(0, idx);
}

function splitPkgKey(rawKey) {
  const key = unquote(rawKey);
  const base = stripPeerSuffix(key);
  const at = base.lastIndexOf("@");
  if (at <= 0) return null;
  return { name: base.slice(0, at), version: base.slice(at + 1) };
}

function parseKeyValue(trimmed) {
  let inQuote = null;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      continue;
    }
    if (ch === ":" && (i === trimmed.length - 1 || trimmed[i + 1] === " ")) {
      return {
        key: unquote(trimmed.slice(0, i)),
        value: unquote(trimmed.slice(i + 1)),
      };
    }
  }
  return null;
}

const SECTION_TO_SCOPE = {
  dependencies: "runtime",
  devDependencies: "dev",
  optionalDependencies: "optional",
  packageManagerDependencies: "packageManager",
};

export function parsePnpmLockfile(content) {
  const docs = content.split(/^---\s*$/m).filter(d => d.trim().length > 0);
  const allPackages = new Map(); // name@version -> { name, version }
  const snapshotGraph = new Map(); // snapshotKey -> { deps: [{ name, ref, optional }], optionalFlag }
  const importerRoots = []; // { scope, name, ref }

  for (const doc of docs) {
    const lines = doc.split(/\r?\n/);
    let topSection = null;
    let currentImporter = null;
    let importerDepSection = null;
    let currentDepName = null;
    let currentSnapshot = null;
    let snapshotSubSection = null;

    for (const rawLine of lines) {
      if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
      const indent = rawLine.match(/^ */)[0].length;
      const trimmed = rawLine.trim();

      if (indent === 0) {
        const kv = parseKeyValue(trimmed);
        topSection = kv ? kv.key : null;
        currentImporter = null;
        importerDepSection = null;
        currentDepName = null;
        currentSnapshot = null;
        snapshotSubSection = null;
        continue;
      }

      if (topSection === "packages" && indent === 2) {
        const kv = parseKeyValue(trimmed);
        if (kv) {
          const parsed = splitPkgKey(kv.key);
          if (parsed) {
            allPackages.set(`${parsed.name}@${parsed.version}`, parsed);
          }
        }
        continue;
      }

      if (topSection === "importers") {
        if (indent === 2) {
          const kv = parseKeyValue(trimmed);
          currentImporter = kv ? kv.key : null;
          importerDepSection = null;
          currentDepName = null;
        } else if (indent === 4 && currentImporter !== null) {
          const kv = parseKeyValue(trimmed);
          importerDepSection = kv && SECTION_TO_SCOPE[kv.key] ? SECTION_TO_SCOPE[kv.key] : null;
          currentDepName = null;
        } else if (indent === 6 && importerDepSection) {
          const kv = parseKeyValue(trimmed);
          currentDepName = kv ? kv.key : null;
        } else if (indent === 8 && importerDepSection && currentDepName) {
          const kv = parseKeyValue(trimmed);
          if (kv && kv.key === "version" && kv.value) {
            importerRoots.push({
              scope: importerDepSection,
              name: currentDepName,
              ref: kv.value,
            });
          }
        }
        continue;
      }

      if (topSection === "snapshots") {
        if (indent === 2) {
          const kv = parseKeyValue(trimmed);
          if (kv) {
            currentSnapshot = kv.key;
            snapshotSubSection = null;
            if (!snapshotGraph.has(currentSnapshot)) {
              snapshotGraph.set(currentSnapshot, { deps: [], optionalFlag: false });
            }
          }
        } else if (indent === 4 && currentSnapshot) {
          const kv = parseKeyValue(trimmed);
          if (kv) {
            if (kv.key === "dependencies" || kv.key === "optionalDependencies") {
              snapshotSubSection = kv.key;
            } else {
              snapshotSubSection = null;
              if (kv.key === "optional" && kv.value === "true") {
                snapshotGraph.get(currentSnapshot).optionalFlag = true;
              }
            }
          }
        } else if (indent === 6 && currentSnapshot && snapshotSubSection) {
          const kv = parseKeyValue(trimmed);
          if (kv && kv.value) {
            snapshotGraph.get(currentSnapshot).deps.push({
              name: kv.key,
              ref: kv.value,
              optional: snapshotSubSection === "optionalDependencies",
            });
          }
        }
      }
    }
  }

  const pkgScopes = new Map(); // name@version -> { scopes: Set, pathsByScope: Record<string, Set<string>> }
  const ensurePkgEntry = (pkgId) => {
    if (!pkgScopes.has(pkgId)) {
      pkgScopes.set(pkgId, { scopes: new Set(), pathsByScope: {} });
    }
    return pkgScopes.get(pkgId);
  };

  const resolveSnapshotKey = (name, ref) => {
    const candidate = `${name}@${ref}`;
    if (snapshotGraph.has(candidate)) return candidate;
    if (snapshotGraph.has(ref)) return ref;
    const base = `${name}@${stripPeerSuffix(ref)}`;
    return snapshotGraph.has(base) ? base : candidate;
  };

  const recordPath = (pkgId, scope, pathStr) => {
    const entry = ensurePkgEntry(pkgId);
    entry.scopes.add(scope);
    if (!entry.pathsByScope[scope]) entry.pathsByScope[scope] = new Set();
    if (entry.pathsByScope[scope].size < 10) {
      entry.pathsByScope[scope].add(pathStr);
    }
  };

  for (const root of importerRoots) {
    const rootSnap = resolveSnapshotKey(root.name, root.ref);
    const rootPkgId = `${root.name}@${stripPeerSuffix(root.ref)}`;
    if (!allPackages.has(rootPkgId)) {
      allPackages.set(rootPkgId, { name: root.name, version: stripPeerSuffix(root.ref) });
    }
    const queue = [{ snapKey: rootSnap, pkgId: rootPkgId, scope: root.scope, path: `${root.scope}:${rootPkgId}` }];
    const visited = new Set([`${root.scope}|${rootSnap}`]);

    while (queue.length > 0) {
      const current = queue.shift();
      recordPath(current.pkgId, current.scope, current.path);
      const node = snapshotGraph.get(current.snapKey);
      if (!node) continue;
      for (const edge of node.deps) {
        const childSnap = resolveSnapshotKey(edge.name, edge.ref);
        const childPkgId = `${edge.name}@${stripPeerSuffix(edge.ref)}`;
        const childScope = edge.optional && current.scope !== "runtime" ? "optional" : current.scope;
        const visitKey = `${childScope}|${childSnap}`;
        const childPath = `${current.path} > ${childPkgId}`;
        if (!visited.has(visitKey)) {
          visited.add(visitKey);
          queue.push({ snapKey: childSnap, pkgId: childPkgId, scope: childScope, path: childPath });
        } else {
          recordPath(childPkgId, childScope, childPath);
        }
      }
    }
  }

  const packages = [];
  for (const [pkgId, meta] of allPackages.entries()) {
    const tracked = pkgScopes.get(pkgId);
    const scopes = tracked && tracked.scopes.size > 0 ? [...tracked.scopes].sort() : ["unknown"];
    const pathsByScope = {};
    if (tracked) {
      for (const [sc, set] of Object.entries(tracked.pathsByScope)) {
        pathsByScope[sc] = [...set].sort();
      }
    }
    packages.push({
      id: pkgId,
      name: meta.name,
      version: meta.version,
      scopes,
      pathsByScope,
    });
  }

  packages.sort((a, b) => a.id.localeCompare(b.id));
  return { packages };
}

function sleep(ms) {
  return ms <= 0 ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(fetchImpl, url, options, { maxRetries = 3, retryDelayMs = 500 }) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchImpl(url, options);
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt < maxRetries) {
          const retryAfter = Number(res.headers?.get?.("retry-after"));
          const delay = Number.isFinite(retryAfter) && retryAfter >= 0
            ? Math.min(retryAfter * 1000, retryDelayMs * (attempt + 1))
            : retryDelayMs * (attempt + 1);
          await sleep(delay);
          continue;
        }
        throw new Error(`OSV HTTP ${res.status} after ${attempt + 1} attempts`);
      }
      if (!res.ok) {
        throw new Error(`OSV HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && !String(err.message).startsWith("OSV HTTP 4")) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

export function createOsvClient({ fetchImpl = fetch, maxRetries = 3, retryDelayMs = 500 } = {}) {
  return {
    async queryBatch(queries) {
      return fetchJsonWithRetry(
        fetchImpl,
        `${OSV_BASE_URL}/v1/querybatch`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ queries }),
        },
        { maxRetries, retryDelayMs }
      );
    },
    async getVulnerability(id) {
      return fetchJsonWithRetry(
        fetchImpl,
        `${OSV_BASE_URL}/v1/vulns/${encodeURIComponent(id)}`,
        { method: "GET" },
        { maxRetries, retryDelayMs }
      );
    },
  };
}

function normalizeSeverity(detail) {
  const dbSev = detail?.database_specific?.severity;
  if (typeof dbSev === "string" && dbSev.trim()) {
    const s = dbSev.trim().toLowerCase();
    if (s === "medium") return "moderate";
    return s;
  }
  const sevList = Array.isArray(detail?.severity) ? detail.severity : [];
  for (const item of sevList) {
    const scoreNum = Number(item?.score);
    if (Number.isFinite(scoreNum)) {
      if (scoreNum >= 9.0) return "critical";
      if (scoreNum >= 7.0) return "high";
      if (scoreNum >= 4.0) return "moderate";
      return "low";
    }
  }
  return "unknown";
}

function isMaliciousAdvisory(id, aliases, detail) {
  if (id.startsWith("MAL-")) return true;
  if (aliases.some(a => a.startsWith("MAL-"))) return true;
  return Boolean(detail?.database_specific?.malicious_package);
}

function matchException(advisory, exceptions, now) {
  const ids = new Set([advisory.id, ...advisory.aliases]);
  const matching = exceptions.filter(ex => {
    if (!ex || !ids.has(ex.id)) return false;
    if (!ex.owner || !ex.mitigation || !ex.expiresAt) return false;
    if (ex.package) {
      const target = ex.version ? `${ex.package}@${ex.version}` : null;
      return advisory.packages.every(p => (target ? p === target : p.startsWith(`${ex.package}@`)));
    }
    if (Array.isArray(ex.packages) && ex.packages.length > 0) {
      return advisory.packages.every(p => ex.packages.includes(p));
    }
    return false;
  });

  if (matching.length === 0) return { state: "none", exception: null };

  for (const ex of matching) {
    const expiry = new Date(ex.expiresAt.includes("T") ? ex.expiresAt : `${ex.expiresAt}T23:59:59Z`);
    if (!Number.isNaN(expiry.getTime()) && expiry >= now) {
      return { state: "active", exception: ex };
    }
  }
  return { state: "expired", exception: matching[0] };
}

export async function auditLockfile({
  lockfileContent,
  exceptions = [],
  osvClient,
  fetchImpl = fetch,
  maxRetries = 3,
  retryDelayMs = 500,
  now = new Date(),
  commitSha = null,
}) {
  const client = osvClient ?? createOsvClient({ fetchImpl, maxRetries, retryDelayMs });
  const lockfileSha256 = createHash("sha256").update(lockfileContent).digest("hex");
  const { packages } = parsePnpmLockfile(lockfileContent);
  const blockReasons = [];
  let complete = true;

  // Map: pkgId -> Set<advisoryId>
  const pkgToAdvisories = new Map();

  try {
    let pending = packages.map(pkg => ({
      pkg,
      query: { package: { name: pkg.name, ecosystem: "npm" }, version: pkg.version },
    }));

    let page = 0;
    while (pending.length > 0) {
      page++;
      if (page > MAX_PAGES) {
        throw new Error(`OSV pagination exceeded ${MAX_PAGES} pages`);
      }
      const nextPending = [];

      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const chunk = pending.slice(i, i + BATCH_SIZE);
        const res = await client.queryBatch(chunk.map(item => item.query));
        if (!res || !Array.isArray(res.results) || res.results.length !== chunk.length) {
          throw new Error(
            `OSV querybatch short/invalid response: expected ${chunk.length}, got ${res?.results?.length ?? "none"}`
          );
        }

        for (let j = 0; j < chunk.length; j++) {
          const item = chunk[j];
          const entry = res.results[j] ?? {};
          const vulns = Array.isArray(entry.vulns) ? entry.vulns : [];
          for (const v of vulns) {
            if (!v?.id) continue;
            if (!pkgToAdvisories.has(item.pkg.id)) pkgToAdvisories.set(item.pkg.id, new Set());
            pkgToAdvisories.get(item.pkg.id).add(v.id);
          }
          if (entry.next_page_token) {
            nextPending.push({
              pkg: item.pkg,
              query: { ...item.query, page_token: entry.next_page_token },
            });
          }
        }
      }
      pending = nextPending;
    }
  } catch (err) {
    complete = false;
    blockReasons.push(`OSV query incomplete: ${err.message}`);
  }

  // Build unique advisories and fetch full details
  const advisoryMap = new Map(); // advisoryId -> { id, pkgIds: Set }
  let associations = 0;
  for (const [pkgId, ids] of pkgToAdvisories.entries()) {
    for (const id of ids) {
      associations++;
      if (!advisoryMap.has(id)) advisoryMap.set(id, { id, pkgIds: new Set() });
      advisoryMap.get(id).pkgIds.add(pkgId);
    }
  }

  const pkgById = new Map(packages.map(p => [p.id, p]));
  const uniqueAdvisories = [];
  const pathsByScope = { runtime: [], dev: [], optional: [], packageManager: [], unknown: [] };

  for (const [id, entry] of advisoryMap.entries()) {
    let detail = null;
    try {
      detail = await client.getVulnerability(id);
    } catch (err) {
      complete = false;
      blockReasons.push(`OSV detail incomplete for ${id}: ${err.message}`);
    }

    const aliases = Array.isArray(detail?.aliases) ? [...new Set(detail.aliases)].sort() : [];
    const severity = detail ? normalizeSeverity(detail) : "unknown";
    const malicious = isMaliciousAdvisory(id, aliases, detail);
    const affectedPackages = [...entry.pkgIds].sort();
    const advPaths = {};
    const advScopes = new Set();

    for (const pkgId of affectedPackages) {
      const pkg = pkgById.get(pkgId);
      if (!pkg) continue;
      for (const sc of pkg.scopes) advScopes.add(sc);
      for (const [sc, list] of Object.entries(pkg.pathsByScope)) {
        if (!advPaths[sc]) advPaths[sc] = [];
        advPaths[sc].push(...list);
        if (pathsByScope[sc]) pathsByScope[sc].push(...list);
      }
    }

    const advisory = {
      id,
      aliases,
      severity,
      malicious,
      summary: detail?.summary ?? "",
      packages: affectedPackages,
      scopes: [...advScopes].sort(),
      pathsByScope: advPaths,
      status: "open",
      exception: null,
    };

    if (malicious) {
      advisory.status = "blocked_malicious";
      blockReasons.push(`Malicious advisory ${id} (${affectedPackages.join(", ")})`);
    } else if (severity === "high" || severity === "critical") {
      advisory.status = "blocked_severity";
      blockReasons.push(`${severity.toUpperCase()} advisory ${id} (${affectedPackages.join(", ")})`);
    } else {
      const exMatch = matchException(advisory, exceptions, now);
      if (exMatch.state === "active") {
        advisory.status = "accepted";
        advisory.exception = exMatch.exception;
      } else if (exMatch.state === "expired") {
        advisory.status = "expired_exception";
        advisory.exception = exMatch.exception;
        blockReasons.push(`Expired exception for ${id} (expired ${exMatch.exception.expiresAt})`);
      } else {
        advisory.status = "open";
        blockReasons.push(`Unaccepted ${severity} advisory ${id} (${affectedPackages.join(", ")})`);
      }
    }

    uniqueAdvisories.push(advisory);
  }

  uniqueAdvisories.sort((a, b) => a.id.localeCompare(b.id));
  for (const sc of Object.keys(pathsByScope)) {
    pathsByScope[sc] = [...new Set(pathsByScope[sc])].sort();
  }

  return {
    commitSha,
    lockfileSha256,
    scannedAt: now.toISOString(),
    sources: ["osv"],
    queriedPairs: packages.length,
    associations,
    uniqueAdvisories,
    pathsByScope,
    complete,
    blocked: !complete || blockReasons.length > 0,
    blockReasons,
  };
}

function getCommitSha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function runCli() {
  const args = process.argv.slice(2);
  let lockfilePath = "pnpm-lock.yaml";
  let exceptionsPath = "docs/migration/excepciones-seguridad.json";
  let outPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lockfile" && args[i + 1]) lockfilePath = args[++i];
    else if (args[i] === "--exceptions" && args[i + 1]) exceptionsPath = args[++i];
    else if (args[i] === "--out" && args[i + 1]) outPath = args[++i];
  }

  const lockfileContent = readFileSync(lockfilePath, "utf8");
  let exceptions = [];
  if (exceptionsPath && existsSync(exceptionsPath)) {
    const parsed = JSON.parse(readFileSync(exceptionsPath, "utf8"));
    exceptions = Array.isArray(parsed) ? parsed : parsed.exceptions ?? [];
  }

  const report = await auditLockfile({
    lockfileContent,
    exceptions,
    commitSha: process.env.GITHUB_SHA || getCommitSha(),
  });

  const json = JSON.stringify(report, null, 2);
  if (outPath) {
    writeFileSync(outPath, `${json}\n`, "utf8");
  }
  console.log(json);

  if (!report.complete || report.blocked) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
