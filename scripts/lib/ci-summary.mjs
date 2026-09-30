// Renders the summary printed at the end of scripts/run-ci.mjs.
export const COVERAGE_THRESHOLD = 90;

export function formatDuration(ms) {
  if (ms == null) return "";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function pad(s, width) {
  return s + " ".repeat(Math.max(0, width - s.length));
}

// results: [{ name, npmScript, status: "passed"|"failed"|"skipped", durationMs? }]
// coverage / e2e: parsed JSON reports, or null when absent or stale.
export function renderSummary({ results, stoppedAt, coverage, e2e, useColor }) {
  const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
  const bold = (s) => paint(1, s);
  const green = (s) => paint(32, s);
  const red = (s) => paint(31, s);
  const yellow = (s) => paint(33, s);
  const gray = (s) => paint(90, s);
  const cyan = (s) => paint(36, s);

  const totalDurationMs = results.reduce((sum, r) => sum + (r.durationMs ?? 0), 0);
  const overallPassed = results.every((r) => r.status === "passed");
  const nameWidth = Math.max(...results.map((r) => r.name.length)) + 2;

  const lines = [];
  lines.push("");
  lines.push(bold(cyan("CI PIPELINE")));
  lines.push(gray("─".repeat(32)));

  for (const r of results) {
    const icon = r.status === "passed" ? green("✔") : r.status === "failed" ? red("✘") : gray("○");
    const name = r.status === "skipped" ? gray(pad(r.name, nameWidth)) : pad(r.name, nameWidth);
    const detail = r.status === "skipped" ? gray("skipped") : gray(formatDuration(r.durationMs));
    lines.push(`  ${icon}  ${name}${detail}`);
  }

  if (coverage?.total) {
    lines.push("");
    lines.push(`  ${bold("Coverage")} ${gray(`(${COVERAGE_THRESHOLD}% gate)`)}`);
    for (const key of ["statements", "branches", "functions", "lines"]) {
      const pct = coverage.total[key]?.pct;
      if (pct == null) continue;
      const ok = pct >= COVERAGE_THRESHOLD;
      const icon = ok ? green("✔") : red("✘");
      const value = ok ? green(`${pct}%`) : red(`${pct}%`);
      lines.push(`    ${icon}  ${pad(key, 12)}${value}`);
    }
  }

  if (e2e?.stats) {
    const s = e2e.stats;
    lines.push("");
    lines.push(`  ${bold("E2E tests")}`);
    lines.push(`    ${green("✔")}  passed   ${s.expected ?? 0}`);
    if (s.unexpected) lines.push(`    ${red("✘")}  failed   ${s.unexpected}`);
    if (s.flaky) lines.push(`    ${yellow("◐")}  flaky    ${s.flaky}`);
    if (s.skipped) lines.push(`    ${gray("○")}  skipped  ${s.skipped}`);
    lines.push(`    ${gray(`duration ${formatDuration(s.duration)}`)}`);
  }

  lines.push("");
  lines.push(
    overallPassed
      ? bold(green(`✔ CI passed  ${gray(`(${formatDuration(totalDurationMs)} total)`)}`))
      : bold(red(`✘ CI failed at "${stoppedAt}"  ${gray(`(${formatDuration(totalDurationMs)} total)`)}`)),
  );
  lines.push("");

  return { text: lines.join("\n"), overallPassed };
}
