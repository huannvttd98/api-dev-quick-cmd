import cors from "cors";
import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { CommandRepository } from "./command-repository.js";
import { parseCategoryDataset } from "./dataset.js";
import { getDatabaseConfig } from "./config/database.js";
import { createImportQueueJob, dataDir, readImportQueueJobs } from "./import-queue.js";
import { searchCommands } from "./search.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const apiPrefix = "/api/v1";
const datasetVersion = process.env.DATASET_VERSION ?? "2026-04-24";
const databaseConfig = getDatabaseConfig();
const commandRepository = new CommandRepository(databaseConfig);
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
  commandRepository
    .listCategories()
    .then((data) => {
      res.json({
        data,
        version: datasetVersion,
      });
    })
    .catch((error) => {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load categories" });
    });
});

app.get(`${apiPrefix}/commands`, (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.max(1, Math.min(200, Number(req.query.per_page ?? 100)));

  commandRepository
    .listCommands(category, page, perPage)
    .then(({ data, total }) => {
      res.json({
        data,
        meta: {
          page,
          per_page: perPage,
          total,
          version: datasetVersion,
        },
      });
    })
    .catch((error) => {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load commands" });
    });
});

app.get(`${apiPrefix}/commands/:id`, (req, res) => {
  commandRepository
    .getCommandById(req.params.id)
    .then((command) => {
      if (!command) {
        res.status(404).json({ error: "Command not found" });
        return;
      }

      res.json({ data: command, version: datasetVersion });
    })
    .catch((error) => {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load command" });
    });
});

app.get(`${apiPrefix}/search`, (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)));

  commandRepository
    .searchCommands(q, limit)
    .then((commands) => {
      const data = searchCommands(commands, q, limit).map((item) => ({
        ...item.command,
        score: Number((item.score / 100).toFixed(2)),
      }));

      res.json({ data, version: datasetVersion });
    })
    .catch((error) => {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to search commands" });
    });
});

app.get(`${apiPrefix}/import-queue`, async (_req, res, next) => {
  try {
    const data = await readImportQueueJobs();
    res.json({ data, version: datasetVersion });
  } catch (error) {
    next(error);
  }
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
    const queueJob = await createImportQueueJob(safeFileName, targetPath, dataset);

    res.status(201).json({
      message: "JSON uploaded successfully",
      fileName: safeFileName,
      savedTo: "data",
      category: dataset.category,
      database: {
        driver: databaseConfig.driver,
        status: "deferred",
        importedCommands: 0,
      },
      queue: {
        jobId: queueJob.jobId,
        status: queueJob.status,
        file: queueJob.queueFile,
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
