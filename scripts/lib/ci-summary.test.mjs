import { describe, expect, it } from "vitest";
import { formatDuration, renderSummary } from "./ci-summary.mjs";

describe("formatDuration", () => {
  it("formats ms, seconds, and missing values", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(250.4)).toBe("250ms");
    expect(formatDuration(1500)).toBe("1.5s");
  });
});

const passed = (name, npmScript, durationMs = 100) => ({ name, npmScript, status: "passed", durationMs });
const render = (overrides) => renderSummary({ useColor: false, coverage: null, e2e: null, ...overrides });

describe("renderSummary", () => {
  it("reports a clean run with coverage and E2E details", () => {
    const { text, overallPassed } = render({
      results: [passed("Unit tests", "test:coverage"), passed("E2E tests", "test:e2e", 2000)],
      stoppedAt: null,
      coverage: { total: { statements: { pct: 95 }, branches: { pct: 80 }, lines: {} } },
      e2e: { stats: { expected: 7, unexpected: 1, flaky: 2, skipped: 3, duration: 1200 } },
    });
    expect(overallPassed).toBe(true);
    expect(text).toContain("✔ CI passed  (2.1s total)");
    expect(text).toContain("✔  statements  95%");
    expect(text).toContain("✘  branches    80%");
    expect(text).not.toContain("lines");
    expect(text).toContain("passed   7");
    expect(text).toContain("failed   1");
    expect(text).toContain("flaky    2");
    expect(text).toContain("skipped  3");
    expect(text).toContain("duration 1.2s");
  });

  it("marks the failing step and skips the rest", () => {
    const { text, overallPassed } = render({
      results: [
        { name: "Lint", npmScript: "lint", status: "failed", durationMs: 50 },
        { name: "Build", npmScript: "build", status: "skipped" },
      ],
      stoppedAt: "Lint",
    });
    expect(overallPassed).toBe(false);
    expect(text).toContain('✘ CI failed at "Lint"');
    expect(text).toContain("○  Build");
    expect(text).toContain("skipped");
  });

  it("omits detail blocks without reports, and only colors when asked", () => {
    const results = [passed("Lint", "lint")];
    const plain = render({ results, stoppedAt: null }).text;
    expect(plain).not.toContain("Coverage");
    expect(plain).not.toContain("E2E tests");
    expect(plain).not.toContain("\x1b[");
    expect(renderSummary({ results, stoppedAt: null, coverage: null, e2e: null, useColor: true }).text).toContain("\x1b[");
  });
});
