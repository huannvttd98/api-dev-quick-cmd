import { CATEGORIES } from "./catalog.js";
import type { CategoryDataset, Command } from "./types.js";

const categoryIdSet = new Set(CATEGORIES.map((category) => category.id));

function normalizeCommand(raw: unknown): Omit<Command, "category"> {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("Each command must be an object");
  }

  const command = raw as Partial<Omit<Command, "category">>;
  if (!command.id || typeof command.id !== "string") {
    throw new TypeError("Command id is required and must be string");
  }

  if (!command.title || typeof command.title !== "string") {
    throw new TypeError(`Command '${command.id}' title is required`);
  }

  if (!command.command || typeof command.command !== "string") {
    throw new TypeError(`Command '${command.id}' command is required`);
  }

  return {
    id: command.id,
    title: command.title,
    command: command.command,
    description: typeof command.description === "string" ? command.description : undefined,
    docs: typeof command.docs === "string" ? command.docs : undefined,
    tags: Array.isArray(command.tags) ? command.tags.filter((tag) => typeof tag === "string") : undefined,
    placeholders: Array.isArray(command.placeholders) ? command.placeholders : undefined,
    examples: Array.isArray(command.examples)
      ? command.examples.filter((example) => typeof example === "string")
      : undefined,
    steps: Array.isArray(command.steps) ? command.steps : undefined,
  };
}

export function parseCategoryDataset(raw: unknown): CategoryDataset {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("JSON must be an object");
  }

  const parsed = raw as Partial<CategoryDataset>;
  if (!parsed.category || typeof parsed.category !== "string") {
    throw new TypeError("Field 'category' is required and must be string");
  }

  if (!categoryIdSet.has(parsed.category)) {
    throw new RangeError(`Unsupported category '${parsed.category}'`);
  }

  if (!Array.isArray(parsed.commands)) {
    throw new TypeError("Field 'commands' is required and must be array");
  }

  return {
    category: parsed.category,
    commands: parsed.commands.map((item) => normalizeCommand(item)),
  };
}