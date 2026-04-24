# Tech Stack

## Runtime & Language

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript | Type-safe, hạn chế bug lúc runtime |
| Manifest | Chrome Manifest V3 | Bắt buộc cho extension mới trên Chrome Web Store |
| UI framework | React 18 | Popup có state (search, favorites, tabs) — React gọn hơn vanilla |
| Styling | Tailwind CSS | Nhanh, tree-shake tốt, bundle nhỏ |

## Build & Tooling

| Tool | Mục đích |
|---|---|
| `vite` + `@crxjs/vite-plugin` | Dev server HMR cho Chrome extension, build production tối ưu |
| `typescript` | Compiler |
| `tailwindcss` + `postcss` + `autoprefixer` | Styling pipeline |
| `@types/chrome` | Type definitions cho `chrome.*` API |
| `vitest` | Unit test (data integrity, pure logic như fuzzy search) |
| `eslint` + `prettier` | Lint & format |

## Không dùng (có chủ đích)

- ❌ **Webpack** — `@crxjs/vite-plugin` nhanh và config nhẹ hơn
- ❌ **Redux / Zustand** — state popup đơn giản, `useState` + `useReducer` đủ
- ❌ **Backend / API** — MVP offline-first
- ❌ **IndexedDB** — `chrome.storage.local` đủ cho favorites/history
- ❌ **Service worker logic nặng** — chỉ dùng khi cần cho omnibox/context menu

## Storage

| Dữ liệu | Nơi lưu | Lý do |
|---|---|---|
| Danh sách commands | JSON trong `src/data/` | Tĩnh, đóng gói sẵn, versioned theo extension |
| Favorites | `chrome.storage.sync` | Sync qua tài khoản Google, max 100KB |
| History | `chrome.storage.local` | Không cần sync, max 10MB — đủ dùng |
| Settings (theme, hotkey) | `chrome.storage.sync` | Sync giữa các máy |

## Chrome API dùng tới

| API | Mục đích |
|---|---|
| `chrome.action` | Popup khi click icon extension |
| `chrome.storage.sync` / `chrome.storage.local` | Lưu favorites, history, settings |
| `chrome.commands` | Phím tắt global (vd `Ctrl+Shift+K` mở popup) |
| `chrome.omnibox` | Gõ `cli` + `Tab` trong address bar để search |
| `chrome.notifications` | Hiển thị toast "Copied!" khi copy từ omnibox (popup dùng UI toast riêng) |
| `chrome.contextMenus` | (Tuỳ chọn) click chuột phải trên text để lookup |
| `navigator.clipboard.writeText()` | Copy command vào clipboard |

## Permissions (manifest.json)

```jsonc
{
  "permissions": [
    "storage",
    "clipboardWrite"
  ],
  "optional_permissions": [
    "contextMenus"
  ]
}
```

Không xin `host_permissions` vì không gọi API ngoài.
