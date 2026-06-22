// ДД.ММ.ГГГГ — основной формат для всего интерфейса.
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// ДД.ММ.ГГГГ HH:MM — для строк где раньше использовали toLocaleString.
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const now = Date.now();
  const diffMs = now - then;
  const day = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / day);

  if (diffDays <= 0) return "сегодня";
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return `${diffDays} ${pluralize(diffDays, "день", "дня", "дней")} назад`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${pluralize(weeks, "неделю", "недели", "недель")} назад`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${pluralize(months, "месяц", "месяца", "месяцев")} назад`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} ${pluralize(years, "год", "года", "лет")} назад`;
}

function pluralize(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

const MONTHS_RU = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

function monthIndex(name: string): number | null {
  const idx = MONTHS_RU.indexOf(name.trim().toLowerCase());
  return idx === -1 ? null : idx + 1;
}

/**
 * Распарсить «Январь 2020 — Июнь 2023» или
 * «Январь 2020 — по настоящее время» в start_date / end_date (YYYY-MM-01).
 */
export function parseRuPeriod(
  period: string
): { startDate: string; endDate?: string } | null {
  if (!period || !period.trim()) return null;
  const parts = period.split(/[—–-]/).map((p) => p.trim());

  function parseOnePart(part: string): string | null {
    const ymd = part.match(/^(\d{4})[-./]?(\d{1,2})?$/);
    if (ymd) {
      const y = ymd[1];
      const m = (ymd[2] ?? "01").padStart(2, "0");
      return `${y}-${m}-01`;
    }
    const monthYear = part.match(/^([А-Яа-яЕе]+)\s+(\d{4})$/);
    if (monthYear) {
      const m = monthIndex(monthYear[1]);
      if (m) return `${monthYear[2]}-${String(m).padStart(2, "0")}-01`;
    }
    const yearOnly = part.match(/(\d{4})/);
    if (yearOnly) return `${yearOnly[1]}-01-01`;
    return null;
  }

  const startDate = parseOnePart(parts[0]);
  if (!startDate) return null;
  if (parts.length === 1) return { startDate };

  const endPart = parts[1].toLowerCase();
  if (endPart.includes("настоящ") || endPart.includes("сейчас")) {
    return { startDate, endDate: undefined };
  }
  const endDate = parseOnePart(parts[1]);
  return { startDate, endDate: endDate ?? undefined };
}

/**
 * Валидация диапазона из DateRangePicker.
 * null = ок (пустой или валидный), иначе текст ошибки.
 */
export function validateRuPeriod(period: string): string | null {
  if (!period || !period.trim()) return null;
  const parsed = parseRuPeriod(period);
  if (!parsed) return null;
  if (!parsed.endDate) return null;
  if (new Date(parsed.endDate) < new Date(parsed.startDate)) {
    return "Дата окончания раньше даты начала";
  }
  return null;
}
