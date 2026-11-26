import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditLockfile, parsePnpmLockfile } from "./audit-lockfile.mjs";

const MULTI_DOC_LOCKFILE = `---
lockfileVersion: '9.0'

importers:

  .:
    configDependencies: {}
    packageManagerDependencies:
      pnpm:
        specifier: 12.16.1
        version: 12.16.1

packages:

  pnpm@12.16.1:
    resolution: {integrity: sha512-aaa}

snapshots:

  pnpm@12.16.1: {}

---
lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      shared-lib:
        specifier: 1.0.0
        version: 1.0.0
    devDependencies:
      shared-lib:
        specifier: 1.0.0
        version: 1.0.0
      vitest:
        specifier: 4.1.10
        version: 4.1.10(@vitest/mocker@4.1.10)
    optionalDependencies:
      opt-pkg:
        specifier: 2.0.0
        version: 2.0.0

packages:

  shared-lib@1.0.0:
    resolution: {integrity: sha512-bbb}

  vitest@4.1.10:
    resolution: {integrity: sha512-ccc}

  '@vitest/mocker@4.1.10':
    resolution: {integrity: sha512-ddd}

  opt-pkg@2.0.0:
    resolution: {integrity: sha512-eee}

  opt-leaf@0.1.0:
    resolution: {integrity: sha512-fff}

snapshots:

  shared-lib@1.0.0: {}

  vitest@4.1.10(@vitest/mocker@4.1.10):
    dependencies:
      '@vitest/mocker': 4.1.10
      shared-lib: 1.0.0
    optionalDependencies:
      opt-leaf: 0.1.0

  '@vitest/mocker@4.1.10': {}

  opt-pkg@2.0.0:
    optional: true

  opt-leaf@0.1.0:
    optional: true
`;

function makeOsvClient({ batchHandler, vulnDetails = {} }) {
  return {
    async queryBatch(queries) {
      return batchHandler(queries);
    },
    async getVulnerability(id) {
      const detail = vulnDetails[id];
      if (!detail) throw new Error(`Missing vuln detail for ${id}`);
      return detail;
    },
  };
}

describe("parsePnpmLockfile", () => {
  it("parses multi-document YAML, deduplicates repeated versions, tracks optional deps and never downgrades runtime to dev", () => {
    const parsed = parsePnpmLockfile(MULTI_DOC_LOCKFILE);
    const byKey = new Map(parsed.packages.map(p => [`${p.name}@${p.version}`, p]));

    assert.equal(parsed.packages.length, 6);
    assert.ok(byKey.has("pnpm@12.16.1"));
    assert.ok(byKey.has("shared-lib@1.0.0"));
    assert.ok(byKey.has("vitest@4.1.10"));
    assert.ok(byKey.has("@vitest/mocker@4.1.10"));
    assert.ok(byKey.has("opt-pkg@2.0.0"));
    assert.ok(byKey.has("opt-leaf@0.1.0"));

    // shared-lib is in both dependencies (runtime) and devDependencies -> must include runtime
    const shared = byKey.get("shared-lib@1.0.0");
    assert.ok(shared.scopes.includes("runtime"), `expected runtime scope, got ${shared.scopes}`);
    assert.ok(shared.pathsByScope.runtime.some(p => p.includes("shared-lib@1.0.0")));

    // vitest and @vitest/mocker are dev-only
    const mocker = byKey.get("@vitest/mocker@4.1.10");
    assert.deepEqual(mocker.scopes, ["dev"]);
    assert.ok(mocker.pathsByScope.dev.some(p => p.includes("vitest@4.1.10") && p.includes("@vitest/mocker@4.1.10")));

    // optional deps are tracked
    const optLeaf = byKey.get("opt-leaf@0.1.0");
    assert.ok(optLeaf.scopes.includes("optional") || optLeaf.scopes.includes("dev"));
  });
});

describe("auditLockfile", () => {
  it("counts one advisory affecting two packages once without losing either path", async () => {
    const client = makeOsvClient({
      batchHandler: (queries) => ({
        results: queries.map(q => {
          if (q.package.name === "vitest" || q.package.name === "@vitest/mocker") {
            return { vulns: [{ id: "GHSA-82fw-gwwq-j7x9" }] };
          }
          return {};
        }),
      }),
      vulnDetails: {
        "GHSA-82fw-gwwq-j7x9": {
          id: "GHSA-82fw-gwwq-j7x9",
          aliases: ["CVE-2026-0001"],
          database_specific: { severity: "MODERATE" },
        },
      },
    });

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2026-11-26T00:00:00Z"),
      commitSha: "abc1234",
    });

    assert.equal(report.complete, true);
    assert.equal(report.queriedPairs, 6);
    assert.equal(report.associations, 2);
    assert.equal(report.uniqueAdvisories.length, 1);
    assert.equal(report.uniqueAdvisories[0].id, "GHSA-82fw-gwwq-j7x9");
    assert.deepEqual(report.uniqueAdvisories[0].aliases, ["CVE-2026-0001"]);
    assert.equal(report.uniqueAdvisories[0].severity, "moderate");
    assert.deepEqual(
      report.uniqueAdvisories[0].packages.sort(),
      ["@vitest/mocker@4.1.10", "vitest@4.1.10"]
    );
    assert.ok(report.uniqueAdvisories[0].pathsByScope.dev.length >= 2);
    // Unaccepted moderate advisory blocks until resolved or accepted with valid exception
    assert.equal(report.blocked, true);
  });

  it("handles OSV pagination (next_page_token) and collects all advisories", async () => {
    let calls = 0;
    const client = makeOsvClient({
      batchHandler: (queries) => {
        calls++;
        if (calls === 1) {
          return {
            results: queries.map(q =>
              q.package.name === "vitest"
                ? { vulns: [{ id: "GHSA-page-1" }], next_page_token: "tok-2" }
                : {}
            ),
          };
        }
        assert.equal(queries.length, 1);
        assert.equal(queries[0].page_token, "tok-2");
        return {
          results: [{ vulns: [{ id: "GHSA-page-2" }] }],
        };
      },
      vulnDetails: {
        "GHSA-page-1": { id: "GHSA-page-1", aliases: [], database_specific: { severity: "LOW" } },
        "GHSA-page-2": { id: "GHSA-page-2", aliases: [], database_specific: { severity: "LOW" } },
      },
    });

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2026-11-26T00:00:00Z"),
    });

    assert.equal(calls, 2);
    assert.equal(report.complete, true);
    assert.deepEqual(report.uniqueAdvisories.map(a => a.id).sort(), ["GHSA-page-1", "GHSA-page-2"]);
  });

  it("retries HTTP 429 with a bounded limit and succeeds when OSV recovers", async () => {
    let attempts = 0;
    const fetchMock = async (url) => {
      if (url.endsWith("/v1/querybatch")) {
        attempts++;
        if (attempts < 3) {
          return { ok: false, status: 429, headers: new Headers({ "retry-after": "0" }), json: async () => ({}) };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ results: Array.from({ length: 6 }, () => ({})) }),
        };
      }
      throw new Error(`Unexpected url ${url}`);
    };

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      fetchImpl: fetchMock,
      retryDelayMs: 0,
      maxRetries: 3,
      now: new Date("2026-11-26T00:00:00Z"),
    });

    assert.equal(attempts, 3);
    assert.equal(report.complete, true);
    assert.equal(report.blocked, false);
  });

  it("marks report incomplete and blocks on OSV outage", async () => {
    const fetchMock = async () => {
      throw new Error("ECONNRESET");
    };

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      fetchImpl: fetchMock,
      retryDelayMs: 0,
      maxRetries: 1,
      now: new Date("2026-11-26T00:00:00Z"),
    });

    assert.equal(report.complete, false);
    assert.equal(report.blocked, true);
    assert.ok(report.blockReasons.some(r => /incomplet|osv|error/i.test(r)));
  });

  it("marks report incomplete and blocks on short querybatch response", async () => {
    const client = makeOsvClient({
      batchHandler: () => ({ results: [{}] }), // only 1 result for 6 queries
    });

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2026-11-26T00:00:00Z"),
    });

    assert.equal(report.complete, false);
    assert.equal(report.blocked, true);
  });

  it("allows moderate advisory with active exception (kept visible) but blocks when exception is expired", async () => {
    const client = makeOsvClient({
      batchHandler: (queries) => ({
        results: queries.map(q =>
          q.package.name === "vitest" ? { vulns: [{ id: "GHSA-mod-1" }] } : {}
        ),
      }),
      vulnDetails: {
        "GHSA-mod-1": { id: "GHSA-mod-1", aliases: [], database_specific: { severity: "MODERATE" } },
      },
    });

    const activeReport = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2026-11-26T00:00:00Z"),
      exceptions: [
        {
          id: "GHSA-mod-1",
          package: "vitest",
          version: "4.1.10",
          scope: "dev",
          mitigation: "Dev test runner only; not shipped in dist tarball.",
          owner: "Ps3udoDev",
          expiresAt: "2026-12-31",
        },
      ],
    });

    assert.equal(activeReport.complete, true);
    assert.equal(activeReport.blocked, false);
    assert.equal(activeReport.uniqueAdvisories.length, 1);
    assert.equal(activeReport.uniqueAdvisories[0].status, "accepted");

    const expiredReport = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2027-01-01T00:00:00Z"),
      exceptions: [
        {
          id: "GHSA-mod-1",
          package: "vitest",
          version: "4.1.10",
          scope: "dev",
          mitigation: "Dev test runner only.",
          owner: "Ps3udoDev",
          expiresAt: "2026-12-31",
        },
      ],
    });

    assert.equal(expiredReport.complete, true);
    assert.equal(expiredReport.blocked, true);
    assert.equal(expiredReport.uniqueAdvisories[0].status, "expired_exception");
  });

  it("blocks high/critical and malicious advisories even when an active exception exists", async () => {
    const client = makeOsvClient({
      batchHandler: (queries) => ({
        results: queries.map(q => {
          if (q.package.name === "vitest") return { vulns: [{ id: "GHSA-high-1" }] };
          if (q.package.name === "shared-lib") return { vulns: [{ id: "MAL-2026-9999" }] };
          return {};
        }),
      }),
      vulnDetails: {
        "GHSA-high-1": { id: "GHSA-high-1", aliases: [], database_specific: { severity: "HIGH" } },
        "MAL-2026-9999": { id: "MAL-2026-9999", aliases: [], summary: "Malicious package" },
      },
    });

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2026-11-26T00:00:00Z"),
      exceptions: [
        {
          id: "GHSA-high-1",
          package: "vitest",
          version: "4.1.10",
          scope: "dev",
          mitigation: "Attempted waiver",
          owner: "Ps3udoDev",
          expiresAt: "2026-12-31",
        },
        {
          id: "MAL-2026-9999",
          package: "shared-lib",
          version: "1.0.0",
          scope: "runtime",
          mitigation: "Attempted waiver",
          owner: "Ps3udoDev",
          expiresAt: "2026-12-31",
        },
      ],
    });

    assert.equal(report.complete, true);
    assert.equal(report.blocked, true);
    const high = report.uniqueAdvisories.find(a => a.id === "GHSA-high-1");
    const mal = report.uniqueAdvisories.find(a => a.id === "MAL-2026-9999");
    assert.equal(high.status, "blocked_severity");
    assert.equal(mal.malicious, true);
    assert.equal(mal.status, "blocked_malicious");
  });

  it("rejects dev exception when advisory reaches runtime scope or lacks exact version/scope", async () => {
    const client = makeOsvClient({
      batchHandler: (queries) => ({
        results: queries.map(q =>
          q.package.name === "shared-lib" ? { vulns: [{ id: "GHSA-shared-1" }] } : {}
        ),
      }),
      vulnDetails: {
        "GHSA-shared-1": { id: "GHSA-shared-1", aliases: [], database_specific: { severity: "MODERATE" } },
      },
    });

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2026-11-26T00:00:00Z"),
      exceptions: [
        {
          id: "GHSA-shared-1",
          package: "shared-lib",
          version: "1.0.0",
          scope: "dev",
          mitigation: "Claims dev-only, but shared-lib is also in runtime",
          owner: "Ps3udoDev",
          expiresAt: "2026-12-31",
        },
      ],
    });

    assert.equal(report.blocked, true);
    assert.equal(report.uniqueAdvisories[0].status, "open");
  });

  it("blocks unknown severity even when an active exception exists", async () => {
    const client = makeOsvClient({
      batchHandler: (queries) => ({
        results: queries.map(q =>
          q.package.name === "vitest" ? { vulns: [{ id: "CVE-2026-9999" }] } : {}
        ),
      }),
      vulnDetails: {
        "CVE-2026-9999": {
          id: "CVE-2026-9999",
          aliases: [],
          severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" }],
        },
      },
    });

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2026-11-26T00:00:00Z"),
      exceptions: [
        {
          id: "CVE-2026-9999",
          package: "vitest",
          version: "4.1.10",
          scope: "dev",
          mitigation: "Attempted waiver on unknown severity",
          owner: "Ps3udoDev",
          expiresAt: "2026-12-31",
        },
      ],
    });

    assert.equal(report.blocked, true);
    assert.equal(report.uniqueAdvisories[0].status, "blocked_severity");
  });

  it("marks report incomplete when getVulnerability returns malformed object or throws even with exception", async () => {
    const client = makeOsvClient({
      batchHandler: (queries) => ({
        results: queries.map(q =>
          q.package.name === "vitest" ? { vulns: [{ id: "GHSA-malformed-1" }] } : {}
        ),
      }),
      vulnDetails: {
        "GHSA-malformed-1": {},
      },
    });

    const report = await auditLockfile({
      lockfileContent: MULTI_DOC_LOCKFILE,
      osvClient: client,
      now: new Date("2026-11-26T00:00:00Z"),
      exceptions: [
        {
          id: "GHSA-malformed-1",
          package: "vitest",
          version: "4.1.10",
          scope: "dev",
          mitigation: "Should not bypass incomplete detail",
          owner: "Ps3udoDev",
          expiresAt: "2026-12-31",
        },
      ],
    });

    assert.equal(report.complete, false);
    assert.equal(report.blocked, true);
    assert.equal(report.uniqueAdvisories[0].status, "incomplete");
  });
});
