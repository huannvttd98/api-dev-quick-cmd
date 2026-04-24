import apacheData from "../../data/apache.json" with { type: "json" };
import dockerData from "../../data/docker.json" with { type: "json" };
import gitData from "../../data/git.json" with { type: "json" };
import laravelData from "../../data/laravel.json" with { type: "json" };
import linuxData from "../../data/linux.json" with { type: "json" };
import mysqlData from "../../data/mysql.json" with { type: "json" };
import nginxData from "../../data/nginx.json" with { type: "json" };
import nodeData from "../../data/node.json" with { type: "json" };
import recipesData from "../../data/recipes.json" with { type: "json" };
import sshData from "../../data/ssh.json" with { type: "json" };
import type { Category, CategoryDataset, Command } from "./types.js";

const DATASETS: CategoryDataset[] = [
  gitData as CategoryDataset,
  apacheData as CategoryDataset,
  dockerData as CategoryDataset,
  laravelData as CategoryDataset,
  linuxData as CategoryDataset,
  mysqlData as CategoryDataset,
  nginxData as CategoryDataset,
  nodeData as CategoryDataset,
  sshData as CategoryDataset,
  recipesData as CategoryDataset,
];

export const CATEGORIES: Category[] = [
  { id: "git", label: "Git", emoji: "🌿" },
  { id: "apache", label: "Apache", emoji: "🪶" },
  { id: "docker", label: "Docker", emoji: "🐳" },
  { id: "laravel", label: "Laravel", emoji: "🚀" },
  { id: "linux", label: "Linux", emoji: "🐧" },
  { id: "mysql", label: "MySQL", emoji: "🗄️" },
  { id: "nginx", label: "Nginx", emoji: "🌐" },
  { id: "node", label: "Node.js", emoji: "📦" },
  { id: "ssh", label: "SSH/SCP", emoji: "🔑" },
  { id: "recipes", label: "Recipes", emoji: "📖" },
];

export function loadCommands(): Command[] {
  return DATASETS.flatMap((dataset) =>
    dataset.commands.map((cmd) => ({
      ...cmd,
      category: dataset.category,
    })),
  );
}

export const ALL_COMMANDS = loadCommands();

export const COMMAND_BY_ID = new Map(ALL_COMMANDS.map((cmd) => [cmd.id, cmd]));
