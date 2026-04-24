# Architecture

## Cấu trúc thư mục

```
dev-quick-cmd/
├── docs/                     # Tài liệu plan (thư mục này)
├── public/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
├── src/
│   ├── manifest.ts           # Generate manifest.json qua @crxjs
│   ├── background/
│   │   └── service-worker.ts # Xử lý omnibox, context menu, commands
│   ├── popup/
│   │   ├── index.html        # Entry HTML cho popup
│   │   ├── main.tsx          # React root
│   │   ├── App.tsx           # Root component
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── CommandList.tsx
│   │   │   ├── CommandItem.tsx
│   │   │   ├── CategoryTabs.tsx
│   │   │   └── EmptyState.tsx
│   │   └── hooks/
│   │       ├── useCommands.ts    # Load & filter commands
│   │       ├── useFavorites.ts   # Wrap chrome.storage.sync
│   │       ├── useHistory.ts     # Wrap chrome.storage.local
│   │       └── useClipboard.ts
│   ├── data/
│   │   ├── index.ts          # Load & merge tất cả JSON
│   │   ├── categories.ts     # Master list categories
│   │   ├── git.json
│   │   ├── docker.json
│   │   ├── laravel.json
│   │   ├── linux.json
│   │   ├── mysql.json
│   │   ├── nginx.json
│   │   ├── node.json
│   │   └── ssh.json
│   ├── lib/
│   │   ├── storage.ts        # Wrap chrome.storage API (promisified)
│   │   ├── search.ts         # Fuzzy search (vd dùng fuse.js hoặc tự viết)
│   │   └── clipboard.ts
│   ├── styles/
│   │   └── globals.css       # Tailwind base + custom
│   └── types.ts              # Shared types
├── package.json
├── tsconfig.json
├── vite.config.ts            # Config @crxjs/vite-plugin
├── tailwind.config.js
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Module boundaries

```
popup (React)
   │
   ├─→ hooks/*        ──→ lib/storage.ts  ──→ chrome.storage
   │                  └─→ lib/clipboard.ts ──→ navigator.clipboard
   │
   └─→ data/index.ts  (thuần JSON, không phụ thuộc chrome API)

background (service worker)
   │
   ├─→ chrome.omnibox       (gõ "cli" trong address bar)
   ├─→ chrome.contextMenus  (tuỳ chọn)
   └─→ chrome.commands      (phím tắt global)
        │
        └─→ lib/storage.ts, lib/clipboard.ts
```

**Quy tắc:**
- `data/` là pure data, không import `chrome`
- `lib/` là adapter layer cho Chrome API — thay được nếu sau port sang Firefox
- `popup/` và `background/` đều gọi `lib/`, không gọi trực tiếp `chrome.*`
- Shared types gom ở `src/types.ts`

## Manifest V3 (key fields)

```jsonc
{
  "manifest_version": 3,
  "name": "CLI Toolbox",
  "version": "1.0.0",
  "description": "Fast CLI command reference for developers",
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "permissions": ["storage"],
  "omnibox": { "keyword": "cli" },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+K",
        "mac": "Command+Shift+K"
      }
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

## Popup UI layout (phác thảo)

```
┌──────────────────────────────────────┐
│ 🔍 [ Search commands...          ]   │  ← SearchBar
├──────────────────────────────────────┤
│ [All] [Git] [Docker] [Laravel] [..]  │  ← CategoryTabs
├──────────────────────────────────────┤
│ ⭐ git status                         │  ← CommandItem (favorite)
│    Xem trạng thái working tree        │
│    └─ git status                  📋 │
├──────────────────────────────────────┤
│ 🕘 git pull origin main               │  ← CommandItem (recent)
│    └─ git pull origin {{branch}}  📋 │
├──────────────────────────────────────┤
│    git checkout -b <name>             │
│    └─ git checkout -b {{name}}    📋 │
└──────────────────────────────────────┘
        Width ~400px, Height ~500px
```
