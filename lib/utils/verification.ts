import type {
  VerificationRunStatus,
  VerificationScope,
} from "@/types/verification";

// Русские подписи для рендера статуса проверки. Совпадают со словарем,
// который HR ожидает увидеть в дашборде и списке проверок.
export const VERIFICATION_STATUS_LABELS: Record<VerificationRunStatus, string> =
  {
    created: "создана",
    waiting_consent: "ждет согласия",
    active: "активна",
    completed: "завершена",
    cancelled: "отменена",
  };

// Скоуп проверки = что именно проверяется в карточке кандидата.
export const VERIFICATION_SCOPE_LABELS: Record<VerificationScope, string> = {
  trust_only: "только trust",
  skills_only: "только навыки",
  full: "полная",
};
