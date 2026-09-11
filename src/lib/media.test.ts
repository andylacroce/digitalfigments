import { describe, expect, it } from "vitest";
import { mediaUrl } from "./media";

describe("mediaUrl", () => {
  it("resolves a /media/ path against the configured base URL", () => {
    expect(mediaUrl("/media/2016/07/song.mp3").endsWith("/media/2016/07/song.mp3")).toBe(true);
  });

  it("resolves a /covers-audio/ path against the configured base URL", () => {
    expect(mediaUrl("/covers-audio/song.mp3").endsWith("/covers-audio/song.mp3")).toBe(true);
  });

  it("leaves other paths (e.g. external embed URLs) untouched", () => {
    const url = "https://www.youtube.com/watch?v=zJF4OTOZa6E";
    expect(mediaUrl(url)).toBe(url);
  });
});
