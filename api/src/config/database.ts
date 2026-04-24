export type DatabaseDriver = "json" | "mariadb";

export interface MariaDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit: number;
  connectTimeoutMs: number;
}

export interface DatabaseConfig {
  driver: DatabaseDriver;
  mariadb: MariaDbConfig;
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const driverRaw = (env.DATABASE_DRIVER ?? "json").toLowerCase();
  const driver: DatabaseDriver = driverRaw === "mariadb" ? "mariadb" : "json";

  return {
    driver,
    mariadb: {
      host: env.DB_HOST ?? "127.0.0.1",
      port: toNumber(env.DB_PORT, 3306),
      database: env.DB_NAME ?? "api_dev_quick_cmd",
      user: env.DB_USER ?? "root",
      password: env.DB_PASSWORD ?? "",
      connectionLimit: toNumber(env.DB_CONNECTION_LIMIT, 10),
      connectTimeoutMs: toNumber(env.DB_CONNECT_TIMEOUT_MS, 10000),
    },
  };
}

export function toMariaDbDsn(config: MariaDbConfig): string {
  const user = encodeURIComponent(config.user);
  const password = encodeURIComponent(config.password);
  return `mariadb://${user}:${password}@${config.host}:${config.port}/${config.database}`;
}
