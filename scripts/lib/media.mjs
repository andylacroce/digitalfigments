// Pure helpers for scripts/sync-media.mjs.
import path from "node:path";

// Single source for what media we serve: the Keystatic upload rules, the R2
// content types, and the dev middleware all read this (see media-types.json).
import mediaTypes from "./media-types.json" with { type: "json" };

const contentTypes = { ...mediaTypes.video, ...mediaTypes.audio, ...mediaTypes.other };

export function contentTypeFor(file) {
  return contentTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

// R2 object key: the file's path under assets/, always with forward slashes.
export function mediaKey(assetsRoot, file) {
  return path.relative(assetsRoot, file).split(path.sep).join("/");
}

// Staged repo-relative paths (from `git diff --cached --name-only`) that live
// under one of the watched assets/ subdirectories, as absolute paths.
export function stagedMediaFiles(staged, watchedDirs, repoRoot) {
  return staged
    .filter((relPath) => watchedDirs.some((dir) => relPath.startsWith(`assets/${dir}/`)))
    .map((relPath) => path.join(repoRoot, relPath));
}

// wrangler's R2 API calls intermittently hit transient "fetch failed" network
// errors on large batches — retry a few times before giving up.
export function withRetries(fn, maxAttempts, onRetry) {
  for (let attempt = 1; ; attempt++) {
    try {
      return fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      onRetry(attempt + 1);
    }
  }
}

// Manifest keys (what's been uploaded to R2) whose local file no longer
// exists — moved or deleted — so their R2 objects are now orphans.
export function removedKeys(manifestKeys, assetsRoot, exists) {
  return manifestKeys.filter((key) => !exists(path.join(assetsRoot, ...key.split("/"))));
}

// With `shell: true` (Windows only, see sync-media.mjs) Node joins args into
// one command line unquoted, so a filename with spaces — Keystatic keeps
// original upload names — would be split into several arguments.
export function shellArg(arg, platform = process.platform) {
  return platform === "win32" && /[\s&|<>^()]/.test(arg) ? `"${arg}"` : arg;
}
