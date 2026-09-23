import {
  cloneStoryValue,
  type AltairProjectDocument,
  type JsonObject,
  type JsonValue,
} from "@haneoka/altair/documents";
import { findAdvProjectAsset } from "./assets.js";

const record = (value: JsonValue | undefined): JsonObject | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
const bindings = [
  ["backgroundRef", "background", "background"],
  ["stillRef", "still", "still"],
  ["bgmRef", "bgm", "sound"],
  ["seRef", "se", "sound"],
  ["frameRef", "frame", "frame"],
  ["effectRef", "effect", "effect"],
  ["videoRef", "video", "video"],
  ["live2dKey", "characterModel", "live2d"],
] as const;
function directResource(reference: string, kind: string): JsonObject | undefined {
  const path = reference.split(/[?#]/u)[0] ?? reference;
  const image = /\.(?:png|jpe?g|webp|avif|gif|svg)$/iu.test(path);
  if ((kind === "background" || kind === "still" || kind === "frame") && image)
    return { url: reference, ...(kind === "frame" ? { texture: reference } : {}) };
  if (
    (kind === "sound" && /\.(?:ogg|mp3|wav|flac|m4a|aac|opus|webm)$/iu.test(path)) ||
    (kind === "video" && /\.(?:mp4|webm|m4v|mov|ogv)$/iu.test(path))
  )
    return { url: reference, playableUrl: reference };
  if (kind === "live2d") {
    if (/\.model\.ya?ml$/iu.test(path) || /(?:^|\/)model\.ya?ml$/iu.test(path) || /\.(jsonl|wmdl)$/iu.test(path))
      return {
        runtime: { format: "composite", model: reference },
        profile: { placement: { anchor: "stage", align: [0.5, 1] } },
      };
    if (/\.gif$/iu.test(path)) return { runtime: { format: "gif", imageUrl: reference } };
    if (/\.(mp4|webm|m4v|mov|ogv)$/iu.test(path)) return { runtime: { format: "video", imageUrl: reference } };
    if (image) return { runtime: { format: "static-portrait", imageUrl: reference } };
    if (/\.model3?\.json$/iu.test(path))
      return { runtime: { format: /\.model3\.json$/iu.test(path) ? "cubism3" : "cubism2", model: reference } };
  }
  return undefined;
}
export function resolveAdvDocumentResources(fields: JsonObject, project: AltairProjectDocument): JsonObject {
  const result = { ...fields };
  const resolve = (reference: JsonValue | undefined, kind: string): JsonObject | undefined => {
    if (typeof reference !== "string" || !reference.trim()) return undefined;
    const match = findAdvProjectAsset(project, reference, kind);
    const value = match ? cloneStoryValue(match.entry) : directResource(reference, kind);
    if (value && typeof value.source === "string" && value.source) {
      if (["background", "still", "frame"].includes(kind) && !value.url) value.url = value.source;
      if (["sound", "video"].includes(kind) && !value.playableUrl) value.playableUrl = value.source;
      if (kind === "live2d" && !value.runtime) {
        const portable = directResource(value.source, kind);
        if (portable?.runtime) value.runtime = portable.runtime;
      }
    }
    if (value && kind === "background") {
      const stageKey = typeof value.stageRef === "string" ? value.stageRef : reference;
      const stage = record(record(project.runtime.stages)?.[stageKey]);
      if (stage) {
        const effects = record(project.runtime.postEffects);
        value.stage = {
          ...cloneStoryValue(stage),
          ...(Array.isArray(stage.environmentPostEffectRefs)
            ? {
                environmentPostEffects: stage.environmentPostEffectRefs.flatMap((key) =>
                  typeof key === "string" && effects?.[key] ? [cloneStoryValue(effects[key]!)] : [],
                ),
              }
            : {}),
        };
      }
    }
    return value;
  };
  for (const [key, target, kind] of bindings) {
    if (!Object.hasOwn(fields, key) || !fields[key]) continue;
    const resource = resolve(fields[key], kind);
    if (!resource) continue;
    if (kind === "live2d" && !record(resource.runtime)) result.live2d = resource;
    else {
      const previous = record(result[target]);
      result[target] = {
        ...previous,
        ...resource,
        ...(kind === "live2d" && previous?.profile ? { profile: previous.profile } : {}),
      };
    }
    // Existing player formats may still use the key as a model identity.
    if (key !== "live2dKey") delete result[key];
  }
  if (Array.isArray(fields.voiceRefs)) {
    const voices = Array.isArray(fields.voices) ? fields.voices : [];
    result.voices = fields.voiceRefs.map((reference, index) => {
      const previous = record(voices[index]),
        resource = resolve(reference, "sound");
      return resource ? { ...previous, ...resource } : (previous ?? null);
    });
  }
  if (typeof fields.postEffectRef === "string") {
    const effect = record(project.runtime.postEffects)?.[fields.postEffectRef];
    if (effect) {
      result.postEffect = cloneStoryValue(effect);
      delete result.postEffectRef;
    }
  }
  return result;
}
