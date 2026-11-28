import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const legacyRolePromotionMigrations = new Set([
  "005_add_user_roles.sql",
  "006_add_instructor_role.sql",
]);

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log("Running database migrations...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(process.cwd(), "migrations");

    const files = fs
      .readdirSync(migrationsDir)
      .filter(
        (file) =>
          file.endsWith(".sql") &&
          !legacyRolePromotionMigrations.has(file)
      )
      .sort();

    console.log(
      "Skipping historical role-promotion migrations; role schema is handled by the forward-only migration."
    );

    for (const file of files) {
      const result = await client.query(
        "SELECT id FROM schema_migrations WHERE filename = $1",
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`Already executed: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      await client.query("BEGIN");

      try {
        await client.query(sql);

        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );

        await client.query("COMMIT");

        console.log(`Completed: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
