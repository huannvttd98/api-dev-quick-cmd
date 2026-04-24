import * as mariadb from "mariadb";
import type { DatabaseConfig } from "./config/database.js";
import type { Category, CategoryId, Command, CommandStep, Placeholder } from "./types.js";

interface CategoryRow {
  id: string;
  label: string;
  emoji: string;
  count: number;
}

interface CommandRow {
  id: string;
  category_id: CategoryId;
  title: string;
  command_text: string;
  description_text: string | null;
  docs_text: string | null;
  tags_json: string | string[] | null;
  placeholders_json: string | Placeholder[] | null;
  examples_json: string | string[] | null;
  steps_json: string | CommandStep[] | null;
}

function parseJsonArray<T>(value: string | T[] | null): T[] | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value : undefined;
  }

  const parsed = JSON.parse(value) as T[];
  return parsed.length > 0 ? parsed : undefined;
}

function mapCommandRow(row: CommandRow): Command {
  return {
    id: row.id,
    category: row.category_id,
    title: row.title,
    command: row.command_text,
    description: row.description_text ?? undefined,
    docs: row.docs_text ?? undefined,
    tags: parseJsonArray<string>(row.tags_json),
    placeholders: parseJsonArray<Placeholder>(row.placeholders_json),
    examples: parseJsonArray<string>(row.examples_json),
    steps: parseJsonArray<CommandStep>(row.steps_json),
  };
}

function createPool(config: DatabaseConfig): mariadb.Pool {
  if (config.driver !== "mariadb") {
    throw new Error("API requires DATABASE_DRIVER=mariadb");
  }

  return mariadb.createPool({
    host: config.mariadb.host,
    port: config.mariadb.port,
    database: config.mariadb.database,
    user: config.mariadb.user,
    password: config.mariadb.password,
    connectionLimit: config.mariadb.connectionLimit,
    connectTimeout: config.mariadb.connectTimeoutMs,
  });
}

export class CommandRepository {
  private readonly pool: mariadb.Pool;

  constructor(private readonly config: DatabaseConfig) {
    this.pool = createPool(config);
  }

  async listCategories(): Promise<Array<Category & { count: number }>> {
    const rows = await this.pool.query<CategoryRow[]>(`
      SELECT c.id, c.label, c.emoji, COUNT(cmd.id) AS count
      FROM categories c
      LEFT JOIN commands cmd
        ON cmd.category_id = c.id
        AND cmd.is_active = 1
      GROUP BY c.id, c.label, c.emoji, c.sort_order
      ORDER BY c.sort_order ASC, c.id ASC
    `);

    return rows.map((row) => ({
      id: row.id as CategoryId,
      label: row.label,
      emoji: row.emoji,
      count: Number(row.count ?? 0),
    }));
  }

  async listCommands(category: string | undefined, page: number, perPage: number): Promise<{
    data: Command[];
    total: number;
  }> {
    const filters: string[] = ["is_active = 1"];
    const params: Array<string | number> = [];

    if (category) {
      filters.push("category_id = ?");
      params.push(category);
    }

    const whereClause = `WHERE ${filters.join(" AND ")}`;
    const countRows = await this.pool.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM commands ${whereClause}`,
      params,
    );

    const offset = (page - 1) * perPage;
    const rows = await this.pool.query<CommandRow[]>(
      `
        SELECT
          id,
          category_id,
          title,
          command_text,
          description_text,
          docs_text,
          tags_json,
          placeholders_json,
          examples_json,
          steps_json
        FROM commands
        ${whereClause}
        ORDER BY id ASC
        LIMIT ? OFFSET ?
      `,
      [...params, perPage, offset],
    );

    return {
      data: rows.map(mapCommandRow),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async getCommandById(id: string): Promise<Command | null> {
    const rows = await this.pool.query<CommandRow[]>(
      `
        SELECT
          id,
          category_id,
          title,
          command_text,
          description_text,
          docs_text,
          tags_json,
          placeholders_json,
          examples_json,
          steps_json
        FROM commands
        WHERE id = ? AND is_active = 1
        LIMIT 1
      `,
      [id],
    );

    return rows[0] ? mapCommandRow(rows[0]) : null;
  }

  async searchCommands(query: string, limit: number): Promise<Command[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      const rows = await this.pool.query<CommandRow[]>(
        `
          SELECT
            id,
            category_id,
            title,
            command_text,
            description_text,
            docs_text,
            tags_json,
            placeholders_json,
            examples_json,
            steps_json
          FROM commands
          WHERE is_active = 1
          ORDER BY id ASC
          LIMIT ?
        `,
        [limit],
      );
      return rows.map(mapCommandRow);
    }

    const like = `%${trimmed.toLowerCase()}%`;
    const rows = await this.pool.query<CommandRow[]>(
      `
        SELECT
          id,
          category_id,
          title,
          command_text,
          description_text,
          docs_text,
          tags_json,
          placeholders_json,
          examples_json,
          steps_json
        FROM commands
        WHERE is_active = 1
          AND (
            LOWER(id) LIKE ?
            OR LOWER(title) LIKE ?
            OR LOWER(command_text) LIKE ?
            OR LOWER(COALESCE(description_text, '')) LIKE ?
            OR LOWER(COALESCE(tags_json, '')) LIKE ?
          )
        ORDER BY id ASC
        LIMIT ?
      `,
      [like, like, like, like, like, Math.max(limit * 5, 50)],
    );

    return rows.map(mapCommandRow);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}