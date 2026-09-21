import "server-only";
import { Pool, type QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("环境变量 DATABASE_URL 未设置，请在 .env 中配置");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("PostgreSQL 连接池发生未捕获错误：", err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development") {
    console.log(`[db] ${text.slice(0, 60)}... (${result.rowCount} 行, ${duration}ms)`);
  }
  return result;
}
