import type { Command } from "./types.js";

interface SearchResult {
  command: Command;
  score: number;
}

function scoreCommand(command: Command, query: string): number {
  const q = query.toLowerCase();
  const title = command.title.toLowerCase();
  const cli = command.command.toLowerCase();
  const description = (command.description ?? "").toLowerCase();
  const tags = (command.tags ?? []).join(" ").toLowerCase();

  if (cli === q || title === q) return 100;
  if (cli.startsWith(q)) return 90;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 70;
  if (cli.includes(q)) return 60;
  if (tags.includes(q)) return 50;
  if (description.includes(q)) return 40;
  return 0;
}

export function searchCommands(commands: Command[], query: string, limit: number): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return commands.slice(0, limit).map((command) => ({ command, score: 1 }));
  }

  return commands
    .map((command) => ({ command, score: scoreCommand(command, trimmed) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.command.id.localeCompare(b.command.id);
    })
    .slice(0, limit);
}
