export type CategoryId =
  | "git"
  | "docker"
  | "laravel"
  | "linux"
  | "mysql"
  | "nginx"
  | "node"
  | "ssh"
  | "recipes";

export interface Placeholder {
  key: string;
  hint: string;
  default?: string;
}

export interface CommandStep {
  title: string;
  command?: string;
  description?: string;
}

export interface Command {
  id: string;
  category: CategoryId;
  title: string;
  command: string;
  description?: string;
  tags?: string[];
  placeholders?: Placeholder[];
  docs?: string;
  examples?: string[];
  steps?: CommandStep[];
}

export interface CategoryDataset {
  category: CategoryId;
  commands: Omit<Command, "category">[];
}

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
}
