import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: {
        assets: resolve(root, "src/assets.ts"),
        commands: resolve(root, "src/commands.ts"),
        compiler: resolve(root, "src/compiler.ts"),
        format: resolve(root, "src/format.ts"),
        index: resolve(root, "src/index.ts"),
        plugin: resolve(root, "src/plugin.ts"),
        "project-json": resolve(root, "src/project-json.ts"),
        "resource-authoring": resolve(root, "src/resource-authoring.ts"),
        resources: resolve(root, "src/resources.ts"),
        services: resolve(root, "src/services.ts"),
        validation: resolve(root, "src/validation.ts"),
      },
      fileName: (_format, entry) => `${entry}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) =>
        id === "@haneoka/altair/model" ||
        id === "@haneoka/altair/plugins" ||
        id === "@haneoka/vega-protocol",
    },
    sourcemap: true,
    target: "es2022",
  },
});
