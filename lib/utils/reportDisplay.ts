import type {
  ReportOverallStatus,
  ReportSnapshot,
} from "@/types/reportSnapshot";

const STATUS_RU: Record<ReportOverallStatus, string> = {
  verified: "подтвержден",
  partially_verified: "частично подтвержден",
  questionable: "под вопросом",
  insufficient_data: "недостаточно данных",
};

const ENGLISH_TOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Profile-report:\s*/gi, ""],
  [/Assessment:\s*/gi, "AI-оценка: "],
  [/\bverified\b/gi, "подтвержден"],
  [/\bpartially_verified\b/gi, "частично подтвержден"],
  [/\bquestionable\b/gi, "под вопросом"],
  [/\binsufficient_data\b/gi, "недостаточно данных"],
  [/\bfallback\b/gi, "локальный расчет"],
  [/\bhire\b/gi, "допуск"],
  [/\bhold\b/gi, "уточнение"],
  [/\breject\b/gi, "отказ"],
  [/Итог:\s*/gi, "Итог: "],
  [/Gemini[^\s.,)]*/gi, ""],
  [/\(Gemini[^)]*\)/gi, ""],
  [/Эвристическая оценка[^.]*\./gi, "Автоматическая оценка."],
  [/без AI-провайдера/gi, "автоматически"],
];

/** Для UI без буквы «ё». */
export function withoutYo(text: string): string {
  return text.replace(/ё/g, "е").replace(/Ё/g, "Е");
}

/** Убирает служебный английский из текстов бэка. */
export function localizeReportText(text: string): string {
  let result = text.trim();
  for (const [pattern, replacement] of ENGLISH_TOKEN_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return withoutYo(result);
}

export function reportStatusLabel(status: ReportOverallStatus): string {
  return STATUS_RU[status];
}

/** Краткое описание без дублирования цифр из шапки отчета. */
export function buildReportSummary(snapshot: ReportSnapshot): string {
  const parts: string[] = [];

  if (snapshot.referencesTotalCount > 0) {
    parts.push(
      `Референты: ${snapshot.referencesPositiveCount} из ${snapshot.referencesTotalCount} положительных ответов.`
    );
  }

  if (snapshot.skillsScore != null && snapshot.referencesTotalCount === 0) {
    parts.push("Оценка навыков построена на AI-тестировании профиля.");
  }

  if (snapshot.confidenceLevel === "low") {
    parts.push("Уверенность в выводах пока низкая — часть проверок не завершена.");
  } else if (snapshot.confidenceLevel === "medium") {
    parts.push("Выводы основаны на доступных, но не полных данных.");
  }

  if (parts.length === 0) {
    return `Статус профиля: ${reportStatusLabel(snapshot.effectiveOverallStatus)}.`;
  }

  return parts.join(" ");
}

export function formatReportVersion(
  version: number,
  generatedAt?: string
): string {
  const datePart = generatedAt ? ` · ${generatedAt}` : "";
  return `${version}${datePart}`;
}

export function formatAiProviderLabel(
  provider?: string,
  model?: string
): string | null {
  const raw = [provider, model].filter(Boolean).join(" ").toLowerCase();
  if (!raw) return null;
  if (raw.includes("fallback") || raw.includes("local")) {
    return "локальный расчет";
  }
  if (raw.includes("gemini")) {
    return "AI-оценка WireHire";
  }
  return "AI-оценка";
}
