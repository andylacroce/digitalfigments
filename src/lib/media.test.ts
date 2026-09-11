import { afterEach, describe, expect, it } from "vitest";
import { mediaUrl } from "./media";

const originalDev = import.meta.env.DEV;

afterEach(() => {
  import.meta.env.DEV = originalDev;
});

describe("mediaUrl", () => {
  it("resolves a /media/ path against the CDN base URL outside dev", () => {
    import.meta.env.DEV = false;
    expect(mediaUrl("/media/2016/07/song.mp3")).toBe(
      `${import.meta.env.PUBLIC_MEDIA_BASE_URL ?? ""}/media/2016/07/song.mp3`
    );
  });

  it("uses the bare path in dev, so the dev-server middleware serves it from disk", () => {
    import.meta.env.DEV = true;
    expect(mediaUrl("/media/2016/07/song.mp3")).toBe("/media/2016/07/song.mp3");
  });

  it("leaves other paths (e.g. external embed URLs) untouched", () => {
    const url = "https://www.youtube.com/watch?v=zJF4OTOZa6E";
    expect(mediaUrl(url)).toBe(url);
  });
});
