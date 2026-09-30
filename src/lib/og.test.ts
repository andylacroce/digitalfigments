import { describe, expect, it } from "vitest";
import { firstImagePath } from "./og";

describe("firstImagePath", () => {
  it("extracts the path from the first markdown image", () => {
    expect(firstImagePath("intro text\n\n![a photo](./photo.jpg)\n\nmore text")).toBe("./photo.jpg");
  });

  it("returns the first path when there are several images", () => {
    expect(firstImagePath("![one](./a.jpg)\n\n![two](./b.jpg)")).toBe("./a.jpg");
  });

  it("returns undefined when there is no image", () => {
    expect(firstImagePath("just text, no images here")).toBeUndefined();
  });
});
