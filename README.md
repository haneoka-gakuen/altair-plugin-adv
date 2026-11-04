# Altair ADV

Altair ADV teaches the [Altair](https://github.com/haneoka-gakuen/altair)
editor the ADV command language that [Vega](https://github.com/haneoka-gakuen/vega)
plays. Once it is installed, every one of the 67 story commands has a form in
the inspector, a summary line in the script view and a schema for validation;
projects open from and save to ADV JSON or Altair's project JSON; and the
compiler turns the edited project into the command stream Vega runs.

It is the base plugin of the suite. Source plugins such as
[Bestdori](https://github.com/haneoka-gakuen/altair-plugin-bestdori) and
[WebGAL](https://github.com/haneoka-gakuen/altair-plugin-webgal) convert into
these commands, and [Vega Preview](https://github.com/haneoka-gakuen/altair-plugin-vega-preview)
plays them back while you write.

## Install

```sh
pnpm add @haneoka/altair @haneoka/altair-plugin-adv @haneoka/vega-protocol
```

ESM only; Node 20 or a current browser.

## Use it in Altair

```ts
import { AltairPluginHost } from "@haneoka/altair/plugins";
import { ALTAIR_ADV_SERVICE, altairAdvPlugin } from "@haneoka/altair-plugin-adv";

const host = new AltairPluginHost();
await host.install(altairAdvPlugin);

const adv = host.service(ALTAIR_ADV_SERVICE);
const { story, diagnostics } = adv.compileStoryProjectWithDiagnostics(project);
```

The plugin registers, under the manifest id `haneoka.altair-adv`:

| Contribution | What it adds |
| --- | --- |
| 67 command schemas | One per ADV command, with typed fields, defaults and the editor document type. |
| Compiler pass | Turns an Altair `StoryProject` into Vega's ADV command list (priority 100). |
| Validator | Checks project structure, commands and resource references. |
| Format `adv-json` | Reads and writes `.adv.json` episode and story files. Singleton port `format.adv-json`. |
| Format `project-json` | Altair's own `.story.json` project file. Singleton port `format.project-json`. |
| Asset provider | Resolves resource names used in commands to the project's assets. |
| Service `ALTAIR_ADV_SERVICE` | Everything above as plain functions, for other plugins and host code. |

## The command set

Commands are grouped the way the inspector shows them. Codes match Vega's
opcode table, so a story written here plays in Vega without translation.

| Category | Commands |
| --- | --- |
| Dialogue | Talk, Location, Wait for input, Talk window |
| Character | Character in/out, Bring forward, Send backward, Move left/right/up/down/forward/back, Move direction, Expression, Motion, Pause/Resume character, Load character model, Costume, Character angle, Look, Look target, Rim light |
| Stage | Background, Still, Post effect, Frame, Timeline, ADV effect, Stage environment |
| Camera | Focus, Brightness, Pan, Tilt, Pedestal, Track, Roll, Zoom, Shake, Depth of field, Field pan |
| Audio | BGM, Sound volume, Sound effect, Voice |
| Transition | Screen shake, Fade out, Fade in, Flash, Layer opacity |
| Chat | Chat window, Chat message, Chat stamp, Chat read, Chat typing |
| Media | Movie, Clip, Video subtitles |
| Flow | Show choices, Go to, Command group |
| Timing | Delay, Cancel delay |
| System | Force auto |

Every command has a `CommandDescriptor` with its code, name, category, field
list and defaults. Field kinds are `text`, `localized-text`, `localized-list`,
`number`, `vector3`, `boolean`, `select`, `multi-select`, `choice-list`,
`resource` and `resource-list`; resource fields say which kind they accept
(`live2d`, `background`, `still`, `frame`, `effect`, `post-effect`, `audio`,
`video`, `timeline`).

Native codes run from 0 to 100. Codes from `ADV_PORTABLE_OPCODE_MIN` up are
portable commands that Vega adds on top of the native set, such as command
groups.

## Reading and writing files

```ts
import {
  importAdvEpisodeJson,
  importStoryProjectJson,
  serializeAdvEpisodeJson,
  serializeStoryProjectJson,
} from "@haneoka/altair-plugin-adv";

const { project, diagnostics } = importAdvEpisodeJson(bytes, { title: "Episode 1" });
const json = serializeAdvEpisodeJson(project);
```

- `importAdvStoryJson` / `importAdvEpisodeJson` read a single story or an
  episode table. Fields and commands the catalogue does not know are kept on
  the command and written back unchanged on export, so a round trip through
  Altair never loses data.
- `parseAdvStoryJson` / `parseAdvEpisodeJson` return the project without the
  import diagnostics.
- `importStoryProjectJson` / `serializeStoryProjectJson` handle Altair's own
  project file.

Each diagnostic carries a `fidelity`: `exact`, `approximate`,
`preserved-only` (kept but not editable) or `unsupported`.

## Building and editing commands

The service functions are what the inspector uses; they work the same in
your own tools:

```ts
const command = adv.createStoryCommand("Talk", { targetName: "Anon", text: "行こう" });
adv.summarizeStoryCommand(command); // "Talk · 行こう" (label · primary field)

const [, , , text] = adv.commandFieldDescriptors(command); // the "Dialogue" field
const fields = adv.replaceStoryCommandFieldValue(command.fields, text, "行こうか");
const edited = { ...command, fields };
```

`createStoryCommand` fills in the command's defaults and gives it a fresh id.
Field edits return a new `fields` object and never touch the original.

Localized text follows the project's languages. A project may declare any set
of languages; the five game languages (`ja`, `en`, `zh-TW`, `zh-CN`, `ko`) are
only the default for imported game stories.

Resources can be added from a file picker or an asset browser with
`createAdvResourceCommand` (a new command that shows the resource) or
`registerAdvResource` (add it to the project without a command). Visual kinds
are background, still, frame, effect, post effect and video; audio is
registered as BGM, SE or voice.

## Validation

`validateStoryProject(project)` returns diagnostics with stable codes, grouped
by what they point at:

- **Project** — `project.type`, `project.version`, `project.plugins`
- **Scenes** — `scene.entry`, `scene.missing`, `scene.name`, `scene.type`, `scene.extensions`
- **Commands** — `command.type`, `command.code`, `command.unknown`, `command.required`, `command.fields`, `command.source`, `command.extensions`
- **Ids** — `id.invalid`, `id.duplicate`
- **Resources** — `resource.missing`
- **Plugins** — `plugin.id`, `plugin.version`, `plugin.protocol`, `plugin.type`, `plugin.enabled`, `plugin.duplicate`
- **Metadata** — `meta.title`, `meta.type`, `meta.tags`

`assertValidStoryProject` throws on the first error instead.

## Subpath exports

Import only what you need:

| Path | Contents |
| --- | --- |
| `@haneoka/altair-plugin-adv` | Everything, plus the plugin as default export |
| `/plugin` | `altairAdvPlugin` |
| `/services` | `ALTAIR_ADV_SERVICE`, `altairAdvService` |
| `/commands` | Descriptors, schemas, field helpers |
| `/compiler` | `compileStoryProject`, `compileStoryProjectWithDiagnostics` |
| `/format` | The two format contributions |
| `/project-json` | Project file read/write |
| `/validation` | `validateStoryProject`, `assertValidStoryProject` |
| `/assets`, `/resources`, `/resource-authoring` | Asset lookup and resource commands |
| `/documents` | Document-model mapping used by the editor |

## License

MPL-2.0. See [LICENSE](LICENSE).
