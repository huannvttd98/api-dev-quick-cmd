# API Dev Quick CMD

Project nay cung cap bo du lieu command-line cho developer va mot REST API nho de truy van nhanh danh sach lenh.

## Muc tieu

- Luu tru command theo category (git, docker, laravel, linux, mysql, nginx, node, ssh, recipes).
- Phuc vu extension hoac frontend thong qua API `/api/v1/*`.
- Don gian, de chay local, khong can database.

## Cau truc thu muc

- `data/`: Nguon du lieu JSON (167 commands).
- `docs/`: Tai lieu planning, architecture, migration.
- `api/`: Node.js + TypeScript + Express server.

## Yeu cau moi truong

- Node.js 18+ (khuyen nghi Node.js 20+).
- npm 9+.

## Chay API local

1. Cai dependencies:

```bash
npm --prefix api install
```

2. Chay development server:

```bash
npm --prefix api run dev
```

3. API mac dinh chay tai:

```text
http://localhost:8787
```

## Build production

```bash
npm --prefix api run build
npm --prefix api run start
```

## Bien moi truong

- `PORT`: Port server (default `8787`).
- `DATASET_VERSION`: Version string tra ve qua endpoint `/api/v1/version` (default `2026-04-24`).
- `CORS_ORIGINS`: Danh sach origin duoc phep, tach boi dau phay (default `http://localhost:5173,http://localhost:3000`). Dung `*` de allow tat ca origin.

Vi du (PowerShell):

```powershell
$env:PORT=9000
$env:DATASET_VERSION="2026-05-01"
$env:CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
npm --prefix api run dev
```

## API Endpoints

### 1) Health check

- `GET /health`

Response:

```json
{ "ok": true }
```

### 2) Dataset version

- `GET /api/v1/version`

Response:

```json
{ "version": "2026-04-24" }
```

### 3) Categories

- `GET /api/v1/categories`

Response shape:

```json
{
  "data": [
    { "id": "git", "label": "Git", "emoji": "🌿", "count": 22 }
  ],
  "version": "2026-04-24"
}
```

### 4) Commands list

- `GET /api/v1/commands`
- Query params:
- `category` (optional): loc theo category.
- `page` (optional, default `1`).
- `per_page` (optional, default `100`, max `200`).

Vi du:

```text
GET /api/v1/commands?category=git&page=1&per_page=20
```

### 5) Command detail

- `GET /api/v1/commands/:id`

Vi du:

```text
GET /api/v1/commands/git.status
```

Neu khong tim thay:

```json
{ "error": "Command not found" }
```

### 6) Search

- `GET /api/v1/search?q=<keyword>&limit=<n>`
- `limit` default `20`, max `50`.
- Ket qua co them truong `score` trong khoang `0..1`.

Vi du:

```text
GET /api/v1/search?q=pull&limit=5
```

## Test nhanh bang PowerShell

```powershell
Invoke-RestMethod -Uri http://localhost:8787/health | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://localhost:8787/api/v1/categories | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "http://localhost:8787/api/v1/search?q=pull&limit=5" | ConvertTo-Json -Depth 6
```

## Ghi chu implementation

- API load JSON truc tiep tu `data/*.json` trong `api/src/catalog.ts`.
- Du lieu dang in-memory, phu hop MVP va offline dataset.
- Search dang dung scoring don gian trong `api/src/search.ts`.

## Huong phat trien tiep

- Them validate query params chuan hon (zod/valibot).
- Them automated test endpoint (vitest + supertest).
- Can nhac migration sang DB/API hosted theo tai lieu trong `docs/07-api-migration.md`.
