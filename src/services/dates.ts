export const DAY_MS = 86400000;
export const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
export const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
export const today = (now = new Date()) => asDate(dateOnly(now));
export const daysBetween = (from: Date, to: Date) => Math.floor((today(to).getTime() - today(from).getTime()) / DAY_MS);
