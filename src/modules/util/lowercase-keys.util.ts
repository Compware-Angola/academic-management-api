export function lowercaseKeys<T = any>(rows: any[]): T[] {
  return rows.map((row) => {
    const normalized: any = {};
    for (const key in row) {
      normalized[key.toLowerCase()] = row[key];
    }
    return normalized;
  });
}
