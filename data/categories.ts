import type { Category } from "../types";

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

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);
