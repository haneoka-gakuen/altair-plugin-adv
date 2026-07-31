# Altair ADV

ADV project editing, validation, import, export, compilation, and asset resolution for Altair.

```sh
pnpm add @haneoka/altair @haneoka/altair-plugin-adv
```

```ts
import { AltairPluginHost } from "@haneoka/altair/plugins";
import { ALTAIR_ADV_SERVICE, altairAdvPlugin } from "@haneoka/altair-plugin-adv";

const host = new AltairPluginHost();
await host.install(altairAdvPlugin);
const adv = host.service(ALTAIR_ADV_SERVICE);
```

Unknown source fields and commands are preserved during import and export.

MPL-2.0.
