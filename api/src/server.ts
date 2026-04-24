import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { ALL_COMMANDS, CATEGORIES, COMMAND_BY_ID } from "./catalog.js";
import { getDatabaseConfig } from "./config/database.js";
import { searchCommands } from "./search.js";

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
    JSON.parse(uploadedContent);

    const originalBaseName = path.basename(req.file.originalname);
    const safeFileName = originalBaseName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    const targetPath = path.join(dataDir, safeFileName);

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(targetPath, uploadedContent, "utf-8");

    res.status(201).json({
      message: "JSON uploaded successfully",
      fileName: safeFileName,
      savedTo: "data",
    });
  } catch {
    res.status(400).json({ error: "Invalid JSON file content" });
  }
});

app.listen(port, () => {
  // Keep logs concise for local development.
  console.log(`CLI API listening on http://localhost:${port}`);
});
