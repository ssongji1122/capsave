export function countDistinctUsers(rows: { user_id: string | null }[]): number {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.user_id !== null) {
      ids.add(row.user_id);
    }
  }
  return ids.size;
}
