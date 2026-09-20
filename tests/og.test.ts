import { describe, test, expect } from "vitest";
import { resolveOgImage, buildOgImageUrl } from "../src/lib/og";

describe("resolveOgImage", () => {
  test("returns poster path when provided", () => {
    expect(resolveOgImage("/assets/posters/kart-telemetry.png")).toBe(
      "/assets/posters/kart-telemetry.png"
    );
  });

  test("returns default OG image when poster is undefined", () => {
    expect(resolveOgImage()).toBe("/assets/og-default.png");
  });

  test("returns default OG image when poster is empty string", () => {
    expect(resolveOgImage("")).toBe("/assets/og-default.png");
  });

  test("returns default OG image when poster is whitespace", () => {
    expect(resolveOgImage("   ")).toBe("/assets/og-default.png");
  });
});

describe("buildOgImageUrl", () => {
  test("combines site and image path into absolute URL", () => {
    expect(buildOgImageUrl("https://jeromeyeoh.com", "/assets/og.png")).toBe(
      "https://jeromeyeoh.com/assets/og.png"
    );
  });

  test("strips trailing slash from site", () => {
    expect(buildOgImageUrl("https://jeromeyeoh.com/", "/assets/og.png")).toBe(
      "https://jeromeyeoh.com/assets/og.png"
    );
  });

  test("adds leading slash to image path if missing", () => {
    expect(buildOgImageUrl("https://jeromeyeoh.com", "assets/og.png")).toBe(
      "https://jeromeyeoh.com/assets/og.png"
    );
  });
});
