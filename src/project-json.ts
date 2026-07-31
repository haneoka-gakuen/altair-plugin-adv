import type { JsonValue, StoryProject } from "@haneoka/altair/model";
import {
  jsonInput,
  stringifyStoryJson,
  type StoryImportResult,
} from "./json.js";
import type { StoryJsonSerializeOptions } from "./project-json-types.js";
import { assertValidStoryProject } from "./validation.js";

export type { StoryJsonSerializeOptions } from "./project-json-types.js";

/**
 * Parse the canonical Altair project envelope.
 *
 * The codec deliberately validates through the ADV plugin's semantic boundary
 * rather than importing Altair's retired authoring implementation.
 */
export const parseStoryProjectJson = (
  input: string | Uint8Array | unknown,
): StoryProject => {
  const value = jsonInput(input, "story project");
  assertValidStoryProject(value);
  return value;
};

export const importStoryProjectJson = (
  input: string | Uint8Array | unknown,
): StoryImportResult => ({
  format: "project-json",
  project: parseStoryProjectJson(input),
  diagnostics: [],
});

export const serializeStoryProjectJson = (
  project: StoryProject,
  options: StoryJsonSerializeOptions = {},
): string => {
  assertValidStoryProject(project);
  return stringifyStoryJson(
    project as unknown as JsonValue,
    options.pretty !== false,
  );
};
