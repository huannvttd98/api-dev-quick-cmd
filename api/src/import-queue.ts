import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CategoryDataset } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dataDir = path.resolve(__dirname, "../../data");
export const importQueueDir = path.join(dataDir, "import-queue");

export type ImportQueueJobStatus = "pending" | "processing" | "done" | "failed";

export interface ImportQueueJob {
  jobId: string;
  type: "dataset-import";
  status: ImportQueueJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  fileName: string;
  filePath: string;
  queueFile: string;
  category: CategoryDataset["category"];
  commandCount: number;
  importedCommands?: number;
  attempts: number;
  errorMessage?: string;
}

function buildQueueFileName(createdAt: string, jobId: string): string {
  return `${createdAt.replaceAll(/[:.]/g, "-")}-${jobId}.json`;
}

export async function createImportQueueJob(
  fileName: string,
  targetPath: string,
  dataset: CategoryDataset,
): Promise<ImportQueueJob> {
  const jobId = randomUUID();
  const createdAt = new Date().toISOString();
  const queueFile = `import-queue/${buildQueueFileName(createdAt, jobId)}`;
  const queueJob: ImportQueueJob = {
    jobId,
    type: "dataset-import",
    status: "pending",
    createdAt,
    fileName,
    filePath: path.relative(dataDir, targetPath).replaceAll("\\", "/"),
    queueFile,
    category: dataset.category,
    commandCount: dataset.commands.length,
    attempts: 0,
  };

  await fs.mkdir(importQueueDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, queueFile), `${JSON.stringify(queueJob, null, 2)}\n`, "utf-8");

  return queueJob;
}

export async function readImportQueueJobs(): Promise<ImportQueueJob[]> {
  try {
    const fileNames = await fs.readdir(importQueueDir);
    const jobs = await Promise.all(
      fileNames
        .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
        .map(async (fileName) => {
          const queueFile = `import-queue/${fileName}`;
          const fileContent = await fs.readFile(path.join(dataDir, queueFile), "utf-8");
          const parsed = JSON.parse(fileContent) as ImportQueueJob;
          return {
            ...parsed,
            queueFile,
          } satisfies ImportQueueJob;
        }),
    );

    return jobs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function updateImportQueueJob(
  queueFile: string,
  updater: (job: ImportQueueJob) => ImportQueueJob,
): Promise<ImportQueueJob> {
  const absoluteQueueFilePath = path.join(dataDir, queueFile);
  const rawContent = await fs.readFile(absoluteQueueFilePath, "utf-8");
  const currentJob = JSON.parse(rawContent) as ImportQueueJob;
  const nextJob = updater({
    ...currentJob,
    queueFile,
  });

  await fs.writeFile(absoluteQueueFilePath, `${JSON.stringify(nextJob, null, 2)}\n`, "utf-8");
  return nextJob;
}