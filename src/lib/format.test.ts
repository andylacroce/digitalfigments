import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats a date as \"Month D, YYYY\"", () => {
    expect(formatDate(new Date("2024-03-05"))).toBe("March 5, 2024");
  });

  it("does not zero-pad the day", () => {
    expect(formatDate(new Date("2021-11-07"))).toBe("November 7, 2021");
  });
});
