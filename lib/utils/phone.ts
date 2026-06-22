/** Нормализует ввод к 11 цифрам: 7 + 10 цифр номера (8… → 7…). */
export function normalizeRuPhoneDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  } else if (digits.startsWith("9")) {
    digits = "7" + digits;
  } else if (!digits.startsWith("7")) {
    digits = "7" + digits;
  }

  return digits.slice(0, 11);
}

/** Маска: +7 (951) 832-38-95 */
export function formatRuPhoneInput(value: string): string {
  const digits = normalizeRuPhoneDigits(value);
  if (!digits) return "";

  const national = digits.slice(1);
  const a = national.slice(0, 3);
  const b = national.slice(3, 6);
  const c = national.slice(6, 8);
  const d = national.slice(8, 10);

  if (national.length === 0) return "+7";
  if (national.length <= 3) return `+7 (${a}`;
  if (national.length <= 6) return `+7 (${a}) ${b}`;
  if (national.length <= 8) return `+7 (${a}) ${b}-${c}`;
  return `+7 (${a}) ${b}-${c}-${d}`;
}
