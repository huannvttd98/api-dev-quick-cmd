# API Dev Quick CMD

Project nay cung cap bo du lieu command-line cho developer va mot REST API nho de truy van nhanh danh sach lenh.

## Muc tieu

- Luu tru command theo category (git, docker, laravel, linux, mysql, nginx, node, ssh, recipes).
- Phuc vu extension hoac frontend thong qua API `/api/v1/*`.
- API doc du lieu truc tiep tu MariaDB.

## Cau truc thu muc

- `data/`: JSON upload source va queue file cho import worker.
- `docs/`: Tai lieu planning, architecture, migration.
- `api/`: Node.js + TypeScript + Express server.

## Yeu cau moi truong

- Node.js 18+ (khuyen nghi Node.js 20+).
- npm 9+.
- MariaDB da duoc khoi tao schema.

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
- `DATABASE_DRIVER`: Che do data source (`mariadb` hoac `json`, default `mariadb`).
- `DB_HOST`: MariaDB host (default `127.0.0.1`).
- `DB_PORT`: MariaDB port (default `3306`).
- `DB_NAME`: Ten database (default `api_dev_quick_cmd`).
- `DB_USER`: Username ket noi DB.
- `DB_PASSWORD`: Password ket noi DB.
- `DB_CONNECTION_LIMIT`: Gioi han ket noi pool (default `10`).
- `DB_CONNECT_TIMEOUT_MS`: Timeout ket noi DB (default `10000`).

Vi du (PowerShell):

```powershell
$env:PORT=9000
$env:DATASET_VERSION="2026-05-01"
$env:CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
$env:DATABASE_DRIVER="mariadb"
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_NAME="api_dev_quick_cmd"
$env:DB_USER="root"
$env:DB_PASSWORD=""
npm --prefix api run dev
```

## API Endpoints

Tat ca endpoint doc du lieu (`categories`, `commands`, `command detail`, `search`) deu truy van tu MariaDB.

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

### 7) Upload JSON file

- `POST /api/v1/upload-json`
- Content-Type: `multipart/form-data`
- Field bat buoc: `file`
- Chi nhan file co duoi `.json`, kich thuoc toi da `2MB`.
- File upload hop le se duoc luu vao thu muc `data/`.
- API se validate schema JSON theo format `{ category, commands[] }`.
- API khong import database trong request upload.
- Sau khi luu file, API ghi metadata job vao thu muc `data/import-queue/`.
- Viec import vao DB de job khac xu ly sau, API tra ve `database.status = deferred`.

Vi du bang `curl`:

```bash
curl -X POST http://localhost:8787/api/v1/upload-json \
  -F "file=@data/ssh.json"
```

Vi du bang PowerShell:

```powershell
curl.exe -X POST "http://localhost:8787/api/v1/upload-json" -F "file=@data/ssh.json"
```

Response mau:

```json
{
  "message": "JSON uploaded successfully",
  "fileName": "ssh.json",
  "savedTo": "data",
  "category": "ssh",
  "database": {
    "driver": "mariadb",
    "status": "deferred",
    "importedCommands": 0
  },
  "queue": {
    "jobId": "3f9d3c0b-6b0b-4c78-bf57-8ff5a0f68c6d",
    "status": "pending",
    "file": "import-queue/2026-04-24T09-15-12-125Z-3f9d3c0b-6b0b-4c78-bf57-8ff5a0f68c6d.json"
  }
}
```

Noi dung queue file mau:

```json
{
  "jobId": "3f9d3c0b-6b0b-4c78-bf57-8ff5a0f68c6d",
  "type": "dataset-import",
  "status": "pending",
  "createdAt": "2026-04-24T09:15:12.125Z",
  "fileName": "ssh.json",
  "filePath": "ssh.json",
  "category": "ssh",
  "commandCount": 13
}
```

### 8) Queue jobs

- `GET /api/v1/import-queue`
- Tra ve danh sach job trong `data/import-queue/`, sap xep moi nhat truoc.
- Moi job co the o mot trong cac trang thai: `pending`, `processing`, `done`, `failed`.

Vi du:

```text
GET /api/v1/import-queue
```

Response mau:

```json
{
  "data": [
    {
      "jobId": "3f9d3c0b-6b0b-4c78-bf57-8ff5a0f68c6d",
      "status": "done",
      "queueFile": "import-queue/2026-04-24T09-15-12-125Z-3f9d3c0b-6b0b-4c78-bf57-8ff5a0f68c6d.json",
      "category": "ssh",
      "commandCount": 13,
      "importedCommands": 13,
      "attempts": 1,
      "createdAt": "2026-04-24T09:15:12.125Z",
      "startedAt": "2026-04-24T09:16:01.000Z",
      "finishedAt": "2026-04-24T09:16:02.100Z"
    }
  ],
  "version": "2026-04-24"
}
```

### 9) Worker import queue

- Worker doc cac file `data/import-queue/*.json` co trang thai `pending`.
- Khi bat dau import, worker doi status thanh `processing`.
- Import thanh cong thi doi status thanh `done` va ghi `importedCommands`.
- Import loi thi doi status thanh `failed` va ghi `errorMessage`.
- Worker yeu cau `DATABASE_DRIVER=mariadb` va DB connection hop le.

Chay worker:

```bash
npm --prefix api run worker
```

PowerShell:

```powershell
npm --prefix api run worker
```

## Test nhanh bang PowerShell

```powershell
Invoke-RestMethod -Uri http://localhost:8787/health | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://localhost:8787/api/v1/categories | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "http://localhost:8787/api/v1/search?q=pull&limit=5" | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "http://localhost:8787/api/v1/import-queue" | ConvertTo-Json -Depth 6
```

## Ghi chu implementation

- API doc categories va commands tu MariaDB thong qua `api/src/command-repository.ts`.
- Cau hinh database tap trung tai `api/src/config/database.ts`.
- Mau bien moi truong tai `api/.env.example`.
- SQL khoi tao MariaDB tai `api/db/mariadb.schema.sql`.
- Upload endpoint luu file JSON va tao queue file trong `data/import-queue`; import vao MariaDB do worker rieng dam nhiem.
- Worker queue nam tai `api/src/worker.ts` va co lenh chay `npm --prefix api run worker`.
- File JSON khong con duoc dung lam source doc truc tiep cho API.
- Search dang dung scoring don gian trong `api/src/search.ts`.

## Huong phat trien tiep

- Them validate query params chuan hon (zod/valibot).
- Them automated test endpoint (vitest + supertest).
- Can nhac migration sang DB/API hosted theo tai lieu trong `docs/07-api-migration.md`.
