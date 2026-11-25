import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  formatOklch,
  fromHex,
  fromOklch,
  gamutMap,
  inSrgbGamut,
  isHex,
  parseHex,
  rgbToOklch,
  toHex,
} from "../src/color.js";

describe("hex parsing", () => {
  it("accepts 3 and 6 digit hex with or without #", () => {
    expect(isHex("#fff")).toBe(true);
    expect(isHex("2563eb")).toBe(true);
    expect(isHex("#12345")).toBe(false);
    expect(isHex("blue")).toBe(false);
    expect(toHex(parseHex("#abc"))).toBe("#aabbcc");
  });

  it("rejects invalid input with a helpful message", () => {
    expect(() => parseHex("nope")).toThrow(/Invalid hex colour/);
  });
});

describe("OKLCH conversion", () => {
  it("maps white and black to the ends of lightness", () => {
    expect(rgbToOklch(parseHex("#ffffff")).l).toBeCloseTo(1, 3);
    expect(rgbToOklch(parseHex("#000000")).l).toBeCloseTo(0, 3);
    expect(rgbToOklch(parseHex("#808080")).c).toBeLessThan(1e-3);
  });

  it("matches a reference value for pure red", () => {
    // CSS Color 4 reference: oklch(62.8% 0.2577 29.23)
    const red = rgbToOklch(parseHex("#ff0000"));
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
  });

  it("round-trips hex through OKLCH", () => {
    for (const hex of ["#2563eb", "#facc15", "#16a34a", "#0f172a", "#ff00ff", "#ffffff"]) {
      expect(fromOklch(fromHex(hex).oklch).hex).toBe(hex);
    }
  });

  it("gamut maps by reducing chroma, keeping lightness and hue", () => {
    const wild = { l: 0.7, c: 0.4, h: 150 };
    expect(inSrgbGamut(wild)).toBe(false);
    const mapped = gamutMap(wild);
    expect(inSrgbGamut(mapped)).toBe(true);
    expect(mapped.l).toBe(0.7);
    expect(mapped.h).toBe(150);
    expect(mapped.c).toBeLessThan(0.4);
  });

  it("formats CSS oklch()", () => {
    expect(formatOklch({ l: 0.5, c: 0.1, h: 200 })).toBe("oklch(50% 0.1 200)");
    expect(formatOklch({ l: 0.5, c: 0.1, h: 200 }, 0.5)).toBe("oklch(50% 0.1 200 / 0.5)");
  });
});

describe("WCAG contrast", () => {
  it("matches known ratios", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // #767676 is the classic lightest grey that passes AA on white.
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#2563eb", "#ffffff")).toBe(contrastRatio("#ffffff", "#2563eb"));
  });
});
