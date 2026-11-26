import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { checkPublishIdempotency, validateReleaseCandidate, verifyManifestDigest } from "./release-gate.mjs";

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
