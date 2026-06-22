export type ProfileReportMissingBlock =
  | "experience"
  | "skills"
  | "assessment"
  | "references"
  | "proctoring"
  | "profile";

const MISSING_BLOCK_LABELS: Record<ProfileReportMissingBlock, string> = {
  profile: "заполнение профиля",
  experience: "карточки опыта",
  references: "ответы референтов",
  assessment: "общая AI-оценка",
  skills: "подтверждение навыков",
  proctoring: "прокторинг (опционально)",
};

export function describeMissingReportBlocks(
  blocks?: string[] | null
): string {
  if (!blocks?.length) {
    return "Система собирает отчет профиля автоматически после заполнения профиля, ответов референтов и общей AI-оценки.";
  }

  const labels = blocks
    .map((block) => MISSING_BLOCK_LABELS[block as ProfileReportMissingBlock])
    .filter(Boolean);

  if (labels.length === 0) {
    return "Отчет еще формируется — дождитесь завершения проверок.";
  }

  return `Для отчета не хватает: ${labels.join(", ")}.`;
}
