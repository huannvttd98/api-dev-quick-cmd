import type { CategoryDataset, Command } from "../types";
import apacheData from "./apache.json";
import dockerData from "./docker.json";
import gitData from "./git.json";
import laravelData from "./laravel.json";
import linuxData from "./linux.json";
import mysqlData from "./mysql.json";
import nginxData from "./nginx.json";
import nodeData from "./node.json";
import recipesData from "./recipes.json";
import sshData from "./ssh.json";

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

export function loadCommands(): Command[] {
  return DATASETS.flatMap((dataset) =>
    dataset.commands.map<Command>((cmd) => ({
      ...cmd,
      category: dataset.category,
    })),
  );
}

export function loadCommandsByCategory(): Map<string, Command[]> {
  const map = new Map<string, Command[]>();
  for (const cmd of loadCommands()) {
    const list = map.get(cmd.category) ?? [];
    list.push(cmd);
    map.set(cmd.category, list);
  }
  return map;
}
