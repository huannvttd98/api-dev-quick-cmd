# Data Schema

## Type definitions

```ts
// src/types.ts

export type CategoryId =
  | "git"
  | "docker"
  | "laravel"
  | "linux"
  | "mysql"
  | "nginx"
  | "node"
  | "ssh";

export interface Command {
  id: string;            // unique slug, ví dụ "git.pull-origin-main"
  category: CategoryId;
  title: string;         // hiển thị trong popup, ví dụ "Pull from origin main"
  command: string;       // câu lệnh copy vào clipboard
  description?: string;  // giải thích ngắn (1 dòng)
  tags?: string[];       // keyword cho search, ví dụ ["sync", "remote"]
  placeholders?: Placeholder[]; // nếu có biến cần thay
}

export interface Placeholder {
  key: string;           // ví dụ "branch"
  hint: string;          // ví dụ "Tên branch"
  default?: string;      // giá trị gợi ý
}

export interface Category {
  id: CategoryId;
  label: string;         // "Git", "Docker", ...
  emoji: string;         // ví dụ "🌿" cho git
}

export interface HistoryEntry {
  id: string;            // Command.id
  usedAt: number;        // Date.now()
}
```

## Ví dụ JSON

### `src/data/git.json`

```json
{
  "category": "git",
  "commands": [
    {
      "id": "git.status",
      "title": "Status",
      "command": "git status",
      "description": "Xem trạng thái working tree",
      "tags": ["check", "diff"]
    },
    {
      "id": "git.pull-origin",
      "title": "Pull from origin",
      "command": "git pull origin {{branch}}",
      "description": "Kéo code từ remote",
      "tags": ["sync", "remote"],
      "placeholders": [
        { "key": "branch", "hint": "Tên branch", "default": "main" }
      ]
    },
    {
      "id": "git.new-branch",
      "title": "Create & switch to new branch",
      "command": "git checkout -b {{name}}",
      "placeholders": [
        { "key": "name", "hint": "Tên branch mới" }
      ]
    }
  ]
}
```

## Categories master list

```ts
// src/data/categories.ts
export const CATEGORIES: Category[] = [
  { id: "git",     label: "Git",      emoji: "🌿" },
  { id: "docker",  label: "Docker",   emoji: "🐳" },
  { id: "laravel", label: "Laravel",  emoji: "🚀" },
  { id: "linux",   label: "Linux",    emoji: "🐧" },
  { id: "mysql",   label: "MySQL",    emoji: "🗄️" },
  { id: "nginx",   label: "Nginx",    emoji: "🌐" },
  { id: "node",    label: "Node.js",  emoji: "📦" },
  { id: "ssh",     label: "SSH/SCP",  emoji: "🔑" }
];
```

## Quy ước data

- **ID** phải unique toàn cục, format `{category}.{slug-kebab-case}`
- **Title** viết ngắn gọn, dùng câu lệnh tự nhiên (tiếng Anh)
- **Description** optional, chỉ thêm khi lệnh không hiển nhiên
- **Placeholders** dùng cú pháp `{{key}}` trong `command`
  - Khi user chọn lệnh có placeholder → popup hiện input nhỏ để nhập giá trị, rồi mới copy
  - Nếu user nhấn `Ctrl+Enter` → copy nguyên bản `{{key}}` (để dev tự sửa sau)
- **Tags** để tăng khả năng fuzzy search — ghi keyword dev hay nghĩ đến

## Storage keys (chrome.storage)

| Key | Storage | Kiểu | Ghi chú |
|---|---|---|---|
| `favorites` | `sync` | `string[]` | Mảng `Command.id`, sync qua Google account |
| `history` | `local` | `HistoryEntry[]` | Max 50 item, sort mới nhất trước |
| `settings` | `sync` | `Settings` | theme, defaultTab, etc |

```ts
interface Settings {
  theme: "light" | "dark" | "system";
  defaultTab: "all" | "favorites" | "recent" | CategoryId;
  showDescription: boolean;
}
```

## Search behavior

- **Fuzzy match** trên các field: `title`, `command`, `description`, `tags`
- Ưu tiên thứ tự: exact match `command` > prefix `title` > fuzzy anywhere
- Gợi ý thư viện: [`fuse.js`](https://www.fusejs.io/) — nhỏ (~12KB), không có dep
- Nếu muốn zero-dep thì tự viết hàm scoring đơn giản
