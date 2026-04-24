import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as mariadb from "mariadb";
import multer from "multer";
import { ALL_COMMANDS, CATEGORIES, COMMAND_BY_ID } from "./catalog.js";
import { getDatabaseConfig } from "./config/database.js";
import { searchCommands } from "./search.js";
import type { CategoryDataset, Command } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const apiPrefix = "/api/v1";
const datasetVersion = process.env.DATASET_VERSION ?? "2026-04-24";
const databaseConfig = getDatabaseConfig();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../../data");
const corsOrigins = new Set(
  (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (corsOrigins.has("*") || corsOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 2,
  },
});
const categoryIdSet = new Set(CATEGORIES.map((category) => category.id));

function toNullableJson(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value) && value.length === 0) {
    return null;
  }

  return JSON.stringify(value);
}

function normalizeCommand(raw: unknown): Omit<Command, "category"> {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("Each command must be an object");
  }

  const command = raw as Partial<Omit<Command, "category">>;
  if (!command.id || typeof command.id !== "string") {
    throw new TypeError("Command id is required and must be string");
  }

  if (!command.title || typeof command.title !== "string") {
    throw new TypeError(`Command '${command.id}' title is required`);
  }

  if (!command.command || typeof command.command !== "string") {
    throw new TypeError(`Command '${command.id}' command is required`);
  }

  return {
    id: command.id,
    title: command.title,
    command: command.command,
    description: typeof command.description === "string" ? command.description : undefined,
    docs: typeof command.docs === "string" ? command.docs : undefined,
    tags: Array.isArray(command.tags) ? command.tags.filter((tag) => typeof tag === "string") : undefined,
    placeholders: Array.isArray(command.placeholders) ? command.placeholders : undefined,
    examples: Array.isArray(command.examples)
      ? command.examples.filter((example) => typeof example === "string")
      : undefined,
    steps: Array.isArray(command.steps) ? command.steps : undefined,
  };
}

function parseCategoryDataset(raw: unknown): CategoryDataset {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("JSON must be an object");
  }

  const parsed = raw as Partial<CategoryDataset>;
  if (!parsed.category || typeof parsed.category !== "string") {
    throw new TypeError("Field 'category' is required and must be string");
  }

  if (!categoryIdSet.has(parsed.category)) {
    throw new RangeError(`Unsupported category '${parsed.category}'`);
  }

  if (!Array.isArray(parsed.commands)) {
    throw new TypeError("Field 'commands' is required and must be array");
  }

  return {
    category: parsed.category,
    commands: parsed.commands.map((item) => normalizeCommand(item)),
  };
}

async function importDatasetToMariaDb(dataset: CategoryDataset): Promise<number> {
  const categoryMeta = CATEGORIES.find((category) => category.id === dataset.category);
  const pool = mariadb.createPool({
    host: databaseConfig.mariadb.host,
    port: databaseConfig.mariadb.port,
    database: databaseConfig.mariadb.database,
    user: databaseConfig.mariadb.user,
    password: databaseConfig.mariadb.password,
    connectionLimit: databaseConfig.mariadb.connectionLimit,
    connectTimeout: databaseConfig.mariadb.connectTimeoutMs,
  });

  let connection: mariadb.PoolConnection | undefined;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
        INSERT INTO categories (id, label, emoji, sort_order)
        VALUES (?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          label = VALUES(label),
          emoji = VALUES(emoji)
      `,
      [dataset.category, categoryMeta?.label ?? dataset.category, categoryMeta?.emoji ?? "📁"],
    );

    for (const command of dataset.commands) {
      await connection.query(
        `
          INSERT INTO commands (
            id,
            category_id,
            title,
            command_text,
            description_text,
            docs_text,
            tags_json,
            placeholders_json,
            examples_json,
            steps_json,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            category_id = VALUES(category_id),
            title = VALUES(title),
            command_text = VALUES(command_text),
            description_text = VALUES(description_text),
            docs_text = VALUES(docs_text),
            tags_json = VALUES(tags_json),
            placeholders_json = VALUES(placeholders_json),
            examples_json = VALUES(examples_json),
            steps_json = VALUES(steps_json),
            is_active = 1
        `,
        [
          command.id,
          dataset.category,
          command.title,
          command.command,
          command.description ?? null,
          command.docs ?? null,
          toNullableJson(command.tags),
          toNullableJson(command.placeholders),
          toNullableJson(command.examples),
          toNullableJson(command.steps),
        ],
      );
    }

    await connection.commit();
    return dataset.commands.length;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

app.disable("x-powered-by");
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    driver: databaseConfig.driver,
  });
});

app.get(`${apiPrefix}/version`, (_req, res) => {
  res.json({ version: datasetVersion });
});

app.get(`${apiPrefix}/categories`, (_req, res) => {
  const countByCategory = new Map<string, number>();
  for (const cmd of ALL_COMMANDS) {
    countByCategory.set(cmd.category, (countByCategory.get(cmd.category) ?? 0) + 1);
  }

  const data = CATEGORIES.map((cat) => ({
    ...cat,
    count: countByCategory.get(cat.id) ?? 0,
  }));

  res.json({
    data,
    version: datasetVersion,
  });
});

app.get(`${apiPrefix}/commands`, (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.max(1, Math.min(200, Number(req.query.per_page ?? 100)));

  const filtered = category
    ? ALL_COMMANDS.filter((c) => c.category === category)
    : ALL_COMMANDS;

  const start = (page - 1) * perPage;
  const data = filtered.slice(start, start + perPage);

  res.json({
    data,
    meta: {
      page,
      per_page: perPage,
      total: filtered.length,
      version: datasetVersion,
    },
  });
});

app.get(`${apiPrefix}/commands/:id`, (req, res) => {
  const command = COMMAND_BY_ID.get(req.params.id);
  if (!command) {
    res.status(404).json({ error: "Command not found" });
    return;
  }

  res.json({ data: command, version: datasetVersion });
});

app.get(`${apiPrefix}/search`, (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)));

  const data = searchCommands(ALL_COMMANDS, q, limit).map((item) => ({
    ...item.command,
    score: Number((item.score / 100).toFixed(2)),
  }));

  res.json({ data, version: datasetVersion });
});

app.post(`${apiPrefix}/upload-json`, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing file field 'file'" });
      return;
    }

    if (!req.file.originalname.toLowerCase().endsWith(".json")) {
      res.status(400).json({ error: "Only .json files are allowed" });
      return;
    }

    const uploadedContent = req.file.buffer.toString("utf-8");
    const parsed = JSON.parse(uploadedContent);
    const dataset = parseCategoryDataset(parsed);

    const originalBaseName = path.basename(req.file.originalname);
    const safeFileName = originalBaseName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    const targetPath = path.join(dataDir, safeFileName);

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(targetPath, uploadedContent, "utf-8");

    let importedCommands = 0;
    let databaseStatus: "imported" | "skipped" = "skipped";
    if (databaseConfig.driver === "mariadb") {
      importedCommands = await importDatasetToMariaDb(dataset);
      databaseStatus = "imported";
    }

    res.status(201).json({
      message: "JSON uploaded successfully",
      fileName: safeFileName,
      savedTo: "data",
      category: dataset.category,
      database: {
        driver: databaseConfig.driver,
        status: databaseStatus,
        importedCommands,
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid JSON file content" });
      return;
    }

    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Unexpected upload error" });
  }
});

app.listen(port, () => {
  // Keep logs concise for local development.
  console.log(`CLI API listening on http://localhost:${port}`);
});
