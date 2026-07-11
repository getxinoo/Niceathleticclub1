/**
 * validate-sql.mjs — repo guard for api/sql/
 * ─────────────────────────────────────────────────────────────────────────────
 * The `*.sql` blanket ignore is narrowed so migrations under api/sql/ are
 * version-controlled. This guard makes that safe: it FAILS (exit 1) if any file
 * under api/sql/ looks like a database dump, contains row data, or embeds a
 * secret. Run in CI / predeploy before committing or deploying.
 *
 * Allowed under api/sql/: additive schema DDL only (CREATE TABLE, ALTER TABLE
 * ADD …, CREATE INDEX). NOT allowed: dumps, INSERT/data, DEFINER, credentials.
 *
 * Usage:  node scripts/validate-sql.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_DIR = join(__dirname, '..', 'api', 'sql');

// Patterns that must never appear in a versioned migration (case-insensitive).
const FORBIDDEN = [
  { re: /phpMyAdmin SQL Dump/i,           label: 'phpMyAdmin dump header' },
  { re: /mysqldump/i,                     label: 'mysqldump header' },
  { re: /\bINSERT\s+INTO\b/i,             label: 'INSERT data (dumps carry rows)' },
  { re: /CREATE\s+DEFINER/i,              label: 'CREATE DEFINER (dump artifact)' },
  { re: /\bLOCK\s+TABLES\b/i,             label: 'LOCK TABLES (dump artifact)' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY/,  label: 'private key material' },
  { re: /\b(password|passwd|pwd)\s*[=:]/i, label: 'password value' },
  { re: /\bapi[_-]?key\b\s*[=:]/i,        label: 'api_key value' },
  { re: /\bclient[_-]?secret\b\s*[=:]/i,  label: 'client_secret value' },
  { re: /\bTOKEN_SECRET\b/i,              label: 'JWT TOKEN_SECRET' },
  { re: /\bIBAN\b\s*[=:]/i,               label: 'IBAN value' },
];
// Destructive DDL is blocked too: migrations here must be additive & reversible-safe.
const DESTRUCTIVE = [
  { re: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, label: 'DROP TABLE/DATABASE' },
  { re: /\bTRUNCATE\b/i,                        label: 'TRUNCATE' },
  { re: /\bDELETE\s+FROM\b/i,                    label: 'DELETE FROM' },
  { re: /\bDROP\s+COLUMN\b/i,                    label: 'DROP COLUMN' },
];

async function walk(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

async function main() {
  try { await stat(SQL_DIR); }
  catch { console.log('✅ validate-sql: no api/sql/ directory — nothing to check.'); return; }

  const files = (await walk(SQL_DIR)).filter((f) => /\.sql$/i.test(f));
  const failures = [];
  for (const f of files) {
    const rel = f.replace(join(__dirname, '..') + '\\', '').replace(join(__dirname, '..') + '/', '');
    const content = await readFile(f, 'utf8').catch(() => '');
    for (const { re, label } of [...FORBIDDEN, ...DESTRUCTIVE]) {
      if (re.test(content)) failures.push(`${rel}: forbidden pattern — ${label}`);
    }
  }

  console.log(`\n🔒 validate-sql: scanned ${files.length} file(s) under api/sql/`);
  if (failures.length) {
    console.error(`\n❌ validate-sql FAILED — api/sql/ may contain migrations ONLY (additive DDL, no dumps/data/secrets):`);
    for (const m of failures) console.error(`   ✗ ${m}`);
    process.exit(1);
  }
  console.log('✅ validate-sql PASSED — api/sql/ contains additive migrations only.\n');
}

main().catch((err) => { console.error('validate-sql error:', err.message); process.exit(1); });
