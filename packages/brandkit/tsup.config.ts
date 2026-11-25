import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "exporters/css": "src/exporters/css.ts",
    "exporters/dtcg": "src/exporters/dtcg.ts",
    "exporters/tailwind": "src/exporters/tailwind.ts",
    "exporters/shadcn": "src/exporters/shadcn.ts",
    "exporters/bootstrap": "src/exporters/bootstrap.ts",
    "exporters/vuetify": "src/exporters/vuetify.ts",
    "exporters/design-md": "src/exporters/design-md.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
  treeshake: true,
});
