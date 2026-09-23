import { ADV_DOCUMENT_COMMANDS } from "./documents.js";
import { defineAltairPlugin } from "@haneoka/altair/plugins";
import { ADV_PROJECT_ASSET_PROVIDER } from "./assets.js";
import { ADV_COMMAND_SCHEMAS } from "./commands.js";
import { ADV_COMPILER_PASS } from "./compiler.js";
import { ADV_JSON_FORMAT, PROJECT_JSON_FORMAT } from "./format.js";
import { ALTAIR_ADV_SERVICE, altairAdvService } from "./services.js";
import { ADV_PROJECT_VALIDATOR } from "./validation.js";

export const altairAdvPlugin = defineAltairPlugin({
  manifest: {
    id: "haneoka.altair-adv",
    name: "Altair ADV",
    version: "0.1.0",
    apiVersion: 2,
    capabilities: ["assets", "commands", "compiler", "diagnostics", "format", "services"],
  },
  setup(context) {
    context.provide(ALTAIR_ADV_SERVICE, altairAdvService);
    for (const schema of ADV_COMMAND_SCHEMAS) {
      context.contribute("command", {
        ...schema,
        document: ADV_DOCUMENT_COMMANDS.find((definition) => definition.type.name === schema.metadata?.advName)!,
      });
    }
    context.contribute("compiler", ADV_COMPILER_PASS, { priority: 100 });
    context.contribute("validator", ADV_PROJECT_VALIDATOR, {
      priority: 100,
    });
    context.contribute("format", ADV_JSON_FORMAT, {
      priority: 100,
      singletonPort: "format.adv-json",
    });
    context.contribute("format", PROJECT_JSON_FORMAT, {
      priority: 100,
      singletonPort: "format.project-json",
    });
    context.contribute("asset", ADV_PROJECT_ASSET_PROVIDER, {
      priority: 100,
    });
  },
});

export default altairAdvPlugin;
