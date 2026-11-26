import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  checkPublishIdempotency,
  evaluatePromotionDossier,
  validateReleaseCandidate,
  verifyManifestDigest,
  verifyPublishedPackage,
} from "./release-gate.mjs";

describe("validateReleaseCandidate", () => {
  it("accepts matching stable tag, version, channel and authorized branch", () => {
    const res = validateReleaseCandidate({
      version: "1.0.0",
      tag: "v1.0.0",
      isPrerelease: false,
      isAncestorOfMain: true,
    });
    assert.equal(res.channel, "latest");
  });

  it("accepts matching prerelease tag, version and channel", () => {
    const res = validateReleaseCandidate({
      version: "0.5.0-beta.6",
      tag: "v0.5.0-beta.6",
      isPrerelease: true,
      isAncestorOfMain: true,
    });
    assert.equal(res.channel, "next");
  });

  it("rejects mismatched tag", () => {
    assert.throws(
      () => validateReleaseCandidate({ version: "1.0.0", tag: "v1.0.1", isPrerelease: false, isAncestorOfMain: true }),
      /tag/i
    );
  });

  it("rejects commit not on authorized branch", () => {
    assert.throws(
      () => validateReleaseCandidate({ version: "1.0.0", tag: "v1.0.0", isPrerelease: false, isAncestorOfMain: false }),
      /branch|main|ancestor/i
    );
  });

  it("rejects stable version marked as prerelease (or vice versa)", () => {
    assert.throws(
      () => validateReleaseCandidate({ version: "1.0.0", tag: "v1.0.0", isPrerelease: true, isAncestorOfMain: true }),
      /prerelease|channel/i
    );
    assert.throws(
      () => validateReleaseCandidate({ version: "1.0.0-beta.1", tag: "v1.0.0-beta.1", isPrerelease: false, isAncestorOfMain: true }),
      /prerelease|channel/i
    );
  });
});

describe("verifyManifestDigest", () => {
  const bytes = Buffer.from("tarball-bytes");
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

  it("passes when sha, tag and tarball digest match", () => {
    verifyManifestDigest({
      manifest: { gitSha: "abc123", tag: "v1.0.0", integrity },
      expectedSha: "abc123",
      expectedTag: "v1.0.0",
      tarballBytes: bytes,
    });
  });

  it("rejects valid tag with wrong SHA", () => {
    assert.throws(
      () => verifyManifestDigest({
        manifest: { gitSha: "abc123", tag: "v1.0.0", integrity },
        expectedSha: "def456",
        expectedTag: "v1.0.0",
        tarballBytes: bytes,
      }),
      /sha/i
    );
  });

  it("rejects altered tarball digest", () => {
    assert.throws(
      () => verifyManifestDigest({
        manifest: { gitSha: "abc123", tag: "v1.0.0", integrity },
        expectedSha: "abc123",
        expectedTag: "v1.0.0",
        tarballBytes: Buffer.from("tampered-bytes"),
      }),
      /digest|integrity/i
    );
  });
});

describe("checkPublishIdempotency", () => {
  it("returns publish when version does not exist yet (404)", async () => {
    const res = await checkPublishIdempotency({
      pkgName: "@teams4soft/teams4soft-ui",
      version: "1.0.0",
      integrity: "sha512-abc",
      fetchImpl: async () => ({ status: 404, ok: false }),
    });
    assert.equal(res.action, "publish");
  });

  it("returns skip_already_published when exact version exists with identical integrity and provenance", async () => {
    const res = await checkPublishIdempotency({
      pkgName: "@teams4soft/teams4soft-ui",
      version: "1.0.0",
      integrity: "sha512-abc",
      fetchImpl: async () => ({
        status: 200,
        ok: true,
        json: async () => ({
          dist: {
            integrity: "sha512-abc",
            attestations: { provenance: { predicateType: "https://slsa.dev/provenance/v1" } },
          },
        }),
      }),
    });
    assert.equal(res.action, "skip_already_published");
  });

  it("throws when version exists with identical integrity but missing provenance attestation", async () => {
    await assert.rejects(
      () => checkPublishIdempotency({
        pkgName: "@teams4soft/teams4soft-ui",
        version: "1.0.0",
        integrity: "sha512-abc",
        fetchImpl: async () => ({
          status: 200,
          ok: true,
          json: async () => ({ dist: { integrity: "sha512-abc" } }),
        }),
      }),
      /provenance|attestation/i
    );
  });

  it("throws when version already exists with different integrity", async () => {
    await assert.rejects(
      () => checkPublishIdempotency({
        pkgName: "@teams4soft/teams4soft-ui",
        version: "1.0.0",
        integrity: "sha512-abc",
        fetchImpl: async () => ({
          status: 200,
          ok: true,
          json: async () => ({ dist: { integrity: "sha512-DIFFERENT" } }),
        }),
      }),
      /integrity|digest|mismatch/i
    );
  });
});

describe("evaluatePromotionDossier (4 trial dossiers)", () => {
  const stableIntegrity = "sha512-STABLECANDIDATE==";
  const makeCompleteDossier = () => ({
    candidate: { version: "0.5.0", tag: "v0.5.0", gitSha: "4523228", integrity: stableIntegrity },
    pilotEvidences: [
      {
        module: "issuance",
        tarballIntegrity: stableIntegrity,
        testedFrontendSha: "132a803",
        approvedFrontendSha: "132a803",
      },
      {
        module: "claims",
        tarballIntegrity: stableIntegrity,
        testedFrontendSha: "ff0cec0",
        approvedFrontendSha: "ff0cec0",
      },
    ],
    exceptions: [{ id: "GHSA-g7r4-m6w7-qqqr", owner: "Ps3udoDev", expiresAt: "2027-01-25" }],
    checks: {
      react18: { passed: true, tarballIntegrity: stableIntegrity },
      react19: { passed: true, tarballIntegrity: stableIntegrity },
      node22: { passed: true, tarballIntegrity: stableIntegrity },
      node24: { passed: true, tarballIntegrity: stableIntegrity },
      node26: { passed: true, tarballIntegrity: stableIntegrity },
      esmCjsCss: { passed: true, tarballIntegrity: stableIntegrity },
      a11y: { passed: true, tarballIntegrity: stableIntegrity },
      performance: { passed: true, tarballIntegrity: stableIntegrity },
    },
    approvals: { platform: "Ps3udoDev", frontend: "FrontendLead", qa: "QALead", maintainer: "Ps3udoDev" },
    evaluatedAt: "2026-11-26",
  });

  it("1. approves a complete dossier where all evidence matches candidate digest and SHAs", () => {
    const res = evaluatePromotionDossier(makeCompleteDossier());
    assert.equal(res.approved, true);
    assert.deepEqual(res.reasons, []);
  });

  it("2. rejects a dossier reusing a beta digest or beta version", () => {
    const dossier = makeCompleteDossier();
    dossier.pilotEvidences[0].tarballIntegrity = "sha512-BETA5DIGEST==";
    const res = evaluatePromotionDossier(dossier);
    assert.equal(res.approved, false);
    assert.ok(res.reasons.some((r) => /digest/i.test(r)));
  });

  it("3. rejects a dossier with a frontend SHA different from the tested pilot commit", () => {
    const dossier = makeCompleteDossier();
    dossier.pilotEvidences[1].testedFrontendSha = "deadbeef";
    const res = evaluatePromotionDossier(dossier);
    assert.equal(res.approved, false);
    assert.ok(res.reasons.some((r) => /frontend SHA mismatch/i.test(r)));
  });

  it("4. rejects a dossier with an expired security exception", () => {
    const dossier = makeCompleteDossier();
    dossier.exceptions[0].expiresAt = "2026-11-01";
    const res = evaluatePromotionDossier(dossier);
    assert.equal(res.approved, false);
    assert.ok(res.reasons.some((r) => /expired/i.test(r)));
  });
});

describe("verifyPublishedPackage", () => {
  it("passes when channel, integrity and SLSA provenance match", () => {
    const res = verifyPublishedPackage({
      expectedVersion: "0.5.0",
      expectedChannel: "latest",
      expectedIntegrity: "sha512-OK==",
      distTags: { latest: "0.5.0", next: "0.5.0-beta.5" },
      versionMetadata: {
        dist: { integrity: "sha512-OK==", attestations: { provenance: { predicateType: "https://slsa.dev/provenance/v1" } } },
      },
    });
    assert.equal(res.verified, true);
  });

  it("rejects unexpected dist-tag channel target", () => {
    assert.throws(
      () =>
        verifyPublishedPackage({
          expectedVersion: "0.5.0",
          expectedChannel: "latest",
          expectedIntegrity: "sha512-OK==",
          distTags: { latest: "0.4.0" },
          versionMetadata: {
            dist: { integrity: "sha512-OK==", attestations: { provenance: { predicateType: "https://slsa.dev/provenance/v1" } } },
          },
        }),
      /Dist-tag/i
    );
  });
});
