import {
  cloneStoryValue,
  type JsonObject,
  type JsonValue,
  type StoryProject,
  type StoryProjectCommand,
} from "@haneoka/altair/model";
import { ADV_COMMAND, createStoryCommand } from "./commands.js";
import { storyResourceAliases, type StoryResourceKind } from "./resources.js";

export type AltairAdvVisualResourceKind = "background" | "still" | "frame" | "effect" | "post-effect" | "video";

export type AltairAdvAudioUsage = "bgm" | "se" | "voice";

export type AltairAdvResourceInsert =
  | {
      readonly kind: "live2d";
      readonly key: string;
      readonly value: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: AltairAdvVisualResourceKind;
      readonly key: string;
      readonly value: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: "audio";
      readonly usage: AltairAdvAudioUsage;
      readonly key: string;
      readonly value: Readonly<Record<string, unknown>>;
    };

const resourceKey = (resource: AltairAdvResourceInsert): string => {
  const key = String(resource.key || "").trim();
  if (!key) throw new TypeError("ADV resource insert requires a key");
  return key;
};

const resourceObject = (resource: AltairAdvResourceInsert): JsonObject => {
  if (!resource.value || typeof resource.value !== "object" || Array.isArray(resource.value)) {
    throw new TypeError(`ADV resource '${resourceKey(resource)}' requires an object value`);
  }
  return cloneStoryValue(resource.value) as JsonObject;
};

const jsonObjects = (value: JsonValue | undefined): JsonObject[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is JsonObject =>
      Boolean(entry && typeof entry === "object" && !Array.isArray(entry)),
    );
  }
  if (value && typeof value === "object") {
    return Object.values(value).filter((entry): entry is JsonObject =>
      Boolean(entry && typeof entry === "object" && !Array.isArray(entry)),
    );
  }
  return [];
};

const recordValue = (value: JsonValue | undefined): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const replaceResource = (
  items: JsonObject[],
  value: JsonObject,
  kind: StoryResourceKind,
  authoredReference: string,
): void => {
  const identities = new Set([...storyResourceAliases(kind, value), authoredReference].filter(Boolean));
  const index = items.findIndex((item) => storyResourceAliases(kind, item).some((alias) => identities.has(alias)));
  if (index < 0) items.push(cloneStoryValue(value));
  else items[index] = cloneStoryValue(value);
};

/**
 * Creates the native ADV command associated with a portable authoring resource.
 * Hosts provide resource data; opcode selection remains owned by this plugin.
 */
export const createAdvResourceCommand = (resource: AltairAdvResourceInsert): StoryProjectCommand => {
  const key = resourceKey(resource);
  if (resource.kind === "live2d") {
    return createStoryCommand(ADV_COMMAND.Character, {
      targetName: String(resource.value.characterKey || resource.value.live2dKey || key),
      live2dKey: key,
      targetAssetIndex: 0,
      positionType: 5,
    });
  }
  if (resource.kind === "background") {
    return createStoryCommand(ADV_COMMAND.Stage, {
      backgroundRef: key,
      duration: 0.3,
    });
  }
  if (resource.kind === "still") {
    return createStoryCommand(ADV_COMMAND.Still, {
      stillRef: key,
      duration: 0.3,
    });
  }
  if (resource.kind === "frame") {
    return createStoryCommand(ADV_COMMAND.Frame, {
      frameName: String(resource.value.name || key),
      frameRef: key,
    });
  }
  if (resource.kind === "effect") {
    return createStoryCommand(ADV_COMMAND.Effect, {
      targetName: key,
      effectRef: key,
    });
  }
  if (resource.kind === "post-effect") {
    return createStoryCommand(ADV_COMMAND.PostEffect, {
      postEffectRef: key,
    });
  }
  if (resource.kind === "video") {
    return createStoryCommand(ADV_COMMAND.Movie, {
      videoRef: key,
    });
  }
  if (resource.kind !== "audio") {
    throw new TypeError(`Unsupported ADV resource kind: ${resource.kind}`);
  }
  return createStoryCommand(
    resource.usage === "bgm" ? ADV_COMMAND.Bgm : resource.usage === "voice" ? ADV_COMMAND.Voice : ADV_COMMAND.Se,
    resource.usage === "bgm" ? { bgmRef: key } : resource.usage === "voice" ? { voiceRefs: [key] } : { seRef: key },
  );
};

/**
 * Registers or replaces one resource in the project asset/runtime structures.
 * This mutates the supplied draft so history plugins can keep the operation
 * atomic with the command insertion or field assignment that triggered it.
 */
export const registerAdvResource = (project: StoryProject, resource: AltairAdvResourceInsert): void => {
  const key = resourceKey(resource);
  const importedValue = resourceObject(resource);
  const value: JsonObject =
    resource.kind === "post-effect" || importedValue.resourceRef
      ? importedValue
      : { ...importedValue, resourceRef: key };
  if (resource.kind === "effect" && value.runtimeAvailable === false) {
    throw new TypeError(`Effect resource is unavailable: ${key}`);
  }
  if (resource.kind === "live2d") {
    const items = jsonObjects(project.assets.live2d);
    replaceResource(items, value, "live2d", key);
    project.assets.live2d = items;
    return;
  }
  if (resource.kind === "background") {
    const { stage, postEffects, ...background } = value;
    const items = jsonObjects(project.assets.backgrounds);
    replaceResource(items, background, "background", key);
    project.assets.backgrounds = items;
    if (stage && typeof stage === "object" && !Array.isArray(stage)) {
      project.runtime.stages = {
        ...recordValue(project.runtime.stages),
        [key]: cloneStoryValue(stage),
      };
    }
    if (postEffects && typeof postEffects === "object" && !Array.isArray(postEffects)) {
      project.runtime.postEffects = {
        ...recordValue(project.runtime.postEffects),
        ...cloneStoryValue(postEffects),
      };
    }
    return;
  }
  if (resource.kind === "still") {
    const items = jsonObjects(project.assets.stills);
    replaceResource(items, value, "still", key);
    project.assets.stills = items;
    return;
  }
  if (resource.kind === "frame") {
    const items = jsonObjects(project.assets.frames);
    replaceResource(items, value, "frame", key);
    project.assets.frames = items;
    return;
  }
  if (resource.kind === "effect") {
    const items = jsonObjects(project.assets.effects);
    replaceResource(items, value, "effect", key);
    project.assets.effects = items;
    return;
  }
  if (resource.kind === "post-effect") {
    const profile = value.profile;
    project.runtime.postEffects = {
      ...recordValue(project.runtime.postEffects),
      [key]: profile && typeof profile === "object" && !Array.isArray(profile) ? cloneStoryValue(profile) : value,
    };
    return;
  }
  if (resource.kind === "video") {
    const items = jsonObjects(project.assets.videos);
    replaceResource(items, value, "video", key);
    project.assets.videos = items;
    return;
  }
  const items = jsonObjects(project.assets.sounds);
  replaceResource(items, value, "sound", key);
  project.assets.sounds = items;
};

/** Fields that must accompany a resource assignment on an existing command. */
export const advResourceFieldPatch = (resource: AltairAdvResourceInsert): JsonObject => {
  const key = resourceKey(resource);
  if (resource.kind === "live2d") return { live2dKey: key };
  if (resource.kind === "background") return { backgroundRef: key };
  if (resource.kind === "still") return { stillRef: key };
  if (resource.kind === "frame") return { frameRef: key };
  if (resource.kind === "effect") {
    return { effectRef: key, targetName: key };
  }
  if (resource.kind === "post-effect") return { postEffectRef: key };
  if (resource.kind === "video") return { videoRef: key };
  if (resource.kind !== "audio") {
    throw new TypeError(`Unsupported ADV resource kind: ${resource.kind}`);
  }
  if (resource.usage === "bgm") return { bgmRef: key };
  if (resource.usage === "voice") return { voiceRefs: [key] };
  return { seRef: key };
};
