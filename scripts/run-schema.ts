/**
 * Executes supabase-schema.sql against the Supabase Postgres database.
 * Run with: bun scripts/run-schema.ts
 */
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

// Session-mode pooler (port 5432) supports DDL unlike transaction-mode (6543)
const sql = postgres({
  host: "aws-0-us-east-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  username: "postgres.vrgjkhkeimegxexszgqe",
  password: "4D!uS#!uClwxQ3#M",
  ssl: "require",
});

async function main() {
  const schemaPath = join(import.meta.dir, "supabase-schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Split by semicolons but respect $$ blocks (PL/pgSQL functions)
  // Strategy: execute the whole thing as a single statement using DO block won't work for DDL
  // Instead, split carefully around $$ blocks
  const statements: string[] = [];
  let current = "";
  let inDollarBlock = false;

  for (const line of schema.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") || trimmed === "") {
      current += line + "\n";
      continue;
    }

    // Track $$ blocks
    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (dollarCount % 2 === 1) {
      inDollarBlock = !inDollarBlock;
    }

    current += line + "\n";

    if (!inDollarBlock && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith("--")) {
        statements.push(stmt);
      }
      current = "";
    }
  }

  // Handle any remaining statement
  if (current.trim()) {
    statements.push(current.trim());
  }

  console.log(`Found ${statements.length} SQL statements to execute.\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.slice(0, 80).replace(/\n/g, " ");
    try {
      await sql.unsafe(stmt);
      console.log(`  [${i + 1}/${statements.length}] ✓ ${preview}...`);
      success++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [${i + 1}/${statements.length}] ✗ ${preview}...`);
      console.error(`    Error: ${msg}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed.`);
  await sql.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
