import { resolveAdvDocumentResources } from "./document-resources.js";
import { VEGA_SYSTEM_OPCODE, VEGA_COMMAND_GROUP_OPCODE } from "@haneoka/vega-protocol";
import {
  type AltairDocumentRegistry,
  type AltairDocumentCommand,
  type AltairAuthoredNode,
  type AltairAuthoredWorkspace,
  type AltairSceneDocument,
  type StoryProject,
  type JsonObject,
  type JsonValue,
  type StoryProjectCommand,
} from "@haneoka/altair/documents";
import {
  COMMAND_DESCRIPTORS,
  createStoryCommand,
  storyCommandFieldValue,
  replaceStoryCommandFieldValue,
} from "./commands.js";
export const ALTAIR_ADV_DOCUMENT_PLUGIN = "haneoka.altair-adv";
export const ADV_TEXT_LOCALES = ["ja", "en", "zh-TW", "zh-CN", "ko"] as const;
export function normalizeAdvLocalizedText(
  value: JsonValue | undefined,
  order: readonly string[] = ADV_TEXT_LOCALES,
): JsonValue | undefined {
  if (!Array.isArray(value)) return value;
  if (value.length > order.length) throw new Error("A locale order is required for all positional translations");
  return Object.fromEntries(
    order.flatMap((locale, index) => (value[index] === undefined ? [] : [[locale, value[index]!]])),
  );
}
export const ADV_DOCUMENT_COMMANDS: readonly AltairDocumentCommand[] = COMMAND_DESCRIPTORS.map((descriptor) => ({
  type: { plugin: ALTAIR_ADV_DOCUMENT_PLUGIN, name: descriptor.name },
  schemaVersion: 1,
  lower(node, context) {
    let command = createStoryCommand(descriptor.name, (node.extensions?.fields as JsonObject) ?? {});
    for (const field of descriptor.fields)
      if (Object.hasOwn(node.arguments, field.key))
        command = {
          ...command,
          fields: replaceStoryCommandFieldValue(command.fields, field, node.arguments[field.key]),
        };
    return [
      {
        ...command,
        fields: resolveAdvDocumentResources(command.fields, context.project),
        extensions: { ...((node.extensions?.commandExtensions as JsonObject) ?? {}) },
      },
    ];
  },
}));
export function registerAdvDocumentCommands(registry: AltairDocumentRegistry): () => void {
  const releases = ADV_DOCUMENT_COMMANDS.map((definition) => registry.register(definition));
  return () => releases.forEach((release) => release());
}
export function advCommandToAuthoredNode(
  command: StoryProjectCommand,
  encode: (command: StoryProjectCommand) => AltairAuthoredNode = advCommandToAuthoredNode,
): AltairAuthoredNode {
  if (command.command === VEGA_SYSTEM_OPCODE.SetDialogueVisibility)
    return {
      id: command.id,
      type: { plugin: "haneoka.altair", name: "dialogue" },
      schemaVersion: 1,
      arguments: command.fields,
      extensions: { commandExtensions: command.extensions },
    };
  if (
    command.command === VEGA_COMMAND_GROUP_OPCODE &&
    command.fields.commandGroup &&
    typeof command.fields.commandGroup === "object" &&
    !Array.isArray(command.fields.commandGroup)
  ) {
    const group = command.fields.commandGroup,
      actions = Array.isArray(group.actions) ? group.actions : [],
      children: AltairAuthoredNode[] = [];
    const tracks = actions
      .map((value, index) => {
        if (
          !value ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          !value.command ||
          typeof value.command !== "object" ||
          Array.isArray(value.command)
        )
          throw new Error("Invalid timeline action");
        const { command: opcode, ...fields } = value.command,
          id = `${command.id}/action/${index}`;
        if (typeof opcode !== "number" || !Number.isSafeInteger(opcode) || opcode < 0)
          throw new Error("Invalid timeline opcode");
        const child = encode({ id, command: opcode, fields, extensions: {} });
        children.push(child);
        return { ...value, nodeId: id, command: undefined };
      })
      .map(({ command: _, ...track }) => track);
    const { actions: _, ...settings } = group;
    const { commandGroup: __, ...fields } = command.fields;
    return {
      id: command.id,
      type: { plugin: "haneoka.altair", name: "timeline" },
      schemaVersion: 1,
      arguments: { ...settings, tracks },
      children,
      extensions: { fields, commandExtensions: command.extensions },
    };
  }
  const descriptor = COMMAND_DESCRIPTORS.find((descriptor) => descriptor.code === command.command);
  if (!descriptor) throw new Error(`No stable command definition for opcode ${command.command}`);
  const args: JsonObject = {};
  let rest = { ...command.fields };
  for (const field of descriptor.fields) {
    let value = storyCommandFieldValue(command.fields, field);
    if (field.kind === "localized-text") value = normalizeAdvLocalizedText(value);
    else if (field.kind === "localized-list" && Array.isArray(value))
      value = value.map((entry) => normalizeAdvLocalizedText(entry) ?? null);
    if (value !== undefined) args[field.key] = value;
    rest = replaceStoryCommandFieldValue(rest, field, undefined);
  }
  if (command.source?.format === "webgal" && descriptor.name === "Character" && args.live2dKey === undefined) {
    const model = command.fields.characterModel;
    const runtime = model && typeof model === "object" && !Array.isArray(model) ? model.runtime : undefined;
    if (runtime && typeof runtime === "object" && !Array.isArray(runtime)) {
      const source = runtime.model ?? runtime.modelUrl ?? runtime.imageUrl;
      if (typeof source === "string") args.live2dKey = source;
    }
  }
  if (
    command.source?.format === "webgal" &&
    descriptor.name === "Talk" &&
    args.targetTextNames === undefined &&
    typeof command.fields.targetName === "string" &&
    command.fields.targetName
  )
    args.targetTextNames = [command.fields.targetName];
  return {
    id: command.id,
    type: { plugin: ALTAIR_ADV_DOCUMENT_PLUGIN, name: descriptor.name },
    schemaVersion: 1,
    arguments: args,
    extensions: { fields: rest, commandExtensions: command.extensions },
  };
}
export function storyProjectToAuthoredWorkspace(
  project: StoryProject,
  encode: (command: StoryProjectCommand) => AltairAuthoredNode = advCommandToAuthoredNode,
): AltairAuthoredWorkspace {
  const scenes: AltairSceneDocument[] = project.scenes.map((scene) => ({
    format: "scene",
    version: 1,
    id: scene.id,
    name: scene.name,
    nodes: scene.commands.map((command) => encode(command)),
    extensions: scene.extensions,
  }));
  const locales = new Set<string>();
  if (project.meta.locale) locales.add(project.meta.locale);
  const inspectText = (value: JsonValue | undefined) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [locale, text] of Object.entries(value)) {
      if (typeof text !== "string") continue;
      try {
        locales.add(Intl.getCanonicalLocales(locale)[0]!);
      } catch {}
    }
  };
  const inspect = (node: AltairAuthoredNode) => {
    if (node.type.plugin === ALTAIR_ADV_DOCUMENT_PLUGIN) {
      const definition = COMMAND_DESCRIPTORS.find((command) => command.name === node.type.name);
      for (const field of definition?.fields ?? []) {
        const value = node.arguments[field.key];
        if (field.kind === "localized-text") inspectText(value);
        else if (field.kind === "localized-list" && Array.isArray(value)) value.forEach(inspectText);
      }
    }
    node.children?.forEach(inspect);
  };
  scenes.forEach((scene) => scene.nodes.forEach(inspect));
  if (!locales.size) locales.add("und");
  const plugins = [...(project.plugins ?? [])];
  if (!plugins.some((plugin) => plugin.id === ALTAIR_ADV_DOCUMENT_PLUGIN))
    plugins.push({ id: ALTAIR_ADV_DOCUMENT_PLUGIN, version: "0.1.0" });
  return {
    project: {
      format: "project",
      version: 1,
      id: crypto.randomUUID(),
      title: project.meta.title || "Untitled",
      locales: [...locales],
      entry: { sceneId: project.entrySceneId },
      scenes: scenes.map((scene, index) => ({ id: scene.id, path: `scenes/scene${index + 1}.scene.yaml` })),
      plugins,
      assets: project.assets,
      runtime: project.runtime,
      extensions: { ...project.extensions, storyFields: project.storyFields },
    },
    scenes,
  };
}
