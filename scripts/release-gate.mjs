import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function validateReleaseCandidate({ version, tag, isPrerelease, isAncestorOfMain }) {
  if (!version || typeof version !== "string") {
    throw new Error("Missing package version");
  }
  const expectedTag = `v${version}`;
  if (tag !== expectedTag) {
    throw new Error(`Tag mismatch: expected ${expectedTag}, got ${tag}`);
  }
  if (!isAncestorOfMain) {
    throw new Error("Candidate commit is not an ancestor of authorized branch main");
  }
  const hasPrereleaseSuffix = version.includes("-");
  if (hasPrereleaseSuffix !== Boolean(isPrerelease)) {
    throw new Error(
      `Prerelease/channel mismatch: version ${version} (prerelease=${hasPrereleaseSuffix}) vs release flag (${isPrerelease})`
    );
  }
  return {
    channel: hasPrereleaseSuffix ? "next" : "latest",
  };
}

export function computeTarballDigest(tarballBytes) {
  const hash = createHash("sha512").update(tarballBytes);
  const sha512Hex = createHash("sha512").update(tarballBytes).digest("hex");
  return {
    integrity: `sha512-${hash.digest("base64")}`,
    sha512Hex,
  };
}

export function verifyManifestDigest({ manifest, expectedSha, expectedTag, tarballBytes }) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Invalid release manifest");
  }
  if (manifest.gitSha !== expectedSha) {
    throw new Error(`SHA mismatch: manifest has ${manifest.gitSha}, expected ${expectedSha}`);
  }
  if (manifest.tag !== expectedTag) {
    throw new Error(`Tag mismatch: manifest has ${manifest.tag}, expected ${expectedTag}`);
  }
  const { integrity } = computeTarballDigest(tarballBytes);
  if (manifest.integrity !== integrity) {
    throw new Error(`Tarball digest mismatch: manifest has ${manifest.integrity}, computed ${integrity}`);
  }
}

export async function checkPublishIdempotency({
  pkgName,
  version,
  integrity,
  registryUrl = "https://registry.npmjs.org",
  fetchImpl = fetch,
}) {
  const url = `${registryUrl.replace(/\/$/, "")}/${encodeURIComponent(pkgName)}/${encodeURIComponent(version)}`;
  const res = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (res.status === 404) {
    return { action: "publish" };
  }
  if (!res.ok) {
    throw new Error(`Registry lookup failed with HTTP ${res.status}`);
  }
  const data = await res.json();
  const existingIntegrity = data?.dist?.integrity;
  if (existingIntegrity !== integrity) {
    throw new Error(
      `Version ${pkgName}@${version} already exists with different integrity (${existingIntegrity} !== ${integrity})`
    );
  }
  if (!data?.dist?.attestations?.provenance) {
    throw new Error(
      `Version ${pkgName}@${version} already exists with matching integrity but missing provenance attestation`
    );
  }
  return { action: "skip_already_published", integrity: existingIntegrity };
}

export function evaluatePromotionDossier({
  candidate,
  pilotEvidences = [],
  exceptions = [],
  checks = {},
  approvals = {},
  evaluatedAt = new Date().toISOString().slice(0, 10),
}) {
  const reasons = [];
  if (!candidate?.version || candidate.version.includes("-")) {
    reasons.push(`Candidate version must be stable (got ${candidate?.version ?? "missing"})`);
  }
  if (candidate?.tag !== `v${candidate?.version}`) {
    reasons.push(`Candidate tag mismatch: expected v${candidate?.version}, got ${candidate?.tag}`);
  }
  if (!candidate?.gitSha || !candidate?.integrity?.startsWith("sha512-")) {
    reasons.push("Candidate must include gitSha and sha512 tarball integrity");
  }

  const requiredChecks = ["react18", "react19", "node22", "node24", "node26", "esmCjsCss", "a11y", "performance"];
  for (const key of requiredChecks) {
    const entry = checks[key];
    if (!entry || entry.passed !== true) {
      reasons.push(`Check '${key}' is missing or failed`);
    } else if (entry.tarballIntegrity !== candidate?.integrity) {
      reasons.push(`Check '${key}' tested a different artifact digest (${entry.tarballIntegrity ?? "none"})`);
    }
  }

  if (pilotEvidences.length === 0) {
    reasons.push("At least one frontend pilot evidence entry is required");
  }
  for (const pilot of pilotEvidences) {
    if (pilot.tarballIntegrity !== candidate?.integrity) {
      reasons.push(`Pilot '${pilot.module}' tested a different tarball digest (${pilot.tarballIntegrity ?? "none"})`);
    }
    if (!pilot.testedFrontendSha || pilot.testedFrontendSha !== pilot.approvedFrontendSha) {
      reasons.push(
        `Pilot '${pilot.module}' frontend SHA mismatch (${pilot.testedFrontendSha ?? "none"} !== ${pilot.approvedFrontendSha ?? "none"})`
      );
    }
  }

  for (const exc of exceptions) {
    if (!exc.expiresAt || exc.expiresAt < evaluatedAt) {
      reasons.push(`Security exception '${exc.id}' expired on ${exc.expiresAt ?? "unknown"}`);
    }
  }

  for (const role of ["platform", "frontend", "qa", "maintainer"]) {
    if (!approvals[role]) {
      reasons.push(`Missing approval from '${role}'`);
    }
  }

  return { approved: reasons.length === 0, reasons };
}

export function verifyPublishedPackage({
  expectedVersion,
  expectedChannel,
  expectedIntegrity,
  distTags,
  versionMetadata,
}) {
  if (!distTags || distTags[expectedChannel] !== expectedVersion) {
    throw new Error(
      `Dist-tag '${expectedChannel}' points to ${distTags?.[expectedChannel] ?? "none"}, expected ${expectedVersion}`
    );
  }
  const actualIntegrity = versionMetadata?.dist?.integrity;
  if (actualIntegrity !== expectedIntegrity) {
    throw new Error(`Published integrity mismatch: ${actualIntegrity} !== ${expectedIntegrity}`);
  }
  if (!versionMetadata?.dist?.attestations?.provenance) {
    throw new Error(`Published package ${expectedVersion} is missing SLSA provenance attestation`);
  }
  return { verified: true, version: expectedVersion, channel: expectedChannel, integrity: actualIntegrity };
}

function gitOutput(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function runCli() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "validate") {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || "";
    const isPrerelease = process.env.IS_PRERELEASE === "true";
    const headSha = gitOutput(["rev-parse", "HEAD"]);
    const sha = process.env.GITHUB_SHA || headSha;
    if (headSha !== sha) {
      throw new Error(`Checkout HEAD (${headSha}) does not match expected SHA (${sha})`);
    }
    if (tag) {
      const tagCommit = gitOutput(["rev-parse", `refs/tags/${tag}^{commit}`]);
      if (tagCommit !== sha) {
        throw new Error(`Tag ${tag} points to ${tagCommit}, expected ${sha}`);
      }
    }
    let isAncestorOfMain = false;
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", sha, "origin/main"], { stdio: "ignore" });
      isAncestorOfMain = true;
    } catch {
      isAncestorOfMain = false;
    }
    const { channel } = validateReleaseCandidate({
      version: pkg.version,
      tag,
      isPrerelease,
      isAncestorOfMain,
    });
    console.log(JSON.stringify({ package: pkg.name, version: pkg.version, tag, sha, channel }));
    return;
  }

  if (command === "manifest") {
    const artifactDir = rest[0] || "release-artifact";
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || `v${pkg.version}`;
    const channel = pkg.version.includes("-") ? "next" : "latest";
    const gitSha = process.env.GITHUB_SHA || gitOutput(["rev-parse", "HEAD"]);
    const tarball = readdirSync(artifactDir).find(f => f.endsWith(".tgz"));
    if (!tarball) throw new Error(`No .tgz found in ${artifactDir}`);
    const bytes = readFileSync(join(artifactDir, tarball));
    const { integrity, sha512Hex } = computeTarballDigest(bytes);
    const lockfileSha256 = createHash("sha256").update(readFileSync("pnpm-lock.yaml")).digest("hex");
    const manifest = {
      package: pkg.name,
      version: pkg.version,
      gitSha,
      tag,
      channel,
      tarball,
      integrity,
      sha512Hex,
      artifactName: `release-candidate-${gitSha}`,
      osvAuditFile: `osv-audit-${gitSha}.json`,
      lockfileSha256,
      builtAt: new Date().toISOString(),
    };
    writeFileSync(join(artifactDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
