import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { getDatabaseConfig } from "./config/database.js";
import { parseCategoryDataset } from "./dataset.js";
import { importDatasetToMariaDb } from "./importer.js";
import { dataDir, readImportQueueJobs, updateImportQueueJob } from "./import-queue.js";

async function processQueueJob(queueFile: string): Promise<void> {
  const startedAt = new Date().toISOString();
  const processingJob = await updateImportQueueJob(queueFile, (job) => ({
    ...job,
    status: "processing",
    startedAt,
    attempts: job.attempts + 1,
    errorMessage: undefined,
  }));

  try {
    const datasetContent = await fs.readFile(path.join(dataDir, processingJob.filePath), "utf-8");
    const dataset = parseCategoryDataset(JSON.parse(datasetContent));
    const importedCommands = await importDatasetToMariaDb(dataset, getDatabaseConfig());

    await updateImportQueueJob(queueFile, (job) => ({
      ...job,
      status: "done",
      finishedAt: new Date().toISOString(),
      importedCommands,
      errorMessage: undefined,
    }));

    console.log(`Processed ${queueFile}: imported ${importedCommands} commands.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import error";
    await updateImportQueueJob(queueFile, (job) => ({
      ...job,
      status: "failed",
      finishedAt: new Date().toISOString(),
      errorMessage: message,
    }));
    console.error(`Failed ${queueFile}: ${message}`);
  }
}

async function main(): Promise<void> {
  const databaseConfig = getDatabaseConfig();
  if (databaseConfig.driver !== "mariadb") {
    throw new Error("Worker requires DATABASE_DRIVER=mariadb");
  }

  const jobs = await readImportQueueJobs();
  const pendingJobs = jobs
    .filter((job) => job.status === "pending")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  if (pendingJobs.length === 0) {
    console.log("No pending import jobs found.");
    return;
  }

  console.log(`Processing ${pendingJobs.length} import job(s)...`);
  for (const job of pendingJobs) {
    await processQueueJob(job.queueFile);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Worker failed unexpectedly";
  console.error(message);
  process.exitCode = 1;
});