# API Migration — Chuyển từ Static JSON sang Database

## Trạng thái hiện tại

Toàn bộ command được bundle trong extension dưới dạng JSON tĩnh ở [src/data/](../src/data/):
- 9 file JSON (8 category + recipes) — ~167 lệnh
- Load sync qua `loadCommands()` trong [src/data/index.ts](../src/data/index.ts)
- Không cần network — offline-first hoàn toàn

## Khi nào nên migrate sang DB

Chỉ nên chuyển khi gặp **ít nhất 1** trong các vấn đề sau:

| Vấn đề | Migration giải quyết được? |
|---|---|
| Danh sách lệnh quá lớn (~1000+) làm bundle nặng | ✅ — tải theo nhu cầu |
| Muốn update lệnh không cần publish version mới | ✅ — sửa DB là xong |
| User contribute lệnh / team shared snippets | ✅ — cần backend |
| Sync favorites/history giữa các thiết bị | ✅ — backend session |
| Analytics: lệnh nào được copy nhiều nhất | ✅ — log event |
| Multi-language content | ✅ — i18n theo locale |

Nếu chỉ là bộ reference cá nhân < 500 lệnh → **không cần** migrate, static JSON tốt hơn (offline, free hosting, instant).

---

## Kiến trúc sau migration

```
┌──────────────────────┐           ┌──────────────────────┐
│  Extension (Chrome)  │  HTTPS    │   Backend API        │
│                      │ ────────> │                      │
│  ┌────────────────┐  │           │  ┌────────────────┐  │
│  │  lib/api.ts    │  │           │  │ REST endpoints │  │
│  │  (fetch wrap)  │  │           │  │                │  │
│  └────────────────┘  │           │  └────────────────┘  │
│        │             │           │         │            │
│  ┌────────────────┐  │           │  ┌────────────────┐  │
│  │  Cache (local) │  │           │  │   Database     │  │
│  │  chrome.storage│  │           │  │   (Postgres/   │  │
│  └────────────────┘  │           │  │    MySQL)      │  │
│        │             │           │  └────────────────┘  │
│  ┌────────────────┐  │           │                      │
│  │  React hooks   │  │           │                      │
│  └────────────────┘  │           │                      │
└──────────────────────┘           └──────────────────────┘
```

---

## Các endpoint cần có

### Public endpoints (không cần auth)

| Method | Path | Mục đích |
|---|---|---|
| `GET` | `/api/v1/categories` | Danh sách category (8 cái hiện có + mới) |
| `GET` | `/api/v1/commands` | List toàn bộ command (có pagination nếu >500) |
| `GET` | `/api/v1/commands?category={id}` | Filter theo category |
| `GET` | `/api/v1/commands/{id}` | Chi tiết 1 command (nếu cần lazy-load docs/examples/steps) |
| `GET` | `/api/v1/search?q={query}&limit=20` | Server-side fuzzy search (alternative cho fuse.js) |
| `GET` | `/api/v1/version` | Trả về version hiện tại của dataset → client dùng để invalidate cache |

### User-scoped endpoints (cần auth)

Chỉ cần nếu muốn **cloud sync** favorites/history giữa các thiết bị. Hiện tại favorites đã sync qua `chrome.storage.sync` nên có thể bỏ qua.

| Method | Path | Mục đích |
|---|---|---|
| `GET` | `/api/v1/me/favorites` | Lấy danh sách command ID đã favorite |
| `POST` | `/api/v1/me/favorites` | Thêm favorite `{ commandId }` |
| `DELETE` | `/api/v1/me/favorites/{id}` | Xoá favorite |
| `GET` | `/api/v1/me/history` | Lấy history |
| `POST` | `/api/v1/me/history` | Push entry `{ commandId, usedAt }` |

### Admin / contributor endpoints

Chỉ cần nếu build admin panel riêng. Tạm thời có thể sửa DB trực tiếp.

| Method | Path |
|---|---|
| `POST` | `/api/v1/admin/commands` |
| `PUT` | `/api/v1/admin/commands/{id}` |
| `DELETE` | `/api/v1/admin/commands/{id}` |
| `POST` | `/api/v1/admin/categories` |
| `PUT` | `/api/v1/admin/categories/{id}` |

---

## Schema (REST / JSON)

### GET `/api/v1/categories`

Response `200 OK`:
```json
{
  "data": [
    { "id": "git",     "label": "Git",      "emoji": "🌿", "count": 22 },
    { "id": "docker",  "label": "Docker",   "emoji": "🐳", "count": 22 },
    { "id": "recipes", "label": "Recipes",  "emoji": "📖", "count": 4 }
  ],
  "version": "2026-04-24T10:30:00Z"
}
```

### GET `/api/v1/commands`

Query params:
- `category` (optional): filter theo category ID
- `page`, `per_page` (optional): pagination

Response:
```json
{
  "data": [
    {
      "id": "git.status",
      "category": "git",
      "title": "Status",
      "command": "git status",
      "description": "Xem trạng thái working tree",
      "tags": ["check", "diff"],
      "placeholders": [],
      "examples": ["git status -sb"],
      "docs": "Hiển thị các file...",
      "steps": null,
      "updated_at": "2026-04-10T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 100,
    "total": 167,
    "version": "2026-04-24T10:30:00Z"
  }
}
```

### GET `/api/v1/search?q=git+pull`

Response:
```json
{
  "data": [
    {
      "id": "git.pull-origin-branch",
      "score": 0.92,
      /* ... full command fields ... */
    }
  ]
}
```

---

## Database schema (PostgreSQL example)

```sql
CREATE TABLE categories (
  id        VARCHAR(32)  PRIMARY KEY,
  label     VARCHAR(64)  NOT NULL,
  emoji     VARCHAR(8)   NOT NULL,
  sort_order INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commands (
  id           VARCHAR(128) PRIMARY KEY,          -- "git.status"
  category_id  VARCHAR(32)  REFERENCES categories(id) ON DELETE RESTRICT,
  title        VARCHAR(128) NOT NULL,
  command      TEXT         NOT NULL,
  description  TEXT,
  docs         TEXT,
  tags         TEXT[],                             -- PostgreSQL array
  placeholders JSONB,                              -- [{ key, hint, default }]
  examples     TEXT[],
  steps        JSONB,                              -- [{ title, command, description }]
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_commands_category ON commands(category_id);
CREATE INDEX idx_commands_tags     ON commands USING GIN(tags);
CREATE INDEX idx_commands_search   ON commands USING GIN(
  to_tsvector('simple', title || ' ' || command || ' ' || coalesce(description, ''))
);

-- Nếu có user-scoped data:
CREATE TABLE users (
  id         UUID PRIMARY KEY,
  email      VARCHAR(256) UNIQUE NOT NULL,
  google_id  VARCHAR(128) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE favorites (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  command_id VARCHAR(128) REFERENCES commands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, command_id)
);

CREATE TABLE history (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  command_id VARCHAR(128) REFERENCES commands(id) ON DELETE CASCADE,
  used_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_history_user ON history(user_id, used_at DESC);
```

---

## Strategy: Auth

Chọn 1 trong 3:

### Option A — Không auth (khuyến nghị nếu MVP)
- Commands là data public → GET không cần auth
- Favorites/history vẫn lưu `chrome.storage.sync` như hiện tại
- Backend đơn giản, miễn phí host
- **Trade-off:** không sync được giữa nhiều Chrome profile khác nhau (Chrome Sync chỉ trong cùng profile)

### Option B — Google OAuth 2.0 (via `chrome.identity`)
- User login qua `chrome.identity.getAuthToken()` → Google ID token
- Backend verify token, tạo session/JWT
- Extension gửi token trong `Authorization: Bearer ...`
- **Pros:** User thật, sync đầy đủ giữa các máy/profile
- **Cons:** Cần xin permission `identity` + `identity.email`, setup OAuth credentials ở Google Cloud Console

```ts
// src/lib/auth.ts
export async function getToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}
```

### Option C — Anonymous UUID + API key
- Extension tạo 1 UUID lần đầu, lưu `chrome.storage.sync`
- Gửi trong header `X-Client-ID`
- Backend tạo user row theo UUID, không email
- **Pros:** Không cần OAuth
- **Cons:** Mất `chrome.storage.sync` = mất identity, không recover được

---

## Strategy: Cache & offline-first

Extension KHÔNG được phụ thuộc mạng để mở — must still work offline.

```
Khi popup mở:
  1. Đọc cache từ chrome.storage.local ngay → render UI ngay
  2. Fetch /api/v1/version song song
  3. Nếu version khác cache → fetch /api/v1/commands mới → update cache + re-render
  4. Nếu offline → giữ nguyên cache
```

### Cache keys

| Key | Storage | TTL | Ghi chú |
|---|---|---|---|
| `cache.version` | `local` | — | Version hiện tại của dataset |
| `cache.commands` | `local` | 24h (stale but usable) | Toàn bộ command list |
| `cache.categories` | `local` | 24h | Category list |
| `cache.fetchedAt` | `local` | — | Timestamp fetch gần nhất |

### Implementation sketch

```ts
// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE ?? "https://api.cli-toolbox.dev";

export async function fetchCommands(): Promise<Command[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/commands`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    await chrome.storage.local.set({
      "cache.commands": data,
      "cache.fetchedAt": Date.now(),
    });
    return data as Command[];
  } catch (err) {
    // Fallback to cache
    const cached = await chrome.storage.local.get("cache.commands");
    if (cached["cache.commands"]) return cached["cache.commands"] as Command[];
    throw err;
  }
}

export async function loadCommandsWithCache(): Promise<{
  commands: Command[];
  source: "cache" | "network";
}> {
  const cached = await chrome.storage.local.get("cache.commands");
  if (cached["cache.commands"]) {
    // Fire-and-forget refresh
    void fetchCommands().catch(console.error);
    return { commands: cached["cache.commands"] as Command[], source: "cache" };
  }
  const fresh = await fetchCommands();
  return { commands: fresh, source: "network" };
}
```

### Hook thay đổi

```ts
// src/popup/hooks/useCommands.ts (new version)
import { useEffect, useState } from "react";
import { loadCommandsWithCache } from "../../lib/api";
import { createSearcher } from "../../lib/search";

export function useCommands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadCommandsWithCache()
      .then(({ commands }) => setCommands(commands))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const searcher = useMemo(() => createSearcher(commands), [commands]);
  return { commands, searcher, loading, error };
}
```

UI cần thêm:
- **Loading state:** skeleton/spinner khi `loading && !commands.length`
- **Error state:** nếu `error && !commands.length` → "Cannot load commands. Check connection or retry."
- **Offline indicator:** nếu dùng cache cũ, show banner nhỏ "Using cached data"

---

## Manifest changes

```jsonc
{
  "permissions": ["storage", "notifications", "offscreen", "sidePanel"],
  "host_permissions": [
    "https://api.cli-toolbox.dev/*"  // HOẶC "*://*/*" nếu cần linh hoạt
  ]
}
```

Chrome Web Store review sẽ kiểm tra chặt permissions này — justification rõ ràng: *"Fetches command data from our API."*

Nếu dùng OAuth:
```jsonc
{
  "permissions": ["storage", "identity"],
  "oauth2": {
    "client_id": "...",
    "scopes": ["openid", "email", "profile"]
  }
}
```

---

## Backend tech stack — khuyến nghị

### Laravel (Option top — vì team đã quen)
- Laravel 11 + PHP 8.3
- MySQL/PostgreSQL + Eloquent
- Sanctum cho auth (nếu cần)
- API Resource classes cho response shape nhất quán
- Migration + Seeder để import JSON ban đầu
- Deploy: Laragon local dev → VPS/Forge production

### Node + Express + Prisma
- Nếu muốn 1 repo TypeScript xuyên suốt (shared types với extension)
- Prisma ORM — type-safe, migration tự động
- Deploy: Railway / Fly.io / Vercel Functions

### Supabase (backend-as-a-service)
- Không cần tự viết server
- PostgreSQL + Auto-generated REST/GraphQL API
- Auth built-in (Google OAuth 1-click)
- **Trade-off:** ít control, vendor lock-in, quota miễn phí giới hạn

---

## Migration plan (step-by-step)

| Bước | Công việc | Thời gian |
|---|---|---|
| 1 | Chốt backend stack + host (Laravel/Node/Supabase) | 0.5 ngày |
| 2 | Setup project backend + DB schema | 1 ngày |
| 3 | Script import JSON → DB | 0.5 ngày |
| 4 | Viết public endpoints + testing | 1-2 ngày |
| 5 | Deploy API lên staging domain | 0.5 ngày |
| 6 | Tạo `lib/api.ts` + update `useCommands` hook | 1 ngày |
| 7 | Thêm loading/error UI states | 0.5 ngày |
| 8 | Test offline scenarios + cache invalidation | 0.5 ngày |
| 9 | Feature flag — toggle giữa JSON và API | 0.5 ngày |
| 10 | Rollout: A/B test với một số user trước | — |
| 11 | Deprecate JSON bundles (xoá import từ `data/index.ts`) | 0.5 ngày |
| **Tổng** | | **~6-8 ngày** |

Lưu ý: **giữ JSON bundles làm fallback** trong vài version đầu tiên. Nếu API down, user vẫn dùng được bộ data gốc.

```ts
// Graceful fallback
export async function loadCommands(): Promise<Command[]> {
  try {
    const { commands } = await loadCommandsWithCache();
    return commands;
  } catch {
    return loadBundledCommands(); // từ src/data/*.json
  }
}
```

---

## Các rủi ro cần lường trước

| Rủi ro | Giảm thiểu |
|---|---|
| API server down → extension vô dụng | Fallback bundled JSON + cache |
| CORS chặn request | Backend phải set `Access-Control-Allow-Origin: *` hoặc allow extension ID |
| Chrome Web Store từ chối host_permissions | Chuẩn bị justification rõ ràng, dùng 1 domain duy nhất |
| User bị rate-limit / DDoS server | Cache aggressive + CloudFlare trước API |
| Data change gây breaking (field rename) | API versioning `/v1/`, `/v2/`, không sửa schema cũ |
| Cost hosting | Free tier đủ cho <10k user (Supabase/Railway/Vercel) |

---

## Checklist trước khi go-live

- [ ] Backend deployed với HTTPS + valid cert
- [ ] CORS cho phép `chrome-extension://*` hoặc extension ID cụ thể
- [ ] Rate limit (vd 100 req/min per IP)
- [ ] Monitoring: error tracking (Sentry), uptime ping
- [ ] Backup DB tự động hàng ngày
- [ ] Extension version mới đã thêm `host_permissions`
- [ ] Privacy policy cập nhật (vì giờ có network request)
- [ ] Update Chrome Web Store listing — Permission justification
- [ ] Test offline mode trên thiết bị thật
- [ ] Test cache invalidation khi server bump version
- [ ] Rollback plan: chuyển feature flag về JSON nếu API lỗi

---

## Liên quan

- [docs/02-architecture.md](02-architecture.md) — Cấu trúc module hiện tại
- [docs/03-data-schema.md](03-data-schema.md) — Schema JSON tĩnh (nguồn để migrate)
- [docs/06-publishing.md](06-publishing.md) — Privacy + permissions khi submit Chrome Web Store
