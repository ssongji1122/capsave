import { CaptureItem, CaptureRow, CaptureCategory } from '../types/capture';

export function mapRowToCapture(row: CaptureRow): CaptureItem {
  return {
    id: row.id,
    category: row.category as CaptureCategory,
    title: row.title,
    summary: row.summary,
    places: row.places ?? [],
    extractedText: row.extracted_text,
    links: row.links ?? [],
    tags: row.tags ?? [],
    source: row.source,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

export function mapCaptureToRow(item: Partial<CaptureItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (item.category !== undefined) row.category = item.category;
  if (item.title !== undefined) row.title = item.title;
  if (item.summary !== undefined) row.summary = item.summary;
  if (item.places !== undefined) row.places = item.places;
  if (item.extractedText !== undefined) row.extracted_text = item.extractedText;
  if (item.links !== undefined) row.links = item.links;
  if (item.tags !== undefined) row.tags = item.tags;
  if (item.source !== undefined) row.source = item.source;
  if (item.imageUrl !== undefined) row.image_url = item.imageUrl;
  return row;
}
