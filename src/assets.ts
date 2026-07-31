import type { JsonObject, JsonValue, StoryProject } from "@haneoka/altair/model";
import type {
  AltairAssetProviderContribution,
  AltairResolvedAsset,
} from "@haneoka/altair/plugins";
import {
  storyResourceAliases,
  type StoryResourceKind,
} from "./resources.js";

const PROJECT_KEYS: Readonly<
  Record<StoryResourceKind, readonly string[]>
> = Object.freeze({
  background: ["backgrounds", "stages"],
  still: ["stills"],
  sound: ["sounds", "audio"],
  frame: ["frames"],
  effect: ["effects", "postEffects"],
  video: ["videos"],
  live2d: ["live2d", "characters"],
});

const REQUEST_KINDS: Readonly<Record<string, StoryResourceKind>> =
  Object.freeze({
    audio: "sound",
    background: "background",
    effect: "effect",
    frame: "frame",
    live2d: "live2d",
    sound: "sound",
    still: "still",
    video: "video",
  });

const record = (value: unknown): value is Record<string, JsonValue> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const entries = (value: JsonValue | undefined): Record<string, JsonValue>[] => {
  if (Array.isArray(value)) return value.filter(record);
  if (record(value)) return Object.values(value).filter(record);
  return [];
};

const stringField = (
  entry: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): string | undefined => {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const resourceKinds = (kind?: string): readonly StoryResourceKind[] => {
  const selected = kind ? REQUEST_KINDS[kind.toLowerCase()] : undefined;
  return selected
    ? [selected]
    : (Object.keys(PROJECT_KEYS) as StoryResourceKind[]);
};

export interface AdvProjectAssetMatch {
  readonly kind: StoryResourceKind;
  readonly entry: Readonly<Record<string, JsonValue>>;
}

export const findAdvProjectAsset = (
  project: StoryProject,
  reference: string,
  requestedKind?: string,
): AdvProjectAssetMatch | undefined => {
  const identity = reference.trim();
  for (const kind of resourceKinds(requestedKind)) {
    for (const projectKey of PROJECT_KEYS[kind]) {
      for (const entry of entries(project.assets[projectKey])) {
        if (storyResourceAliases(kind, entry).includes(identity)) {
          return { kind, entry };
        }
      }
    }
  }
  return undefined;
};

const resolvedAsset = (
  reference: string,
  match: AdvProjectAssetMatch,
): AltairResolvedAsset => {
  const source =
    stringField(match.entry, [
      "url",
      "runtimePath",
      "sourcePath",
      "resourceRef",
      "assetName",
      "id",
    ]) ?? reference;
  const mediaType = stringField(match.entry, ["mediaType", "mimeType"]);
  return {
    id:
      stringField(match.entry, [
        "id",
        "assetId",
        "resourceRef",
        "assetName",
      ]) ?? reference,
    source,
    ...(mediaType === undefined ? {} : { mediaType }),
    metadata: { kind: match.kind },
  };
};

export const ADV_PROJECT_ASSET_PROVIDER: AltairAssetProviderContribution =
  Object.freeze<AltairAssetProviderContribution>({
    id: "adv-project-assets",
    name: "ADV project assets",
    supports: ({ project, reference, kind }) =>
      findAdvProjectAsset(project, reference, kind) ? 1 : 0,
    resolve: ({ project, reference, kind }) => {
      const match = findAdvProjectAsset(project, reference, kind);
      return match ? resolvedAsset(reference, match) : undefined;
    },
  });
