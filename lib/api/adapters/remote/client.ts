const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const TOKEN_STORAGE_KEY = "wirehire-auth-token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message ?? `API request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type AuthRequirement = "required" | "optional" | "none";

export interface ApiClientOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: BodyInit | object | null;
  headers?: HeadersInit;
  auth?: AuthRequirement;
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { auth = "optional", body, headers: customHeaders, ...rest } = options;

  const headers = new Headers(customHeaders);
  headers.set("Accept", "application/json");

  if (auth !== "none") {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else if (auth === "required") {
      throw new ApiError(401, { message: "Не авторизован" });
    }
  }

  let finalBody: BodyInit | null | undefined;
  if (body instanceof FormData) {
    finalBody = body;
  } else if (body !== undefined && body !== null && typeof body === "object") {
    headers.set("Content-Type", "application/json");
    finalBody = JSON.stringify(body);
  } else {
    finalBody = body as BodyInit | null | undefined;
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const response = await fetch(url, { ...rest, headers, body: finalBody });

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      // non-JSON body (HTML error page, empty 5xx) — leave null
    }
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null as T;
  }

  return (await response.json()) as T;
}

// Перевод ошибок на русский

const LARAVEL_FIELD_NAMES: Record<string, string> = {
  email: "email",
  password: "пароль",
  password_confirmation: "подтверждение пароля",
  full_name: "имя",
  "full name": "имя",
  fullname: "имя",
  company_public_name: "название компании",
  "company public name": "название компании",
  role: "роль",
  phone: "телефон",
  headline: "заголовок",
  desired_role: "грейд",
  location: "локация",
  summary: "описание",
};

function translateField(raw: string): string {
  return LARAVEL_FIELD_NAMES[raw.toLowerCase()] ?? raw;
}

const ERROR_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [
    /^The (.+) has already been taken\.?$/i,
    (m) => {
      const f = translateField(m[1]);
      return f === "email"
        ? "Этот email уже занят"
        : `Значение поля «${f}» уже занято`;
    },
  ],
  [
    /^The (.+) field is required\.?$/i,
    (m) => `Поле «${translateField(m[1])}» обязательно`,
  ],
  [
    /^The (.+) must be at least (\d+) characters?\.?$/i,
    (m) => {
      const f = translateField(m[1]);
      return f === "пароль"
        ? `Пароль — минимум ${m[2]} символов`
        : `Поле «${f}» — минимум ${m[2]} символов`;
    },
  ],
  [
    /^The (.+) may not be greater than (\d+) characters?\.?$/i,
    (m) => `Поле «${translateField(m[1])}» — максимум ${m[2]} символов`,
  ],
  [
    /^The (.+) must be a valid email address\.?$/i,
    () => "Email указан некорректно",
  ],
  [
    /^The (.+) confirmation does not match\.?$/i,
    () => "Пароли не совпадают",
  ],
  [
    /^These credentials do not match our records\.?$/i,
    () => "Неверный email или пароль",
  ],
  [/^Unauthenticated\.?$/i, () => "Не авторизован"],
  [
    /^Forbidden\. Required role:.*$/i,
    () =>
      "Недостаточно прав для этого действия. Войдите под аккаунтом HR или компании.",
  ],
  [/^Forbidden\.?$/i, () => "Недостаточно прав для просмотра этой страницы"],
  [
    /^The selected (.+) is invalid\.?$/i,
    (m) => `Неверное значение поля «${translateField(m[1])}»`,
  ],
  [
    /^The given data was invalid\.?$/i,
    () => "Данные введены некорректно",
  ],
  [
    /^The answers\.\d+\.answer field is required\.?$/i,
    () => "Ответьте на все вопросы теста",
  ],
  [
    /^Start the test before submitting\.?$/i,
    () => "Сначала начните сессию теста",
  ],
];

export function translateLaravelError(message: string): string {
  const trimmed = message.trim();
  for (const [pattern, replacer] of ERROR_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return replacer(match);
  }
  return trimmed.replace(/\.$/, "");
}

export function getErrorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const fieldErrors = err.body?.errors;
    if (fieldErrors) {
      const first = Object.values(fieldErrors)[0]?.[0];
      if (first) return translateLaravelError(first);
    }
    if (err.body?.message) {
      return translateLaravelError(err.body.message);
    }
  }
  return fallback;
}
