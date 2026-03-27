import * as SQLite from 'expo-sqlite';
import { AnalysisResult, CaptureCategory } from './ai-analyzer';
export type { CaptureCategory };

interface CaptureRow {
  id: number;
  category: string;
  title: string;
  summary: string;
  place_name: string | null;
  address: string | null;
  extracted_text: string;
  links: string;
  tags: string;
  source: string;
  image_uri: string;
  created_at: string;
}

export interface CaptureItem {
  id: number;
  category: CaptureCategory;
  title: string;
  summary: string;
  placeName: string | null;
  address: string | null;
  extractedText: string;
  links: string[];
  tags: string[];
  source: string;
  imageUri: string;
  createdAt: string;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('capsave.db');
  
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

  return db;
}

export async function saveCapture(
  analysis: AnalysisResult,
  imageUri: string
): Promise<number> {
  const database = await getDatabase();

  const result = await database.runAsync(
    `INSERT INTO captures (category, title, summary, place_name, address, extracted_text, links, tags, source, image_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      analysis.category,
      analysis.title,
      analysis.summary,
      analysis.placeName || null,
      analysis.address || null,
      analysis.extractedText,
      JSON.stringify(analysis.links),
      JSON.stringify(analysis.tags),
      analysis.source,
      imageUri,
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
     WHERE title LIKE ? OR summary LIKE ? OR extracted_text LIKE ? OR place_name LIKE ? OR tags LIKE ?
     ORDER BY created_at DESC`,
    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
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
  return {
    id: row.id,
    category: row.category as CaptureCategory,
    title: row.title,
    summary: row.summary,
    placeName: row.place_name,
    address: row.address,
    extractedText: row.extracted_text,
    links: safeJsonParse(row.links, []),
    tags: safeJsonParse(row.tags, []),
    source: row.source,
    imageUri: row.image_uri,
    createdAt: row.created_at,
  };
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
