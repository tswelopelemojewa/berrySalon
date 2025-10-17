
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

// Initialize the database connection and execute the schema
export async function initDb() {
  const db = await open({
    filename: path.resolve('./db/salon.db'),
    driver: sqlite3.Database
  });

  // Read the schema file
  const schemaFile = path.resolve('db', 'schema.sql');
  const schema = await fs.readFile(schemaFile, 'utf8');

  // Execute its SQL content
  await db.exec(schema);

  return db;
}
