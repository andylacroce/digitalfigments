import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { renderSummary } from "./lib/ci-summary.mjs";

const STEPS = [
  { name: "Lint", npmScript: "lint" },
  { name: "Markdown lint", npmScript: "lint:md" },
  { name: "Typecheck", npmScript: "typecheck" },
  { name: "Unit tests", npmScript: "test:coverage" },
  { name: "Build", npmScript: "build" },
  { name: "E2E tests", npmScript: "test:e2e" },
];

const useColor = process.stdout.isTTY !== false && !process.env.NO_COLOR;
const stepHeading = (name) => {
  const text = `\n▶ ${name}`;
  return useColor ? `\x1b[1m\x1b[36m${text}\x1b[0m` : text;
};

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const results = [];
  let stoppedAt = null;

  for (const step of STEPS) {
    if (stoppedAt) {
      results.push({ ...step, status: "skipped" });
      continue;
    }

    console.log(stepHeading(step.name));
    const start = Date.now();
    const proc = spawnSync("npm", ["run", step.npmScript], { stdio: "inherit", shell: true });
    const durationMs = Date.now() - start;
    const status = proc.status === 0 ? "passed" : "failed";
    results.push({ ...step, status, durationMs });
    if (status === "failed") stoppedAt = step.name;
  }

  // Gate each detail block on its step having actually run this time (not
  // "skipped") rather than on it having passed, so a genuine failure still
  // shows real numbers — only a stale file left over from a previous run
  // needs hiding.
  const ran = (script) => results.find((r) => r.npmScript === script)?.status !== "skipped";
  const coverage = ran("test:coverage") ? readJson(path.join("coverage", "coverage-summary.json")) : null;
  const e2e = ran("test:e2e") ? readJson(path.join("test-results", "results.json")) : null;

  const { text, overallPassed } = renderSummary({ results, stoppedAt, coverage, e2e, useColor });
  console.log(text);
  process.exit(overallPassed ? 0 : 1);
}

main();
