import { UserRole } from "./user";

// FR-110+ Admin-side view of platform accounts. Не путать с CurrentUser —
// CurrentUser это session-объект, UserAccount это запись в справочнике
// пользователей, который видит платформенный администратор.
export type UserAccountStatus = "active" | "invited" | "suspended" | "deleted";

export type UserAccount = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyName?: string;
  status: UserAccountStatus;
  createdAt: string;
  lastSeenAt?: string;
};

// FR-016..018 + FR-110 taxonomy entry. Один skill = одна строка в справочнике.
export type SkillTaxonomyEntry = {
  id: string;
  name: string;
  category: "frontend" | "backend" | "mobile" | "data" | "devops" | "design" | "product" | "management" | "other";
  candidatesCount: number;
  vacanciesCount: number;
  hasAssessmentTemplate: boolean;
  updatedAt: string;
};

// FR-042 / FR-110 — шаблон assessment-пакета, который админ модерирует
// и привязывает к skill. Backend будет хранить вопросы + scoring rubric.
export type AssessmentTemplateStatus = "draft" | "published" | "deprecated";

export type AssessmentTemplate = {
  id: string;
  title: string;
  skillName: string;
  category: SkillTaxonomyEntry["category"];
  status: AssessmentTemplateStatus;
  version: number;
  questionsCount: number;
  estimatedMinutes: number;
  updatedAt: string;
  updatedBy: string;
};

// FR-058+ Верификационные веса. На уровне платформы храним один набор
// значений; компания может переопределить в /employer/onboarding (F6b).
export type VerificationWeights = {
  experience: number;
  skills: number;
  proctoring: number;
  references: number;
  manualOverride: number;
  updatedAt: string;
  updatedBy: string;
};

// FR-110 / 11.4 — backend async jobs. Админ видит очереди и их состояние.
export type QueueJobType =
  | "assessment.generate"
  | "verification.scoring"
  | "report.compose"
  | "reference.notify"
  | "notification.deliver";

export type QueueJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "retry"
  | "stuck";

export type QueueJob = {
  id: string;
  type: QueueJobType;
  status: QueueJobStatus;
  payloadSummary: string;
  attempts: number;
  enqueuedAt: string;
  finishedAt?: string;
  errorMessage?: string;
};
