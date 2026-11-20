import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const conn = new DatabaseSync(file);
  conn.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 3000;
  `);
  conn.exec(schema);
  return conn;
}

export const db = open(config.dbFile);

const cache = new Map();

/** Prepared statements are cached by SQL text. */
function stmt(sql) {
  let s = cache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    cache.set(sql, s);
  }
  return s;
}

export const one = (sql, ...params) => stmt(sql).get(...params) ?? null;
export const all = (sql, ...params) => stmt(sql).all(...params);
export const run = (sql, ...params) => stmt(sql).run(...params);

let depth = 0;

/**
 * Runs fn inside a write transaction. Nested calls join the outer one,
 * so services can call each other without worrying about it.
 */
export function transaction(fn) {
  if (depth > 0) return fn();
  db.exec('BEGIN IMMEDIATE');
  depth++;
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    depth--;
  }
}

/** Builds "IN (?, ?, ?)" for a list. An empty list matches nothing. */
export function inList(column, values) {
  if (!values.length) return { sql: '0', params: [] };
  return { sql: `${column} IN (${values.map(() => '?').join(', ')})`, params: values };
}
