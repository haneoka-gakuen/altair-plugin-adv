import {
  ADV_COMMAND,
  COMMAND_DESCRIPTORS,
  commandDescriptor,
  commandFieldDescriptors,
  createStoryCommand,
  replaceStoryCommandFieldValue,
  replaceStoryLocalizedTextForEditor,
  storyCommandFieldValue,
  storyLocalizedTextForEditor,
  storyNumberFromInput,
  storyNumberInputValue,
  storyTargetNameForEditor,
  storyTargetNameFromEditor,
  storyTargetNames,
  summarizeStoryCommand,
  type CommandDescriptor,
} from "./commands.js";
import { compileStoryProject, compileStoryProjectWithDiagnostics } from "./compiler.js";
import { defineAltairService } from "@haneoka/altair/plugins";
import {
  importAdvEpisodeJson,
  importAdvStoryJson,
  parseAdvEpisodeJson,
  parseAdvStoryJson,
  reconcileAdvEpisodeCommandWithCatalog,
  replaceStoryCommandNativeValue,
  serializeAdvEpisodeJson,
  serializeAdvStoryJson,
  storyCommandAdvCodecFields,
  storyCommandNativeValue,
} from "./adv-json.js";
import { ADV_JSON_FORMAT, PROJECT_JSON_FORMAT } from "./format.js";
import { stringifyStoryJson } from "./json.js";
import { importStoryProjectJson, parseStoryProjectJson, serializeStoryProjectJson } from "./project-json.js";
import { advResourceFieldPatch, createAdvResourceCommand, registerAdvResource } from "./resource-authoring.js";
import { storyResourceAliases } from "./resources.js";
import { assertValidStoryProject, validateStoryProject } from "./validation.js";

export interface AltairAdvService {
  /** Stable native and portable ADV opcode table. */
  readonly opcodes: typeof ADV_COMMAND;
  readonly commands: readonly CommandDescriptor[];
  readonly formats: {
    readonly advJson: typeof ADV_JSON_FORMAT;
    readonly projectJson: typeof PROJECT_JSON_FORMAT;
  };
  readonly commandDescriptor: typeof commandDescriptor;
  readonly commandFieldDescriptors: typeof commandFieldDescriptors;
  readonly createStoryCommand: typeof createStoryCommand;
  readonly summarizeStoryCommand: typeof summarizeStoryCommand;
  readonly storyCommandFieldValue: typeof storyCommandFieldValue;
  readonly replaceStoryCommandFieldValue: typeof replaceStoryCommandFieldValue;
  readonly storyLocalizedTextForEditor: typeof storyLocalizedTextForEditor;
  readonly replaceStoryLocalizedTextForEditor: typeof replaceStoryLocalizedTextForEditor;
  readonly storyNumberInputValue: typeof storyNumberInputValue;
  readonly storyNumberFromInput: typeof storyNumberFromInput;
  readonly storyTargetNames: typeof storyTargetNames;
  readonly storyTargetNameForEditor: typeof storyTargetNameForEditor;
  readonly storyTargetNameFromEditor: typeof storyTargetNameFromEditor;
  readonly compileStoryProject: typeof compileStoryProject;
  readonly compileStoryProjectWithDiagnostics: typeof compileStoryProjectWithDiagnostics;
  /** Backward-compatible shorthand for compilation with diagnostics. */
  readonly compile: typeof compileStoryProjectWithDiagnostics;
  readonly validateStoryProject: typeof validateStoryProject;
  readonly assertValidStoryProject: typeof assertValidStoryProject;
  readonly parseAdvStoryJson: typeof parseAdvStoryJson;
  readonly parseAdvEpisodeJson: typeof parseAdvEpisodeJson;
  readonly importAdvStoryJson: typeof importAdvStoryJson;
  readonly importAdvEpisodeJson: typeof importAdvEpisodeJson;
  readonly serializeAdvStoryJson: typeof serializeAdvStoryJson;
  readonly serializeAdvEpisodeJson: typeof serializeAdvEpisodeJson;
  readonly parseStoryProjectJson: typeof parseStoryProjectJson;
  readonly importStoryProjectJson: typeof importStoryProjectJson;
  readonly serializeStoryProjectJson: typeof serializeStoryProjectJson;
  readonly stringifyStoryJson: typeof stringifyStoryJson;
  readonly reconcileAdvEpisodeCommandWithCatalog: typeof reconcileAdvEpisodeCommandWithCatalog;
  readonly storyCommandNativeValue: typeof storyCommandNativeValue;
  readonly replaceStoryCommandNativeValue: typeof replaceStoryCommandNativeValue;
  readonly storyCommandAdvCodecFields: typeof storyCommandAdvCodecFields;
  readonly createAdvResourceCommand: typeof createAdvResourceCommand;
  readonly registerAdvResource: typeof registerAdvResource;
  readonly advResourceFieldPatch: typeof advResourceFieldPatch;
  readonly storyResourceAliases: typeof storyResourceAliases;
}

export const ALTAIR_ADV_SERVICE = defineAltairService<AltairAdvService>("haneoka.altair.adv");

export const altairAdvService: AltairAdvService = Object.freeze({
  opcodes: ADV_COMMAND,
  commands: COMMAND_DESCRIPTORS,
  formats: Object.freeze({
    advJson: ADV_JSON_FORMAT,
    projectJson: PROJECT_JSON_FORMAT,
  }),
  commandDescriptor,
  commandFieldDescriptors,
  createStoryCommand,
  summarizeStoryCommand,
  storyCommandFieldValue,
  replaceStoryCommandFieldValue,
  storyLocalizedTextForEditor,
  replaceStoryLocalizedTextForEditor,
  storyNumberInputValue,
  storyNumberFromInput,
  storyTargetNames,
  storyTargetNameForEditor,
  storyTargetNameFromEditor,
  compileStoryProject,
  compileStoryProjectWithDiagnostics,
  compile: compileStoryProjectWithDiagnostics,
  validateStoryProject,
  assertValidStoryProject,
  parseAdvStoryJson,
  parseAdvEpisodeJson,
  importAdvStoryJson,
  importAdvEpisodeJson,
  serializeAdvStoryJson,
  serializeAdvEpisodeJson,
  parseStoryProjectJson,
  importStoryProjectJson,
  serializeStoryProjectJson,
  stringifyStoryJson,
  reconcileAdvEpisodeCommandWithCatalog,
  storyCommandNativeValue,
  replaceStoryCommandNativeValue,
  storyCommandAdvCodecFields,
  createAdvResourceCommand,
  registerAdvResource,
  advResourceFieldPatch,
  storyResourceAliases,
});
