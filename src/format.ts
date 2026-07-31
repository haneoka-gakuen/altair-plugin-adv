import {
  importAdvStoryJson,
  serializeAdvStoryJson,
  type ImportAdvStoryOptions,
  type SerializeAdvStoryOptions,
} from "./adv-json.js";
import {
  STORY_PROJECT_VERSION,
  type JsonObject,
} from "@haneoka/altair/model";
import type {
  AltairFormatContribution,
  AltairSourceFile,
} from "@haneoka/altair/plugins";
import {
  importStoryProjectJson,
  serializeStoryProjectJson,
} from "./project-json.js";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const abort = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw (
      signal.reason ??
      new DOMException("ADV format operation aborted", "AbortError")
    );
  }
};

const record = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stringOption = (
  options: JsonObject | undefined,
  key: string,
): string | undefined => {
  const value = options?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const booleanOption = (
  options: JsonObject | undefined,
  key: string,
): boolean | undefined => {
  const value = options?.[key];
  return typeof value === "boolean" ? value : undefined;
};

const importOptions = (
  options: JsonObject | undefined,
): ImportAdvStoryOptions => ({
  ...(stringOption(options, "title") === undefined
    ? {}
    : { title: stringOption(options, "title")! }),
  ...(stringOption(options, "sceneId") === undefined
    ? {}
    : { sceneId: stringOption(options, "sceneId")! }),
  ...(stringOption(options, "sceneName") === undefined
    ? {}
    : { sceneName: stringOption(options, "sceneName")! }),
  ...(stringOption(options, "releaseServer") === undefined
    ? {}
    : { releaseServer: stringOption(options, "releaseServer")! }),
  ...(record(options?.provenance)
    ? { provenance: options.provenance }
    : {}),
});

const serializeOptions = (
  options: JsonObject | undefined,
): SerializeAdvStoryOptions => ({
  ...(stringOption(options, "sceneId") === undefined
    ? {}
    : { sceneId: stringOption(options, "sceneId")! }),
  ...(booleanOption(options, "pretty") === undefined
    ? {}
    : { pretty: booleanOption(options, "pretty")! }),
  ...(booleanOption(options, "preserveSourceContainer") === undefined
    ? {}
    : {
        preserveSourceContainer: booleanOption(
          options,
          "preserveSourceContainer",
        )!,
      }),
});

const entryFile = (
  files: readonly AltairSourceFile[],
  entryPath?: string,
): AltairSourceFile => {
  const entry = entryPath
    ? files.find(({ path }) => path === entryPath)
    : files[0];
  if (!entry) throw new RangeError("ADV format entry does not exist");
  return entry;
};

const sniffAdvJson = (file: AltairSourceFile): number => {
  try {
    const parsed = JSON.parse(decoder.decode(file.bytes)) as unknown;
    if (!record(parsed)) return 0;
    if (Array.isArray(parsed._allData)) return 1;
    if (Array.isArray(parsed.commands)) return 0.98;
    return 0;
  } catch {
    return 0;
  }
};

const sniffProjectJson = (file: AltairSourceFile): number => {
  try {
    const parsed = JSON.parse(decoder.decode(file.bytes)) as unknown;
    if (!record(parsed)) return 0;
    return (
      parsed.version === STORY_PROJECT_VERSION &&
      typeof parsed.entrySceneId === "string" &&
      Array.isArray(parsed.scenes)
    )
      ? 1
      : 0;
  } catch {
    return 0;
  }
};

export const PROJECT_JSON_FORMAT: AltairFormatContribution =
  Object.freeze<AltairFormatContribution>({
    id: "project-json",
    name: "Altair project JSON",
    extensions: [".story.json", ".json"],
    mediaTypes: [
      "application/json",
      "application/vnd.haneoka.story-project+json",
    ],
    sniff(request) {
      abort(request.signal);
      return sniffProjectJson(entryFile(request.files, request.entryPath));
    },
    import(request) {
      abort(request.signal);
      const imported = importStoryProjectJson(
        entryFile(request.files, request.entryPath).bytes,
      );
      abort(request.signal);
      return imported;
    },
    export(request) {
      abort(request.signal);
      const source = serializeStoryProjectJson(request.project, {
        pretty: booleanOption(request.options, "pretty") ?? true,
      });
      abort(request.signal);
      return {
        artifacts: [
          {
            path: request.entryPath ?? "story.story.json",
            bytes: encoder.encode(source),
            mediaType: "application/vnd.haneoka.story-project+json",
          },
        ],
        diagnostics: [],
      };
    },
  });

export const ADV_JSON_FORMAT: AltairFormatContribution =
  Object.freeze<AltairFormatContribution>({
  id: "adv-json",
  name: "ADV JSON",
  extensions: [".adv.json", ".json"],
  mediaTypes: ["application/json", "application/vnd.haneoka.adv+json"],
  sniff(request) {
    abort(request.signal);
    return sniffAdvJson(entryFile(request.files, request.entryPath));
  },
  import(request) {
    abort(request.signal);
    const imported = importAdvStoryJson(
      entryFile(request.files, request.entryPath).bytes,
      importOptions(request.options),
    );
    abort(request.signal);
    return {
      format: "adv-json",
      project: imported.project,
      diagnostics: imported.diagnostics,
    };
  },
  export(request) {
    abort(request.signal);
    const source = serializeAdvStoryJson(
      request.project,
      serializeOptions(request.options),
    );
    abort(request.signal);
    return {
      artifacts: [
        {
          path: request.entryPath ?? "story.adv.json",
          bytes: encoder.encode(source),
          mediaType: "application/json",
        },
      ],
      diagnostics: [],
    };
  },
  });
