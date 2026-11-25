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
    expect(kit.typography.ratio).toBe(1.414);
    expect(kit.typography.scale.base.size).toBe("1rem");
    expect(parseFloat(kit.typography.scale["2xl"].size)).toBeCloseTo(1.414 ** 3, 2);
  });

  it("makes every personality visibly different, even with the user's own colour", () => {
    const signature = (p: (typeof PERSONALITIES)[number]) => {
      const kit = createBrandkit({ name: "P", primary: "#2f6b3b", personality: [p] });
      return [kit.typography.pairing.id, kit.meta.roundness, kit.typography.ratio].join("|");
    };
    const signatures = PERSONALITIES.map(signature);
    expect(new Set(signatures).size).toBe(PERSONALITIES.length);
    // Calm used to be identical to Professional and to picking nothing.
    const none = createBrandkit({ name: "P", primary: "#2f6b3b" });
    expect(signature("calm")).not.toBe(
      [none.typography.pairing.id, none.meta.roundness, none.typography.ratio].join("|"),
    );
  });

  it("lets secondary personalities influence the result", () => {
    const alone = createBrandkit({ name: "P", personality: ["professional"] });
    const mixed = createBrandkit({
      name: "P",
      personality: ["professional", "playful", "friendly"],
    });
    // Two of three votes are for round corners, and the type scale blends.
    expect(alone.meta.roundness).toBe("soft");
    expect(mixed.meta.roundness).toBe("round");
    expect(mixed.typography.ratio).toBeGreaterThan(alone.typography.ratio);
  });

  it("records where each choice came from", () => {
    expect(createBrandkit({ name: "P" }).meta.sources).toEqual({
      primary: "personality",
      accent: "derived",
      roundness: "personality",
      fontPairing: "personality",
    });
    const own = createBrandkit({
      name: "P",
      primary: "#123456",
      accent: "#f59e0b",
      roundness: "sharp",
      fontPairing: "inter",
    });
    expect(own.meta.sources).toEqual({
      primary: "input",
      accent: "input",
      roundness: "input",
      fontPairing: "input",
    });
  });

  describe("shuffle (seed)", () => {
    const sig = (kit: ReturnType<typeof createBrandkit>) =>
      [kit.scales.primary[500].hex, kit.semantic.light.accent.hex, kit.typography.pairing.id].join(
        "|",
      );

    it("is deterministic and leaves seed 0 as the default", () => {
      const base = { name: "S", personality: ["calm" as const] };
      expect(sig(createBrandkit({ ...base, seed: 7 }))).toBe(
        sig(createBrandkit({ ...base, seed: 7 })),
      );
      expect(sig(createBrandkit({ ...base, seed: 0 }))).toBe(sig(createBrandkit(base)));
      expect(createBrandkit({ ...base, seed: 7 }).meta.seed).toBe(7);
      expect(createBrandkit({ ...base, seed: -3 }).meta.seed).toBe(0);
    });

    it("produces variety across seeds", () => {
      const results = new Set(
        Array.from({ length: 12 }, (_, i) => sig(createBrandkit({ name: "S", seed: i + 1 }))),
      );
      expect(results.size).toBeGreaterThanOrEqual(8);
    });

    it("never changes choices the user fixed", () => {
      for (let seed = 1; seed <= 20; seed++) {
        const kit = createBrandkit({
          name: "S",
          primary: "#2f6b3b",
          accent: "#f59e0b",
          fontPairing: "playfair",
          roundness: "sharp",
          seed,
        });
        expect(kit.semantic.light.primary.hex).toBe("#2f6b3b");
        expect(Object.values(kit.scales.accent).map((c) => c.hex)).toContain("#f59e0b");
        expect(kit.typography.pairing.id).toBe("playfair");
        expect(kit.meta.roundness).toBe("sharp");
      }
    });

    it("keeps an unfixed choice stable when another choice is fixed", () => {
      const free = createBrandkit({ name: "S", personality: ["warm"], seed: 11 });
      const fixedColour = createBrandkit({
        name: "S",
        personality: ["warm"],
        primary: free.scales.primary[free.meta.primaryBaseStep ?? 600].hex,
        seed: 11,
      });
      expect(fixedColour.typography.pairing.id).toBe(free.typography.pairing.id);
    });

    it("keeps contrast guarantees for shuffled kits", () => {
      for (let seed = 1; seed <= 60; seed++) {
        const personality = [
          PERSONALITIES[seed % PERSONALITIES.length] as (typeof PERSONALITIES)[number],
        ];
        const kit = createBrandkit({ name: "S", personality, seed });
        expect(
          kit.contrast.filter((c) => !c.aa),
          `seed ${seed}`,
        ).toEqual([]);
      }
    });
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
