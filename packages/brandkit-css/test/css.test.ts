import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBrandkit } from "@mortimerdev/brandkit";
import { exportCss } from "@mortimerdev/brandkit/css";
import { bundle, transform } from "lightningcss";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = ["reset.css", "base.css", "components.css", "index.css"];
const read = (f: string) => readFileSync(join(root, "src", f), "utf8");

describe("brandkit-css", () => {
  it.each(files)("%s is valid CSS", (file) => {
    expect(() =>
      transform({ filename: file, code: Buffer.from(read(file)), errorRecovery: false }),
    ).not.toThrow();
  });

  it("bundles with layers in the documented order", () => {
    const { code } = bundle({ filename: join(root, "src/index.css"), errorRecovery: false });
    const css = code.toString();
    // The bundler may merge the order statement into the blocks; the first
    // appearance of each layer name fixes its priority.
    const order = ["reset", "tokens", "base", "components"].map((l) =>
      css.search(new RegExp(`@layer ${l}[\\s;{,]`)),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(read("index.css")).toContain("@layer reset, tokens, base, components;");
  });

  it("only uses tokens that @mortimerdev/brandkit actually exports", () => {
    const tokens = exportCss(createBrandkit({ name: "Check" }));
    const defined = new Set([...tokens.matchAll(/(--bk-[\w-]+):/g)].map((m) => m[1]));
    const used = new Set(
      ["base.css", "components.css"].flatMap((f) =>
        [...read(f).matchAll(/var\((--bk-[\w-]+)/g)].map((m) => m[1]),
      ),
    );
    const missing = [...used].filter((t) => !defined.has(t));
    expect(missing).toEqual([]);
  });

  it("gives every token a fallback so it works before tokens load", () => {
    for (const f of ["base.css", "components.css"]) {
      const withoutFallback = [...read(f).matchAll(/var\(--bk-[\w-]+\)/g)];
      expect(withoutFallback, f).toEqual([]);
    }
  });

  it("covers the reset essentials", () => {
    const reset = read("reset.css");
    expect(reset).toContain("box-sizing: border-box");
    expect(reset).toContain("font: inherit");
    expect(reset).toContain("max-inline-size: 100%");
    expect(reset).toContain("text-wrap: balance");
    expect(reset).toContain("prefers-reduced-motion");
  });
});
