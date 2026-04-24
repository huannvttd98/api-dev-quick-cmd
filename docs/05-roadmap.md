# Roadmap

## Milestone 0 — Planning ✅

- [x] Viết tài liệu plan trong `docs/`
- [x] Chốt stack: Vite + React + TS + Tailwind
- [x] Chốt scope MVP (Chrome first)

## Milestone 1 — Scaffold project

- [ ] `npm create vite@latest` + áp `@crxjs/vite-plugin`
- [ ] Config Tailwind, PostCSS
- [ ] Config ESLint + Prettier
- [ ] Tạo `manifest.ts` khung
- [ ] Icon placeholder (16/48/128)
- [ ] Chạy `npm run dev` → load unpacked vào Chrome → thấy popup "Hello"

**Definition of Done:** Load extension vào Chrome không lỗi, click icon thấy popup React chạy.

## Milestone 2 — Data layer

- [ ] Viết `src/types.ts`
- [ ] Viết `src/data/categories.ts`
- [ ] Seed data cho 3 category đầu: `git.json`, `docker.json`, `laravel.json` (mỗi cái ~15-20 lệnh)
- [ ] Viết `src/data/index.ts` — load & merge JSON
- [ ] Unit test data integrity (id unique, category khớp)

**Definition of Done:** Gọi `loadCommands()` trả về mảng `Command[]` đầy đủ, không duplicate id.

## Milestone 3 — Popup UI (core)

- [ ] `App.tsx` + layout cơ bản
- [ ] `SearchBar` — input có autofocus
- [ ] `CommandList` + `CommandItem` — render list, highlight match
- [ ] `CategoryTabs` — filter theo category
- [ ] `useCommands` hook — load data + filter
- [ ] Fuzzy search (dùng fuse.js)

**Definition of Done:** Mở popup, gõ "git" thấy filter, UI responsive trong 400×500px.

## Milestone 4 — Copy & clipboard

- [ ] `lib/clipboard.ts` — wrap `navigator.clipboard.writeText`
- [ ] Enter/click item → copy
- [ ] Toast "Copied!" (dùng component nhỏ tự viết, không cần lib)
- [ ] Xử lý placeholder `{{...}}` → popup input nhỏ

**Definition of Done:** Chọn lệnh không placeholder → copy ngay. Chọn lệnh có `{{branch}}` → hiện input → nhập → copy lệnh đã resolve.

## Milestone 5 — Favorites & History

- [ ] `lib/storage.ts` — wrap `chrome.storage` promisified
- [ ] `useFavorites` hook
- [ ] `useHistory` hook (max 50 entries)
- [ ] Icon ⭐ trên mỗi item để toggle
- [ ] Tab "Favorites" và "Recent"
- [ ] Empty states cho từng tab

**Definition of Done:** Toggle ⭐ → reload extension → vẫn còn. Dùng 1 lệnh → tab Recent có ngay.

## Milestone 6 — Seed data đầy đủ

- [ ] `linux.json` (20-30 lệnh: ls, chmod, ps, kill, grep, find, tar, ...)
- [ ] `mysql.json` (15-20 lệnh)
- [ ] `nginx.json` (10-15 lệnh)
- [ ] `node.json` (15-20 lệnh: npm/yarn/pnpm)
- [ ] `ssh.json` (10 lệnh)
- [ ] Bổ sung thêm Git, Docker, Laravel cho đủ 20+ mỗi cái

**Definition of Done:** Tối thiểu ~150 lệnh tổng cộng, trải đều 8 category.

## Milestone 7 — Polish

- [ ] Dark mode (theo `prefers-color-scheme` + toggle manual)
- [ ] Keyboard shortcuts trong popup (↑↓ Enter Esc Tab)
- [ ] Global shortcut `Ctrl+Shift+K`
- [ ] Animation nhẹ khi mở popup, toast
- [ ] Icon extension final (SVG export → PNG)

**Definition of Done:** Dùng extension chỉ bằng keyboard, dark mode đẹp, không lag.

## Milestone 8 — Omnibox integration

- [ ] `background/service-worker.ts` — listen `chrome.omnibox`
- [ ] Suggest commands khi gõ `cli <query>`
- [ ] Enter trong omnibox → copy + notification

**Definition of Done:** Gõ `cli pull` trong address bar → thấy suggestion → Enter → copy thành công.

## Milestone 9 — Publish

- [ ] Viết README.md cuối cùng (screenshots, install)
- [ ] Viết CHANGELOG.md
- [ ] Chuẩn bị asset Chrome Web Store (xem `06-publishing.md`)
- [ ] Register Chrome Web Store Developer account ($5 one-time)
- [ ] Build production + upload .zip
- [ ] Submit review

**Definition of Done:** Extension live trên Chrome Web Store, cài được từ link public.

## Post-MVP (Next Version)

- [ ] Context menu "Lookup CLI for: <selected text>"
- [ ] AI giải thích lệnh (gọi API bên ngoài, cần xin host_permissions)
- [ ] Import/export favorites qua JSON
- [ ] User-defined commands (custom)
- [ ] Theme tuỳ biến
- [ ] **VS Code Extension** — port lại với cùng data, dùng Quick Pick API
- [ ] Firefox port (Manifest V2 compat)
- [ ] Team shared snippets (cần backend)

## Ước lượng thời gian (solo dev, buổi tối)

| Milestone | Thời gian dự kiến |
|---|---|
| M1 Scaffold | 0.5 ngày |
| M2 Data layer | 0.5 ngày |
| M3 Popup UI | 1-2 ngày |
| M4 Copy & clipboard | 0.5 ngày |
| M5 Favorites & History | 1 ngày |
| M6 Seed data | 1-2 ngày (tuỳ độ cẩn thận) |
| M7 Polish | 1 ngày |
| M8 Omnibox | 0.5 ngày |
| M9 Publish | 0.5 ngày (chưa tính thời gian Chrome review 1-3 ngày) |
| **Tổng** | **~7-9 ngày làm việc** |
