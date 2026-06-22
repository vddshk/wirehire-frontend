// ТЗ 10.5: полная таксономия статусов отклика.
// 11 значений; pipeline UI группирует их в 5 видимых колонок плюс
// compact-блок «Закрытые» (hired / rejected / withdrawn / archived).
export type ApplicationStatus =
  | "submitted"
  | "reviewed"
  | "in_progress"
  | "shortlist"
  | "verification"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn"
  | "archived";

export type Application = {
  id: string;
  candidateId: string;
  vacancyId: string;
  status: ApplicationStatus;
  source: "job_apply" | "invited" | "manual";
  appliedAt: string;
  ownerName: string;
  verificationRunId?: string;
  /** Имя кандидата приходит вложенным в Application от бэка — кэшируем тут,
   *  чтобы не дергать /candidates/{id} ради одной строки в воронке. */
  candidateName?: string;
  /** Из вложенного vacancy в ответе /me/applications. */
  vacancyTitle?: string;
  companyName?: string;
  /** С бэка — готов ли profile-report у кандидата отклика. */
  hasProfileReport?: boolean;
  profileReportScore?: number;
};

// Видимая колонка в kanban-pipeline. Не путать с ApplicationStatus —
// статусов 11, колонок только 5 (Новые / Скрининг / Интервью / Кейс / Оффер).
export type PipelineColumn =
  | "new"
  | "screening"
  | "interview"
  | "case"
  | "offer";

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  "new",
  "screening",
  "interview",
  "case",
  "offer",
];

export const PIPELINE_COLUMN_BY_STATUS: Record<
  ApplicationStatus,
  PipelineColumn | "closed"
> = {
  submitted: "new",
  reviewed: "new",
  in_progress: "screening",
  shortlist: "screening",
  verification: "case",
  interview: "interview",
  offer: "offer",
  hired: "closed",
  rejected: "closed",
  withdrawn: "closed",
  archived: "closed",
};

export const PIPELINE_COLUMN_LABEL: Record<PipelineColumn, string> = {
  new: "Новые",
  screening: "Скрининг",
  interview: "Интервью",
  case: "Кейс",
  offer: "Оффер",
};

// Forward / backward navigation between adjacent visible columns. Used by
// kanban kcard buttons. Each move snaps the application status to the canonical
// entry status of the target column.
export const COLUMN_ENTRY_STATUS: Record<PipelineColumn, ApplicationStatus> = {
  // "submitted" живет только на странице вакансии (входящий поток). В воронку
  // отклик попадает по кнопке «В pipeline» уже как "reviewed", поэтому колонка
  // «Новые» = reviewed, а не submitted.
  new: "reviewed",
  screening: "in_progress",
  interview: "interview",
  case: "verification",
  offer: "offer",
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "подан",
  reviewed: "просмотрен",
  in_progress: "в работе",
  shortlist: "в скрининге",
  verification: "приглашен на проверку",
  interview: "приглашен на интервью",
  offer: "offer",
  hired: "нанят",
  rejected: "отклонен",
  withdrawn: "отозван",
  archived: "архивирован",
};
