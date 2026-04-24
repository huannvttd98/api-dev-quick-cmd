# Publishing — Chrome Web Store

## Bước 1 — Đăng ký Developer account

1. Truy cập [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Đăng nhập Google account (nên dùng account riêng cho public, không dùng account cá nhân)
3. Trả phí đăng ký **$5 một lần** (không phải subscription)
4. Verify email + chấp nhận Developer Agreement

## Bước 2 — Chuẩn bị assets

### Icons

| File | Kích thước | Mục đích |
|---|---|---|
| `icon-16.png` | 16×16 | Favicon tab, toolbar small |
| `icon-48.png` | 48×48 | `chrome://extensions` page |
| `icon-128.png` | 128×128 | Chrome Web Store listing |

Dùng 1 file SVG master → export ra 3 size PNG.

### Screenshots (bắt buộc)

- Tối thiểu **1 screenshot**, tối đa **5**
- Kích thước **1280×800** hoặc **640×400** (phải nhất quán)
- Nội dung gợi ý:
  1. Popup với search "git" đang filter
  2. Chọn lệnh có placeholder → input mở ra
  3. Tab Favorites với nhiều lệnh đã star
  4. Tab Recent với history
  5. Omnibox `cli pull` trong address bar

### Promotional tile (khuyến khích)

| File | Kích thước | Ghi chú |
|---|---|---|
| Small tile | 440×280 | Hiện ở search results |
| Marquee | 1400×560 | Chỉ khi được feature — khó có ở lần đầu |

### Store listing copy

- **Name:** `CLI Toolbox` (max 45 ký tự)
- **Summary:** max 132 ký tự, ví dụ: `Fast CLI command reference for developers. Search, copy, and learn terminal commands instantly.`
- **Description:** markdown-lite, nên có:
  - Elevator pitch 2-3 dòng
  - Bullet list các tính năng chính
  - Danh sách category hỗ trợ
  - Screenshots inline (optional)
  - Roadmap ngắn
- **Category:** `Developer Tools`
- **Language:** English (có thể thêm Vietnamese sau)

## Bước 3 — Build production

```bash
npm run build
# Output ở dist/, zip lại:
cd dist && zip -r ../cli-toolbox-v1.0.0.zip . && cd ..
```

**Checklist trước khi zip:**
- [ ] `manifest.json` có đúng `version` (phải tăng mỗi lần publish)
- [ ] Source maps KHÔNG được include (kiểm tra `vite.config.ts`)
- [ ] Không có `console.log` debug còn lại
- [ ] Icons đầy đủ 3 size
- [ ] Permissions tối thiểu — không xin thừa
- [ ] Test lại 1 lần trên Chrome clean (không có data cũ)

## Bước 4 — Upload & submit

1. Vào Developer Dashboard → **New Item**
2. Upload `cli-toolbox-v1.0.0.zip`
3. Điền Store listing:
   - Name, summary, description
   - Screenshots, icons
   - Category, language
4. Điền Privacy practices:
   - **Single purpose:** "Reference and copy terminal/CLI commands"
   - **Data collection:** None (chọn "Does not collect user data")
   - **Remote code:** No
5. Chọn distribution: **Public**
6. Submit for review

## Bước 5 — Chờ review

- Lần đầu review thường **1-3 ngày**, có thể lâu hơn
- Lý do bị reject thường gặp:
  - Permissions không justify được → giải thích rõ trong "Permission justification"
  - Description sơ sài → viết ít nhất 300 từ, có cấu trúc
  - Icon/screenshot chất lượng thấp
  - Dùng API deprecated (Manifest V2) → V3 là bắt buộc

## Bước 6 — Sau khi approve

- Extension có URL public: `https://chrome.google.com/webstore/detail/<id>`
- Cập nhật README.md với badge + link install
- Monitor rating & reviews trong dashboard
- Theo dõi crash reports (nếu có)

## Phiên bản tiếp theo

Mỗi lần update:
1. Bump version trong `manifest.ts` (semver)
2. Cập nhật `CHANGELOG.md`
3. Build + zip + upload qua dashboard (giữ Item ID cũ)
4. Review lần sau thường nhanh hơn lần đầu (~1 ngày)

## Các link quan trọng

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies)
- [Manifest V3 migration](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

## Ghi chú pháp lý

- Cần `privacy-policy.md` nếu extension **có** thu thập data — bản MVP KHÔNG thu thập gì nên không bắt buộc
- Cần license rõ ràng trong repo (MIT đã chọn)
- Không được dùng tên/logo vi phạm trademark (tránh tên kiểu "Google CLI Tools")
