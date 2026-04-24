# User Flow

## Flow 1 — Search & copy nhanh (core flow)

```
User click icon extension  (hoặc bấm Ctrl+Shift+K)
        │
        ▼
Popup mở — focus vào ô search, hiện tab "All"
        │
        ▼
User gõ keyword (vd "pull")
        │
        ▼
List filter realtime — fuzzy match trên title, command, tags
        │
        ▼
User nhấn Enter (chọn item đầu) HOẶC click vào item
        │
        ├─ Có placeholder? ─── Yes ──→ Hiện input nhỏ → User nhập → Copy lệnh đã thay
        │                                                            │
        └─ Không ────────────────────────────────────────────────────┤
                                                                     ▼
                                                       Copy vào clipboard
                                                                     │
                                                                     ▼
                                                  Toast "✓ Copied!" (1.5s)
                                                                     │
                                                                     ▼
                                                       Push vào history
                                                                     │
                                                                     ▼
                                                          Popup đóng (tùy chọn)
```

## Flow 2 — Omnibox (address bar)

```
User gõ "cli " vào address bar (có space)
        │
        ▼
Chrome hiện suggestion do extension cung cấp
        │
        ▼
User gõ tiếp keyword → thấy list lệnh match
        │
        ▼
User chọn 1 item (Enter)
        │
        ▼
Extension copy lệnh vào clipboard + hiện notification
        │
        ▼
Tab hiện tại không đổi
```

## Flow 3 — Quản lý favorites

```
User mở popup
        │
        ▼
Hover lên 1 command → hiện icon ⭐ bên phải
        │
        ▼
Click ⭐ → toggle favorite
        │
        ▼
State lưu vào chrome.storage.sync (sync qua account)
        │
        ▼
Tab "Favorites" cập nhật realtime
```

## Flow 4 — Xem history

```
User mở popup → click tab "Recent"
        │
        ▼
Hiện 50 lệnh dùng gần nhất (sort mới → cũ)
        │
        ▼
Click 1 item → copy lại như flow 1
        │
        ▼
History push entry mới lên đầu
```

## UI States (popup)

| State | Điều kiện | Hiển thị |
|---|---|---|
| **Default** | Popup vừa mở, chưa gõ gì | All commands, sort theo category |
| **Searching** | Có text trong SearchBar | Filtered list, highlight từ khớp |
| **Empty result** | Search không match gì | "No commands found" + gợi ý clear search |
| **Empty favorites** | Tab Favorites, chưa có ⭐ | "No favorites yet. Click ⭐ to add." |
| **Empty history** | Tab Recent, chưa dùng lần nào | "No recent commands. Start using some!" |
| **Placeholder input** | Chọn lệnh có `{{...}}` | Overlay input nhỏ, Esc để huỷ |

## Keyboard shortcuts (trong popup)

| Phím | Hành động |
|---|---|
| `Enter` | Chọn item đang highlight → copy |
| `↑ / ↓` | Di chuyển selection |
| `Tab` | Chuyển category tab |
| `Esc` | Clear search / Đóng popup |
| `Ctrl+Enter` | Copy nguyên bản (không resolve placeholder) |

## Global shortcuts (Chrome `chrome.commands`)

| Phím | Hành động |
|---|---|
| `Ctrl+Shift+K` (Win/Linux) | Mở popup extension |
| `Cmd+Shift+K` (Mac) | Mở popup extension |

User có thể đổi trong `chrome://extensions/shortcuts`.
