export function parseISODateOrToday(value?: string): Date {
  if (!value) return new Date();
  // 'YYYY-MM-DD' -> Date
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function toISODate(d: Date): string {
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfNextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

// Semana começando na segunda (igual PT)
export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0=Dom ... 6=Sáb
  const diff = day === 0 ? -6 : 1 - day; // se domingo volta 6 dias
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}