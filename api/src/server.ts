import cors from "cors";
import express from "express";
import { ALL_COMMANDS, CATEGORIES, COMMAND_BY_ID } from "./catalog.js";
import { searchCommands } from "./search.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const apiPrefix = "/api/v1";
const datasetVersion = process.env.DATASET_VERSION ?? "2026-04-24";
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (corsOrigins.includes("*") || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ["GET", "OPTIONS"],
};

app.disable("x-powered-by");
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
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

app.listen(port, () => {
  // Keep logs concise for local development.
  console.log(`CLI API listening on http://localhost:${port}`);
});
