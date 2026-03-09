import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:password@localhost:5432/postgres";

// Singleton pool
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

/**
 * Create the printi_message table if it does not exist.
 * Called once at app startup.
 */
async function ensureSchema(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS printi_message (
      id SERIAL PRIMARY KEY,
      printer_name TEXT NOT NULL,
      image_data BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await p.query(`
    CREATE INDEX IF NOT EXISTS idx_printi_message_printer_name
    ON printi_message (printer_name);
  `);
}

/**
 * Create the NOTIFY trigger function and trigger.
 * On every INSERT into printi_message, pg_notify('printi_messages', NEW.printer_name).
 */
async function ensureNotifyTrigger(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE OR REPLACE FUNCTION notify_printi_insert()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('printi_messages', NEW.printer_name);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await p.query(`
    DROP TRIGGER IF EXISTS printi_message_notify_trigger ON printi_message;
  `);
  await p.query(`
    CREATE TRIGGER printi_message_notify_trigger
    AFTER INSERT ON printi_message
    FOR EACH ROW
    EXECUTE FUNCTION notify_printi_insert();
  `);
}

/**
 * Insert an image into the message queue for a given printer.
 */
export async function insertMessage(
  printerName: string,
  imageData: Buffer
): Promise<void> {
  const p = getPool();
  await p.query(
    "INSERT INTO printi_message (printer_name, image_data) VALUES ($1, $2)",
    [printerName, imageData]
  );
}

/**
 * Query for the oldest message for a printer using FOR UPDATE SKIP LOCKED.
 * Returns null if no message is available.
 */
export async function queryOldestMessage(
  printerName: string
): Promise<{ id: number; image_data: Buffer } | null> {
  const p = getPool();
  // Use a transaction so FOR UPDATE SKIP LOCKED works correctly
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id, image_data FROM printi_message
       WHERE printer_name = $1
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [printerName]
    );
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const row = result.rows[0];
    // Delete the message
    await client.query("DELETE FROM printi_message WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    return { id: row.id, image_data: row.image_data };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Run schema setup once when this module is first imported at server startup.
// Use a cached promise so it only runs once.
let _setupPromise: Promise<void> | undefined;
export function setupDatabase(): Promise<void> {
  if (!_setupPromise) {
    _setupPromise = (async () => {
      await ensureSchema();
      await ensureNotifyTrigger();
      console.log("[db] Schema and triggers ready");
    })();
  }
  return _setupPromise;
}
