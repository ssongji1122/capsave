import * as SQLite from 'expo-sqlite';
import { AnalysisResult, CaptureCategory, PlaceInfo } from './ai-analyzer';
export type { CaptureCategory };

interface CaptureRow {
  id: number;
  category: string;
  title: string;
  summary: string;
  place_name: string | null;
  address: string | null;
  places: string | null;
  extracted_text: string;
  links: string;
  tags: string;
  source: string;
  image_uri: string;
  confidence: number | null;
  source_account_id: string | null;
  created_at: string;
}

export interface CaptureItem {
  id: number;
  category: CaptureCategory;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extractedText: string;
  links: string[];
  tags: string[];
  source: string;
  imageUri: string;
  confidence: number | null;
  sourceAccountId: string | null;
  createdAt: string;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('scrave.db');

  // Create table if not exists (original schema)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS captures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      place_name TEXT,
      address TEXT,
      extracted_text TEXT DEFAULT '',
      links TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      source TEXT DEFAULT 'other',
      image_uri TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Migration: add new Phase 2 columns
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(captures)"
  );
  const columnNames = new Set(columns.map(c => c.name));

  if (!columnNames.has('places')) {
    await db.execAsync("ALTER TABLE captures ADD COLUMN places TEXT DEFAULT NULL");
  }
  if (!columnNames.has('confidence')) {
    await db.execAsync("ALTER TABLE captures ADD COLUMN confidence REAL DEFAULT NULL");
  }
  if (!columnNames.has('source_account_id')) {
    await db.execAsync("ALTER TABLE captures ADD COLUMN source_account_id TEXT DEFAULT NULL");
  }

  return db;
}

export async function saveCapture(
  analysis: AnalysisResult,
  imageUri: string
): Promise<number> {
  const database = await getDatabase();

  // Derive place_name/address from first place for backward compat
  const firstPlace = analysis.places[0];

  const result = await database.runAsync(
    `INSERT INTO captures (category, title, summary, place_name, address, places, extracted_text, links, tags, source, image_uri, confidence, source_account_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      analysis.category,
      analysis.title,
      analysis.summary,
      firstPlace?.name || null,
      firstPlace?.address || null,
      JSON.stringify(analysis.places),
      analysis.extractedText,
      JSON.stringify(analysis.links),
      JSON.stringify(analysis.tags),
      analysis.source,
      imageUri,
      analysis.confidence,
      analysis.sourceAccountId,
    ]
  );

  return result.lastInsertRowId;
}

export async function getAllCaptures(): Promise<CaptureItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<CaptureRow>(
    'SELECT * FROM captures ORDER BY created_at DESC'
  );

  return rows.map(mapRowToCapture);
}

export async function getCapturesByCategory(
  category: CaptureCategory
): Promise<CaptureItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<CaptureRow>(
    'SELECT * FROM captures WHERE category = ? ORDER BY created_at DESC',
    [category]
  );

  return rows.map(mapRowToCapture);
}

export async function searchCaptures(query: string): Promise<CaptureItem[]> {
  const database = await getDatabase();
  const searchTerm = `%${query}%`;
  const rows = await database.getAllAsync<CaptureRow>(
    `SELECT * FROM captures
     WHERE title LIKE ? OR summary LIKE ? OR extracted_text LIKE ? OR place_name LIKE ? OR tags LIKE ? OR places LIKE ?
     ORDER BY created_at DESC`,
    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
  );

  return rows.map(mapRowToCapture);
}

export async function deleteCapture(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM captures WHERE id = ?', [id]);
}

export async function getCaptureById(id: number): Promise<CaptureItem | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<CaptureRow>(
    'SELECT * FROM captures WHERE id = ?',
    [id]
  );
  return row ? mapRowToCapture(row) : null;
}

function mapRowToCapture(row: CaptureRow): CaptureItem {
  // Parse places from JSONB column, fall back to legacy place_name/address
  let places: PlaceInfo[] = [];
  if (row.places) {
    places = safeJsonParse(row.places, []);
  } else if (row.place_name) {
    places = [{ name: row.place_name, ...(row.address && { address: row.address }) }];
  }

  return {
    id: row.id,
    category: row.category as CaptureCategory,
    title: row.title,
    summary: row.summary,
    places,
    extractedText: row.extracted_text,
    links: safeJsonParse(row.links, []),
    tags: safeJsonParse(row.tags, []),
    source: row.source,
    imageUri: row.image_uri,
    confidence: row.confidence,
    sourceAccountId: row.source_account_id,
    createdAt: row.created_at,
  };
}

/** Replace all cached captures with fresh server data */
export async function replaceAllCaptures(captures: CaptureItem[]): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM captures');
  for (const c of captures) {
    const firstPlace = c.places[0];
    await database.runAsync(
      `INSERT INTO captures (id, category, title, summary, place_name, address, places, extracted_text, links, tags, source, image_uri, confidence, source_account_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.category,
        c.title,
        c.summary,
        firstPlace?.name || null,
        firstPlace?.address || null,
        JSON.stringify(c.places),
        c.extractedText,
        JSON.stringify(c.links),
        JSON.stringify(c.tags),
        c.source,
        c.imageUri,
        c.confidence,
        c.sourceAccountId,
        c.createdAt,
      ]
    );
  }
}

/** Clear all cached captures */
export async function clearAllCaptures(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM captures');
}

/** Get count of local captures (for migration check) */
export async function getLocalCaptureCount(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM captures');
  return row?.count ?? 0;
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
