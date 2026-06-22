import {
  Application,
  ApplicationStatus,
  PIPELINE_COLUMN_BY_STATUS,
  PIPELINE_COLUMN_LABEL,
} from "@/types/application";
import type { StatusTone } from "@/components/ui/editorial";
import { formatDate } from "@/lib/utils/date";

export type ApplicationVacancyLookup = {
  id: string;
  title?: string;
  companyName?: string;
};

export function resolveApplicationVacancy(
  application: Application,
  vacancies: ApplicationVacancyLookup[] = []
): { title: string; companyName: string; href: string | null } {
  const vacancy = vacancies.find((item) => item.id === application.vacancyId);
  const title =
    application.vacancyTitle?.trim() ||
    vacancy?.title?.trim() ||
    "Вакансия";
  const companyName =
    application.companyName?.trim() ||
    vacancy?.companyName?.trim() ||
    "";
  const href = application.vacancyId
    ? `/jobs/${application.vacancyId}`
    : null;

  return { title, companyName, href };
}

export function formatApplicationListTitle(
  application: Application,
  vacancies: ApplicationVacancyLookup[] = []
): string {
  const { title, companyName } = resolveApplicationVacancy(
    application,
    vacancies
  );
  return companyName ? `${title} · ${companyName}` : title;
}

export function formatApplicationMetaLine(application: Application): string {
  const parts: string[] = [];
  if (application.appliedAt) {
    parts.push(`Подан ${formatDate(application.appliedAt)}`);
  }
  const owner = application.ownerName?.trim();
  if (owner) {
    parts.push(`ответственный: ${owner}`);
  }
  return parts.join(" · ");
}

export type ApplicationStageLabel = { label: string; tone: StatusTone };

export function applicationSourceLabel(
  source: Application["source"]
): string {
  if (source === "invited") return "Приглашение";
  if (source === "job_apply") return "Отклик";
  return "В воронке";
}

export function getApplicationStageLabel(
  status: ApplicationStatus,
  source: Application["source"]
): ApplicationStageLabel {
  if (source === "invited") {
    return { label: "Приглашение", tone: "good" };
  }

  const column = PIPELINE_COLUMN_BY_STATUS[status];

  if (column === "closed") {
    if (status === "hired") return { label: "Нанят", tone: "good" };
    if (status === "rejected") return { label: "Отказ", tone: "risk" };
    if (status === "withdrawn") return { label: "Отозван", tone: "muted" };
    return { label: "Архив", tone: "muted" };
  }

  const tone: StatusTone =
    column === "interview" || column === "offer" ? "good" : "muted";

  return { label: PIPELINE_COLUMN_LABEL[column], tone };
}

export function threadApplicationKey(
  vacancyId: string,
  candidateId: string
): string {
  return `${vacancyId}:${candidateId}`;
}
