#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-api_dev_quick_cmd}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
SCHEMA_ONLY="${SCHEMA_ONLY:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCHEMA_FILE="${ROOT_DIR}/api/db/mariadb.schema.sql"
DATA_DIR="${ROOT_DIR}/data"
TEMP_SQL="${ROOT_DIR}/api/db/seed.from-json.sql"

if [[ ! -f "${SCHEMA_FILE}" ]]; then
  echo "Schema file not found: ${SCHEMA_FILE}" >&2
  exit 1
fi

if [[ ! -d "${DATA_DIR}" ]]; then
  echo "Data directory not found: ${DATA_DIR}" >&2
  exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql CLI is required but not found in PATH" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not found in PATH" >&2
  exit 1
fi

MYSQL_BASE=(
  mysql
  "--host=${DB_HOST}"
  "--port=${DB_PORT}"
  "--user=${DB_USER}"
  "--default-character-set=utf8mb4"
)

if [[ -n "${DB_PASSWORD}" ]]; then
  MYSQL_BASE+=("--password=${DB_PASSWORD}")
fi

echo "[1/3] Applying schema from ${SCHEMA_FILE}"
"${MYSQL_BASE[@]}" < "${SCHEMA_FILE}"

if [[ "${SCHEMA_ONLY}" == "1" ]]; then
  echo "Schema applied. Skip seeding because SCHEMA_ONLY=1"
  exit 0
fi

echo "[2/3] Building SQL from JSON files"
python3 - "${DATA_DIR}" "${TEMP_SQL}" <<'PY'
import json
import sys
from pathlib import Path

data_dir = Path(sys.argv[1])
out_file = Path(sys.argv[2])

category_meta = {
    "git": {"label": "Git", "emoji": "🌿", "sort_order": 1},
    "apache": {"label": "Apache", "emoji": "🪶", "sort_order": 2},
    "docker": {"label": "Docker", "emoji": "🐳", "sort_order": 3},
    "laravel": {"label": "Laravel", "emoji": "🚀", "sort_order": 4},
    "linux": {"label": "Linux", "emoji": "🐧", "sort_order": 5},
    "mysql": {"label": "MySQL", "emoji": "🗄️", "sort_order": 6},
    "nginx": {"label": "Nginx", "emoji": "🌐", "sort_order": 7},
    "node": {"label": "Node.js", "emoji": "📦", "sort_order": 8},
    "ssh": {"label": "SSH/SCP", "emoji": "🔑", "sort_order": 9},
    "recipes": {"label": "Recipes", "emoji": "📖", "sort_order": 10},
}

def q(value):
    if value is None:
        return "NULL"
    if not isinstance(value, str):
        value = str(value)
    value = value.replace("\\", "\\\\").replace("'", "''")
    return f"'{value}'"

def q_json(value):
    if value is None:
        return "NULL"
    return q(json.dumps(value, ensure_ascii=False, separators=(",", ":")))

json_files = sorted([p for p in data_dir.glob("*.json") if p.is_file()])
if not json_files:
    raise SystemExit(f"No JSON files found in {data_dir}")

lines = []
lines.append("SET NAMES utf8mb4;")
lines.append("START TRANSACTION;")

category_ids = []
row_count = 0

for file_path in json_files:
    with file_path.open("r", encoding="utf-8") as f:
        dataset = json.load(f)

    category = dataset.get("category")
    commands = dataset.get("commands")
    if not category or not isinstance(commands, list):
        continue

    category_ids.append(category)
    meta = category_meta.get(category, {"label": category, "emoji": "📁", "sort_order": 999})
    lines.append(
        "INSERT INTO categories (id, label, emoji, sort_order) VALUES "
        f"({q(category)}, {q(meta['label'])}, {q(meta['emoji'])}, {int(meta['sort_order'])}) "
        "ON DUPLICATE KEY UPDATE "
        "label=VALUES(label), emoji=VALUES(emoji), sort_order=VALUES(sort_order);"
    )

for category in sorted(set(category_ids)):
    lines.append(f"DELETE FROM commands WHERE category_id = {q(category)};")

for file_path in json_files:
    with file_path.open("r", encoding="utf-8") as f:
        dataset = json.load(f)

    category = dataset.get("category")
    commands = dataset.get("commands")
    if not category or not isinstance(commands, list):
        continue

    for cmd in commands:
        lines.append(
            "INSERT INTO commands "
            "(id, category_id, title, command_text, description_text, docs_text, tags_json, placeholders_json, examples_json, steps_json, is_active) "
            "VALUES "
            f"({q(cmd.get('id'))}, {q(category)}, {q(cmd.get('title'))}, {q(cmd.get('command'))}, "
            f"{q(cmd.get('description'))}, {q(cmd.get('docs'))}, {q_json(cmd.get('tags'))}, "
            f"{q_json(cmd.get('placeholders'))}, {q_json(cmd.get('examples'))}, {q_json(cmd.get('steps'))}, 1) "
            "ON DUPLICATE KEY UPDATE "
            "category_id=VALUES(category_id), title=VALUES(title), command_text=VALUES(command_text), "
            "description_text=VALUES(description_text), docs_text=VALUES(docs_text), tags_json=VALUES(tags_json), "
            "placeholders_json=VALUES(placeholders_json), examples_json=VALUES(examples_json), steps_json=VALUES(steps_json), "
            "is_active=VALUES(is_active);"
        )
        row_count += 1

lines.append("COMMIT;")
out_file.parent.mkdir(parents=True, exist_ok=True)
out_file.write_text("\n".join(lines), encoding="utf-8")
print(f"Generated SQL for {row_count} command rows -> {out_file}")
PY

echo "[3/3] Importing generated SQL into ${DB_NAME}"
"${MYSQL_BASE[@]}" "${DB_NAME}" < "${TEMP_SQL}"

echo "Verify counts:"
"${MYSQL_BASE[@]}" -N "${DB_NAME}" -e "SELECT 'categories' AS table_name, COUNT(*) AS total FROM categories UNION ALL SELECT 'commands' AS table_name, COUNT(*) AS total FROM commands;"

echo "Done. Schema + JSON seed completed."
