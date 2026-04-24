import * as mariadb from "mariadb";
import { CATEGORIES } from "./catalog.js";
import type { DatabaseConfig } from "./config/database.js";
import type { CategoryDataset } from "./types.js";

function toNullableJson(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value) && value.length === 0) {
    return null;
  }

  return JSON.stringify(value);
}

export async function importDatasetToMariaDb(
  dataset: CategoryDataset,
  databaseConfig: DatabaseConfig,
): Promise<number> {
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