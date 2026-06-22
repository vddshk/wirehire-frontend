export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_PART_RE = /^[A-Za-zА-Яа-яЕе][A-Za-zА-Яа-яЕе-]+$/;

type RequiredOpts = { required?: boolean };

export function validateFullName(
  value: string,
  opts: RequiredOpts & { emptyMessage?: string } = {}
): string | null {
  const required = opts.required !== false;
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? opts.emptyMessage ?? "Укажите имя и фамилию" : null;
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return "Укажите имя и фамилию";
  if (!parts.every((part) => NAME_PART_RE.test(part))) {
    return "Укажите имя и фамилию";
  }
  return null;
}

export function validateSingleName(
  value: string,
  opts: RequiredOpts & { label?: string } = {}
): string | null {
  const required = opts.required !== false;
  const label = opts.label ?? "имя";
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `Укажите ${label}` : null;
  }
  if (!NAME_PART_RE.test(trimmed)) {
    return `${label[0].toUpperCase()}${label.slice(1)} — минимум 2 символа`;
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Укажите пароль";
  if (value.length < 8) return "Минимум 8 символов";
  return null;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return "Повторите пароль";
  if (confirm !== password) return "Пароли не совпадают";
  return null;
}

export function validateEmail(
  value: string,
  opts: RequiredOpts = {}
): string | null {
  const required = opts.required !== false;
  const trimmed = value.trim();
  if (!trimmed) return required ? "Укажите email" : null;
  if (!EMAIL_RE.test(trimmed)) return "Email указан некорректно";
  return null;
}

export function validatePhone(
  value: string,
  opts: RequiredOpts = {}
): string | null {
  const required = opts.required !== false;
  const trimmed = value.trim();
  if (!trimmed) return required ? "Укажите телефон" : null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 11 || digits.length > 12) {
    return "Телефон указан некорректно";
  }
  return null;
}
