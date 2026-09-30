import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { contentTypeFor, mediaKey, removedKeys, shellArg, stagedMediaFiles, withRetries } from "./media.mjs";

describe("contentTypeFor", () => {
  it("maps known extensions case-insensitively", () => {
    expect(contentTypeFor("a/song.mp3")).toBe("audio/mpeg");
    expect(contentTypeFor("a/clip.MP4")).toBe("video/mp4");
    expect(contentTypeFor("a/phone.mov")).toBe("video/quicktime");
    expect(contentTypeFor("a/voice.ogg")).toBe("audio/ogg");
  });

  it("falls back to octet-stream for unknown extensions", () => {
    expect(contentTypeFor("a/readme.txt")).toBe("application/octet-stream");
  });
});

describe("mediaKey", () => {
  it("is the path under assets/ with forward slashes", () => {
    const root = path.join("repo", "assets");
    expect(mediaKey(root, path.join(root, "media", "2016", "song.mp3"))).toBe("media/2016/song.mp3");
  });
});

describe("stagedMediaFiles", () => {
  it("keeps only files under watched dirs, as absolute paths", () => {
    const staged = ["assets/media/a.mp3", "assets/other/b.mp3", "src/index.ts"];
    expect(stagedMediaFiles(staged, ["media"], "repo")).toEqual([path.join("repo", "assets/media/a.mp3")]);
  });
});

describe("removedKeys", () => {
  it("returns manifest keys whose local file is gone", () => {
    const root = path.join("repo", "assets");
    const present = new Set([path.join(root, "media", "a.mp3"), path.join(root, "media", "post", "b.mp4")]);
    const keys = ["media/a.mp3", "media/old.mp4", "media/post/b.mp4", "media/post/moved.mp4"];
    expect(removedKeys(keys, root, (f) => present.has(f))).toEqual(["media/old.mp4", "media/post/moved.mp4"]);
  });
});

describe("shellArg", () => {
  it("quotes args with spaces or shell metacharacters on Windows only", () => {
    expect(shellArg("bucket/media/a b.png", "win32")).toBe('"bucket/media/a b.png"');
    expect(shellArg("--remote", "win32")).toBe("--remote");
    expect(shellArg("bucket/media/a b.png", "linux")).toBe("bucket/media/a b.png");
  });
});

describe("withRetries", () => {
  it("returns the result without retrying on success", () => {
    const onRetry = vi.fn();
    expect(withRetries(() => "ok", 3, onRetry)).toBe("ok");
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("retries transient failures, reporting the next attempt number", () => {
    const fn = vi.fn().mockImplementationOnce(() => {
      throw new Error("fetch failed");
    }).mockReturnValue("ok");
    const onRetry = vi.fn();
    expect(withRetries(fn, 3, onRetry)).toBe("ok");
    expect(onRetry).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("rethrows once attempts are exhausted", () => {
    const fn = vi.fn(() => {
      throw new Error("fetch failed");
    });
    expect(() => withRetries(fn, 3, () => {})).toThrow("fetch failed");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
