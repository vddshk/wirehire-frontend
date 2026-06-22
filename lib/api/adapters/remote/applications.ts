import { Application, ApplicationStatus } from "@/types/application";
import { apiClient } from "./client";

interface BackendApplication {
  id: string;
  // Бэк может присылать как плоские поля (старая схема), так и вложенные
  // объекты `candidate`/`vacancy` (актуальная схема в openapi).
  candidate_id?: string;
  vacancy_id?: string;
  candidate?: {
    id: string;
    full_name?: string | null;
    status?: string | null;
  };
  vacancy?: {
    id: string;
    title?: string | null;
    company?: { id: string; public_name?: string | null };
  };
  status: ApplicationStatus;
  source?: Application["source"];
  applied_at?: string | null;
  owner_name?: string | null;
  has_profile_report?: boolean;
  profile_report_score?: number | null;
}

interface ApplicationEnvelope {
  data: BackendApplication;
}

interface ApplicationPaginated {
  data: BackendApplication[];
}

// Маппинг наш ApplicationStatus → значение, которое примет бэк.
// Бэк использует viewed / invited_to_interview / invited_to_assessment,
// у нас — reviewed / interview / verification. Остальные совпадают.
const STATUS_TO_BACKEND: Record<ApplicationStatus, string> = {
  submitted: "submitted",
  reviewed: "viewed",
  in_progress: "in_progress",
  shortlist: "shortlist",
  verification: "invited_to_assessment",
  interview: "invited_to_interview",
  offer: "offer",
  hired: "hired",
  rejected: "rejected",
  withdrawn: "withdrawn",
  archived: "archived",
};

// Обратный маппинг для статусов, которые мы получаем с бэка.
function mapStatusFromBackend(value: string): ApplicationStatus {
  switch (value) {
    case "viewed":
      return "reviewed";
    case "invited_to_assessment":
      return "verification";
    case "invited_to_interview":
      return "interview";
    case "submitted":
    case "in_progress":
    case "shortlist":
    case "offer":
    case "hired":
    case "rejected":
    case "withdrawn":
    case "archived":
      return value;
    default:
      return "submitted";
  }
}

function mapApplication(b: BackendApplication): Application {
  return {
    id: b.id,
    candidateId: b.candidate?.id ?? b.candidate_id ?? "",
    vacancyId: b.vacancy?.id ?? b.vacancy_id ?? "",
    status: mapStatusFromBackend(b.status),
    source: b.source ?? "job_apply",
    appliedAt: b.applied_at ?? "",
    ownerName: b.owner_name ?? "",
    candidateName: b.candidate?.full_name ?? undefined,
    vacancyTitle: b.vacancy?.title ?? undefined,
    companyName: b.vacancy?.company?.public_name ?? undefined,
    hasProfileReport: b.has_profile_report,
    profileReportScore:
      b.profile_report_score != null ? Number(b.profile_report_score) : undefined,
  };
}

/** Кнопка «Отозвать» в кабинете кандидата — PATCH /me/applications/{id}. */
export async function withdrawMyApplication(
  applicationId: string
): Promise<Application | null> {
  const response = await apiClient<ApplicationEnvelope>(
    `/me/applications/${applicationId}`,
    { method: "PATCH", auth: "required" }
  );
  return mapApplication(response.data);
}

/** Список откликов кандидата — GET /me/applications. */
export async function getMyApplications(): Promise<Application[]> {
  const response = await apiClient<ApplicationPaginated>(
    "/me/applications",
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapApplication);
}

/** Отклики на вакансию — GET /vacancies/{vacancyId}/applications. HR-вид. */
export async function getApplicationsForVacancy(
  vacancyId: string
): Promise<Application[]> {
  const response = await apiClient<ApplicationPaginated>(
    `/vacancies/${vacancyId}/applications`,
    { method: "GET", auth: "required" }
  );
  // Бэк в этом ответе может не вкладывать объект vacancy — тогда vacancyId из
  // mapApplication пустой и в воронке не видно названия вакансии. Подставляем
  // известный id из аргумента, чтобы имя показывалось уже в первой колонке.
  return response.data.map((b) => ({
    ...mapApplication(b),
    vacancyId: b.vacancy?.id ?? b.vacancy_id ?? vacancyId,
  }));
}

/** Изменить статус отклика — PATCH /applications/{applicationId}. HR-действие. */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<Application> {
  const response = await apiClient<ApplicationEnvelope>(
    `/applications/${applicationId}`,
    {
      method: "PATCH",
      auth: "required",
      body: { status: STATUS_TO_BACKEND[status] ?? status },
    }
  );
  return mapApplication(response.data);
}

/** Создать отклик кандидата — POST /vacancies/{vacancyId}/applications. */
export async function createApplication(input: {
  vacancyId: string;
  candidateId?: string;
  source?: string;
  answers?: Record<string, unknown>;
}): Promise<Application> {
  if (input.source === "invited" && input.candidateId) {
    const response = await apiClient<ApplicationEnvelope>(
      `/vacancies/${input.vacancyId}/candidates/${input.candidateId}/applications`,
      {
        method: "POST",
        auth: "required",
        body: {},
      }
    );
    return mapApplication(response.data);
  }

  const response = await apiClient<ApplicationEnvelope>(
    `/vacancies/${input.vacancyId}/applications`,
    {
      method: "POST",
      auth: "required",
      body: {
        source: input.source ?? "job_apply",
        answers: input.answers ?? {},
      },
    }
  );
  return mapApplication(response.data);
}
