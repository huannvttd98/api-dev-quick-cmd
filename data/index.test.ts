import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories";
import { loadCommands } from "./index";

const commands = loadCommands();
const knownCategoryIds = new Set(CATEGORIES.map((c) => c.id));

describe("data integrity", () => {
  it("loads at least one command", () => {
    expect(commands.length).toBeGreaterThan(0);
  });

  it("all ids are unique", () => {
    const ids = commands.map((c) => c.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });

  it("every command has a known category", () => {
    const unknown = commands.filter((c) => !knownCategoryIds.has(c.category));
    expect(unknown).toEqual([]);
  });

  it("every command id starts with its category", () => {
    const mismatched = commands.filter(
      (c) => !c.id.startsWith(`${c.category}.`),
    );
    expect(mismatched).toEqual([]);
  });

  it("placeholder keys match {{key}} tokens in command", () => {
    for (const c of commands) {
      if (!c.placeholders) continue;
      for (const p of c.placeholders) {
        expect(c.command).toContain(`{{${p.key}}}`);
      }
    }
  });

  it("every {{token}} in command has a matching placeholder definition", () => {
    for (const c of commands) {
      const tokens = [...c.command.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      const declared = new Set((c.placeholders ?? []).map((p) => p.key));
      const missing = tokens.filter((t) => !declared.has(t));
      expect(missing, `command ${c.id} has undeclared tokens: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("has commands for all seeded categories", () => {
    const cats = new Set(commands.map((c) => c.category));
    for (const cat of knownCategoryIds) {
      expect(cats.has(cat), `missing commands for category: ${cat}`).toBe(true);
    }
  });

  it("step commands don't reference undeclared placeholders", () => {
    for (const c of commands) {
      if (!c.steps) continue;
      const declared = new Set((c.placeholders ?? []).map((p) => p.key));
      for (const step of c.steps) {
        if (!step.command) continue;
        const tokens = [...step.command.matchAll(/\{\{(\w+)\}\}/g)].map(
          (m) => m[1],
        );
        const missing = tokens.filter((t) => !declared.has(t));
        expect(
          missing,
          `${c.id} step "${step.title}" has undeclared tokens: ${missing.join(", ")}`,
        ).toEqual([]);
      }
    }
  });

  it("has at least 100 commands total", () => {
    expect(commands.length).toBeGreaterThanOrEqual(100);
  });
});
