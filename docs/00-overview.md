# CLI Toolbox — Chrome Extension

## Mục tiêu

Chrome Extension giúp developer **tra cứu và copy command CLI** thường dùng (Git, Docker, Laravel, Linux, MySQL...) ngay trên trình duyệt, không cần chuyển tab hay Google.

## Phạm vi MVP

- ✅ Chỉ phát hành trên **Chrome Web Store** trước
- ✅ UI dùng **Popup** (browser action) — HTML/CSS/JS
- ✅ Data tĩnh đóng gói sẵn trong extension (JSON)
- ✅ Favorites (sync qua Google account) + History (local) qua `chrome.storage`
- ✅ Tích hợp **Omnibox** (gõ `cli` + tab trong address bar để search nhanh)
- ❌ Chưa có AI, cloud sync, team sharing (để Next Version)
- ❌ VS Code Extension sẽ làm ở giai đoạn sau

## Nguyên tắc thiết kế

1. **Nhanh trên hết** — popup mở < 200ms, không chờ network
2. **Offline-first** — không phụ thuộc internet
3. **Keyboard-first** — dev thao tác bằng phím, hạn chế chuột
4. **Tối giản** — không thêm tính năng ngoài MVP
5. **Chrome Manifest V3** — tuân thủ chuẩn mới nhất của Chrome

## Tài liệu liên quan

- [01-tech-stack.md](01-tech-stack.md) — Stack & dependencies
- [02-architecture.md](02-architecture.md) — Cấu trúc thư mục & module
- [03-data-schema.md](03-data-schema.md) — Schema cho command & category
- [04-user-flow.md](04-user-flow.md) — Flow người dùng
- [05-roadmap.md](05-roadmap.md) — Các milestone từng bước
- [06-publishing.md](06-publishing.md) — Quy trình publish lên Chrome Web Store
- [07-api-migration.md](07-api-migration.md) — (Future) Migrate static JSON → Database/API
