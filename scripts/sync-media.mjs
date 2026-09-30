// Mirrors assets/media/ to the R2 bucket that serves it in production (see
// src/lib/media.ts and README.md). These files stay committed to git as
// the source of truth, but must never land under public/ — Vercel bundles
// a full copy of public/ into every deployment it retains, which
// exhausts the free storage quota.
//
// Default mode only looks at what's staged for commit (fast no-op on a
// normal code-only commit); --all rescans everything, for a manual full
// resync.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const assetsRoot = path.join(repoRoot, "assets");
const manifestPath = path.join(assetsRoot, ".media-manifest.json");
const watchedDirs = ["media"];
const bucket = process.env.R2_MEDIA_BUCKET ?? "digitalfigments-media";
const isFullScan = process.argv.includes("--all");
// Windows' npx is a .cmd shim — execFileSync can't resolve it without a
// shell, but `shell: true` passes args unescaped (Node flags this as
// DEP0190). Naming the shim explicitly avoids needing a shell at all.
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const contentTypes = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".zip": "application/zip",
};

function loadManifest() {
  if (!existsSync(manifestPath)) return {};
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

async function candidateFiles() {
  if (isFullScan) {
    const files = [];
    for (const dir of watchedDirs) {
      const abs = path.join(assetsRoot, dir);
      if (existsSync(abs)) files.push(...(await walk(abs)));
    }
    return files;
  }

  const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);

  return staged
    .filter((relPath) => watchedDirs.some((dir) => relPath.startsWith(`assets/${dir}/`)))
    .map((relPath) => path.join(repoRoot, relPath));
}

async function main() {
  const files = await candidateFiles();
  if (files.length === 0) return;

  const manifest = loadManifest();
  let uploaded = 0;
  let unchanged = 0;

  for (const file of files) {
    const key = path.relative(assetsRoot, file).split(path.sep).join("/");
    const hash = await sha256(file);

    if (manifest[key] === hash) {
      unchanged++;
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    const contentType = contentTypes[ext] ?? "application/octet-stream";

    console.log(`Uploading ${key} to R2...`);
    // wrangler's R2 API calls intermittently hit transient "fetch failed"
    // network errors on large batches — retry a few times before giving up.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        execFileSync(
          npxCommand,
          [
            "--yes",
            "wrangler",
            "r2",
            "object",
            "put",
            `${bucket}/${key}`,
            `--file=${file}`,
            `--content-type=${contentType}`,
            "--remote",
          ],
          // shell: true works around a Node/Windows spawnSync EINVAL on
          // long-running npx.cmd children (surfaced on Node 26); args are
          // all script-controlled (bucket/key/file/contentType), not user
          // input, so the shell-escaping caveat this normally warns about
          // doesn't apply here.
          { cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32" }
        );
        break;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        console.warn(`Retrying ${key} (attempt ${attempt + 1}/${maxAttempts})...`);
      }
    }

    manifest[key] = hash;
    uploaded++;
    // Persisted per-file, not just at the end — a later file failing (e.g. a
    // transient network error) shouldn't force re-uploading ones that already
    // succeeded on the next run.
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (uploaded > 0 && !isFullScan) {
    execFileSync("git", ["add", manifestPath], { cwd: repoRoot });
  }

  console.log(`sync-media: ${uploaded} uploaded, ${unchanged} unchanged.`);
}

main().catch((err) => {
  console.error("sync-media failed:", err.message ?? err);
  process.exit(1);
});
