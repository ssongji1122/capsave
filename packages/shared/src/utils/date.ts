export function getDayBoundaries(dateStr?: string): { start: string; end: string } {
  const date = dateStr ? new Date(dateStr + 'T00:00:00Z') : new Date();
  const start = date.toISOString().split('T')[0];

  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = next.toISOString().split('T')[0];

  return { start, end };
}
