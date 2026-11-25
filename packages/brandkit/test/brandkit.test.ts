import { describe, expect, it } from "vitest";
import {
  BRAND_QUESTIONS,
  FONT_PAIRINGS,
  PERSONALITIES,
  SCALE_STEPS,
  SEMANTIC_ROLES,
  answersToInput,
  createBrandkit,
  generateScale,
  googleFontsUrl,
  pickFontPairing,
} from "../src/index.js";

/** Small deterministic PRNG so the colour sweep is repeatable. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const hexOf = (n: number) =>
  `#${Math.floor(n * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;

const EDGE_COLOURS = [
  "#000000",
  "#ffffff",
  "#808080",
  "#facc15",
  "#ffff00",
  "#00ffff",
  "#ff00ff",
  "#0000ff",
  "#2563eb",
  "#16a34a",
  "#7f1d1d",
  "#fde68a",
];

describe("generateScale", () => {
  it("produces 11 steps that get darker", () => {
    const { scale } = generateScale("#2563eb");
    const ls = SCALE_STEPS.map((s) => scale[s].oklch.l);
    expect(ls).toHaveLength(11);
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeLessThan(ls[i - 1] as number);
  });

  it("keeps the exact input colour at the nearest step", () => {
    const { scale, baseStep } = generateScale("#2563eb");
    expect(baseStep).not.toBeNull();
    expect(scale[baseStep!].hex).toBe("#2563eb");
  });

  it("keeps greys grey", () => {
    const { scale } = generateScale("#808080");
    for (const s of SCALE_STEPS) expect(scale[s].oklch.c).toBeLessThan(0.002);
  });
});

describe("createBrandkit", () => {
  it("requires a name and valid hex colours", () => {
    expect(() => createBrandkit({ name: " " })).toThrow(/name is required/);
    expect(() => createBrandkit({ name: "X", primary: "blue" })).toThrow(/hex colour/);
  });

  it("fills every semantic role in both modes", () => {
    const kit = createBrandkit({ name: "Acme" });
    for (const mode of ["light", "dark"] as const) {
      for (const role of SEMANTIC_ROLES)
        expect(kit.semantic[mode][role].hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("is deterministic and JSON-serialisable", () => {
    const input = { name: "Acme", primary: "#0ea5e9", personality: ["bold" as const] };
    const a = createBrandkit(input);
    expect(JSON.parse(JSON.stringify(a))).toEqual(createBrandkit(input));
  });

  it("uses the exact brand colour for the primary button when it passes", () => {
    const kit = createBrandkit({ name: "Acme", primary: "#2563eb" });
    expect(kit.semantic.light.primary.hex).toBe("#2563eb");
    expect(kit.semantic.light["primary-foreground"].hex).toBe("#ffffff");
  });

  it("keeps a light brand colour by switching to dark text", () => {
    const kit = createBrandkit({ name: "Sunny", primary: "#facc15" });
    expect(kit.semantic.light.primary.hex).toBe("#facc15");
    expect(kit.semantic.light["primary-foreground"].oklch.l).toBeLessThan(0.3);
  });

  it("never makes a button the same colour as the page", () => {
    const kit = createBrandkit({ name: "Blank", primary: "#ffffff" });
    expect(kit.semantic.light.primary.hex).not.toBe("#ffffff");
  });

  it("derives everything from personality when no colour is given", () => {
    for (const p of PERSONALITIES) {
      const kit = createBrandkit({ name: "P", personality: [p] });
      expect(kit.meta.personality[0]).toBe(p);
      expect(kit.meta.primaryBaseStep).toBeNull();
    }
  });

  it("meets WCAG AA for every checked pair across a wide colour sweep", () => {
    const next = rng(42);
    const colours = [...EDGE_COLOURS, ...Array.from({ length: 150 }, () => hexOf(next()))];
    for (const primary of colours) {
      const accent = hexOf(next());
      const kit = createBrandkit({ name: "Sweep", primary, accent });
      const failures = kit.contrast.filter((c) => !c.aa);
      expect(failures, `${primary} / ${accent}`).toEqual([]);
    }
  });

  it("builds a modular type scale from the personality", () => {
    const kit = createBrandkit({ name: "Bold", personality: ["bold"] });
    expect(kit.typography.ratio).toBe(1.333);
    expect(kit.typography.scale.base.size).toBe("1rem");
    expect(parseFloat(kit.typography.scale["2xl"].size)).toBeCloseTo(1.333 ** 3, 2);
  });

  it("maps roundness to radii", () => {
    expect(createBrandkit({ name: "A", roundness: "sharp" }).radius.md).toBe("0.25rem");
    expect(createBrandkit({ name: "A", roundness: "round" }).radius.lg).toBe("1rem");
  });
});

describe("fonts", () => {
  it("picks a pairing that matches the personality", () => {
    expect(pickFontPairing(["luxurious"]).id).toBe("playfair");
    expect(pickFontPairing(["playful", "friendly"]).personalities).toContain("playful");
  });

  it("builds a Google Fonts URL with every family once", () => {
    const url = googleFontsUrl(FONT_PAIRINGS.find((p) => p.id === "inter")!);
    expect(url).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap",
    );
  });

  it("rejects unknown pairings", () => {
    expect(() => createBrandkit({ name: "A", fontPairing: "comic" })).toThrow(
      /Unknown font pairing/,
    );
  });
});

describe("questionnaire", () => {
  it("asks for the name first and only requires the name", () => {
    expect(BRAND_QUESTIONS[0]?.id).toBe("name");
    expect(BRAND_QUESTIONS.filter((q) => q.required).map((q) => q.id)).toEqual(["name"]);
  });

  it("cleans answers into generator input", () => {
    const input = answersToInput({
      name: "  Acme  ",
      description: " ",
      primary: " #2563eb ",
      personality: ["bold", "nonsense" as never, "calm", "warm", "playful"],
    });
    expect(input).toEqual({
      name: "Acme",
      primary: "#2563eb",
      personality: ["bold", "calm", "warm"],
    });
    expect(() => createBrandkit(input)).not.toThrow();
  });
});
