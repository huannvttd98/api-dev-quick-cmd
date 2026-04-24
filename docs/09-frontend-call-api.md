# Frontend Call API Guide

Tai lieu nay huong dan frontend tich hop voi API cua du an API Dev Quick CMD.

## 1. API base

Mac dinh local:

```text
http://localhost:8787
```

Tat ca endpoint chinh deu theo prefix:

```text
/api/v1
```

Vi du endpoint day du:

```text
http://localhost:8787/api/v1/categories
```

## 2. Danh sach endpoint frontend can dung

- `GET /health`
- `GET /api/v1/version`
- `GET /api/v1/categories`
- `GET /api/v1/commands?category=&page=&per_page=`
- `GET /api/v1/commands/:id`
- `GET /api/v1/search?q=&limit=`

## 3. Cau hinh bien moi truong cho frontend

### Vite

Tao file `.env` trong project frontend:

```env
VITE_API_BASE_URL=http://localhost:8787
```

Doc bien trong code:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

### Next.js

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
```

## 4. Tao API client voi fetch

```ts
// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export interface ApiError {
  status: number;
  message: string;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep default message when body is not JSON.
    }
    throw { status: res.status, message } as ApiError;
  }

  return (await res.json()) as T;
}

export interface CategoryItem {
  id: string;
  label: string;
  emoji: string;
  count: number;
}

export interface CommandItem {
  id: string;
  category: string;
  title: string;
  command: string;
  description?: string;
  tags?: string[];
  placeholders?: Array<{ key: string; hint: string; default?: string }>;
  docs?: string;
  examples?: string[];
  steps?: Array<{ title: string; command?: string; description?: string }>;
  score?: number;
}

export interface VersionResponse {
  version: string;
}

export interface CategoriesResponse {
  data: CategoryItem[];
  version: string;
}

export interface CommandsResponse {
  data: CommandItem[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    version: string;
  };
}

export interface CommandDetailResponse {
  data: CommandItem;
  version: string;
}

export interface SearchResponse {
  data: CommandItem[];
  version: string;
}

export function getVersion() {
  return request<VersionResponse>("/api/v1/version");
}

export function getCategories() {
  return request<CategoriesResponse>("/api/v1/categories");
}

export function getCommands(params?: {
  category?: string;
  page?: number;
  perPage?: number;
}) {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.page) query.set("page", String(params.page));
  if (params?.perPage) query.set("per_page", String(params.perPage));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<CommandsResponse>(`/api/v1/commands${suffix}`);
}

export function getCommandDetail(id: string) {
  return request<CommandDetailResponse>(`/api/v1/commands/${encodeURIComponent(id)}`);
}

export function searchCommands(q: string, limit = 20) {
  const query = new URLSearchParams({ q, limit: String(limit) });
  return request<SearchResponse>(`/api/v1/search?${query.toString()}`);
}
```

## 5. React example

```tsx
import { useEffect, useState } from "react";
import { getCategories, searchCommands } from "./lib/api";

export default function App() {
  const [categories, setCategories] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch((err) => setError(err.message ?? "Cannot load categories"));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const t = setTimeout(() => {
      setLoading(true);
      searchCommands(query, 10)
        .then((res) => setResults(res.data))
        .catch((err) => setError(err.message ?? "Search failed"))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  return (
    <main>
      <h1>CLI Commands</h1>

      <input
        placeholder="Search command..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Categories</h2>
      <ul>
        {categories.map((c) => (
          <li key={c.id}>{c.emoji} {c.label} ({c.count})</li>
        ))}
      </ul>

      <h2>Search Result</h2>
      <ul>
        {results.map((item) => (
          <li key={item.id}>
            <strong>{item.title}</strong> - {item.command}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

## 6. Pattern xu ly loi nen dung

- 4xx: loi request tu frontend (query sai, id khong ton tai).
- 5xx: loi server (thong bao tong quat va cho phep retry).
- Timeout: can co fallback UI, button retry.

Goi y:

- Hien thong bao loi gon: "Khong tai duoc du lieu. Thu lai.".
- Log chi tiet vao console/Sentry, khong show stack trace cho user.

## 7. Best practices cho UX

- Debounce search tu 200-300ms de giam request.
- Cache categories trong memory (vi it thay doi).
- Khi search rong (`q=""`), frontend nen hien recent commands hoac popular list.
- Pagination cho danh sach commands (`page`, `per_page`) khi so luong lon.

## 8. Kiem tra nhanh bang frontend devtools

Kiem tra endpoint categories:

```text
GET http://localhost:8787/api/v1/categories
```

Kiem tra search:

```text
GET http://localhost:8787/api/v1/search?q=pull&limit=5
```

Neu bi loi CORS khi frontend va API khac domain/port:

- Can bo sung CORS middleware trong API.
- Hoac dung reverse proxy de frontend va API cung origin.

## 9. Checklist tich hop frontend

- [ ] Da set bien moi truong API base URL.
- [ ] Da co API client chung (`request`).
- [ ] Da xu ly loading, empty, error state.
- [ ] Da debounce search.
- [ ] Da encode id khi goi detail endpoint.
- [ ] Da test voi du lieu that tu `/api/v1/search` va `/api/v1/commands`.
