import { Transform } from 'class-transformer';

export function ToBoolean() {
  return Transform(({ value }) => {
    if (value === undefined || value === null) return false;

    if (typeof value === 'boolean') return value;

    const val = String(value).toLowerCase().trim();

    return ['true', '1', 'yes', 'on'].includes(val);
  });
}