export type VerificationScope = "trust_only" | "skills_only" | "full";

export type ConsentStatus =
  | "not_requested"
  | "requested"
  | "active"
  | "revoked";

export type VerificationRunStatus =
  | "created"
  | "waiting_consent"
  | "active"
  | "completed"
  | "cancelled";

export type VerificationRun = {
  id: string;
  candidateId: string;
  // FR-035: profile-level runs are NOT tied to a vacancy — only created
  // automatically per experience card. vacancyId stays for legacy
  // vacancy-context runs but is now optional.
  vacancyId?: string;
  // FR-014, FR-015a: experience-bound auto run carries experienceId
  experienceId?: string;
  scope: VerificationScope;
  status: VerificationRunStatus;
  consentStatus: ConsentStatus;
  dueAt: string;
  proctoringEnabled: boolean;
  createdAt: string;
  // Опционально приходят с бэка во вложенном объекте `candidate` (HR-ответы),
  // чтобы показать имя в списке без отдельного запроса карточки.
  candidateName?: string;
  candidateHeadline?: string;
  // Исходный статус бэка (10 значений) — наш `status` схлопнут до 5 для UI,
  // но для логики действий (например, показать HR-ревью на awaiting_review)
  // нужен оригинал.
  rawStatus?: string;
};