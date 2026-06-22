import {
  ConsentStatus,
  VerificationRun,
  VerificationRunStatus,
  VerificationScope,
} from "@/types/verification";
import { formatDate } from "@/lib/utils/date";
import { ApiError, apiClient } from "./client";

// Бэк отдает 10 статусов, наш UI пока оперирует 5. Схлопываем, чтобы не
// расширять тип и не ломать карты подписей/тонов на 6 экранах. Промежуточные
// «ожидания» (референт / задание / ревью) показываем как «active» — для
// пользователя это «проверка идет». Истекший и отозванный — как «cancelled».
const STATUS_FROM_BACKEND: Record<string, VerificationRunStatus> = {
  created: "created",
  awaiting_consent: "waiting_consent",
  active: "active",
  awaiting_referee: "active",
  awaiting_assessment: "active",
  awaiting_review: "active",
  completed: "completed",
  cancelled: "cancelled",
  cancelled_consent_revoked: "cancelled",
  expired: "cancelled",
};

const SCOPE_VALUES: VerificationScope[] = ["trust_only", "skills_only", "full"];

function mapScope(value?: string): VerificationScope {
  if (value && (SCOPE_VALUES as string[]).includes(value)) {
    return value as VerificationScope;
  }
  return "full";
}

function mapStatus(value?: string): VerificationRunStatus {
  return (value && STATUS_FROM_BACKEND[value]) || "created";
}

// У бэка нет отдельного enum согласия — есть consent_id и вложенный consent.
// Для отображения выводим статус согласия из статуса прогона.
function deriveConsentStatus(backendStatus?: string): ConsentStatus {
  switch (backendStatus) {
    case "created":
      return "not_requested";
    case "awaiting_consent":
      return "requested";
    case "cancelled_consent_revoked":
      return "revoked";
    default:
      // active / awaiting_* / completed — согласие уже дано
      return "active";
  }
}

interface BackendVerificationRun {
  id: string;
  candidate_id?: string;
  run_type?: string;
  experience_id?: string | null;
  vacancy_id?: string | null;
  company_id?: string | null;
  status?: string;
  consent_id?: string | null;
  started_at?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  candidate?: {
    id: string;
    full_name?: string | null;
    headline?: string | null;
    status?: string | null;
  } | null;
  vacancy?: { id: string } | null;
}

interface VerificationRunEnvelope {
  data: BackendVerificationRun;
}

interface VerificationRunPaginated {
  data: BackendVerificationRun[];
}

function mapVerificationRun(b: BackendVerificationRun): VerificationRun {
  return {
    id: b.id,
    candidateId: b.candidate?.id ?? b.candidate_id ?? "",
    vacancyId: b.vacancy?.id ?? b.vacancy_id ?? undefined,
    experienceId: b.experience_id ?? undefined,
    scope: mapScope(b.run_type),
    status: mapStatus(b.status),
    consentStatus: deriveConsentStatus(b.status),
    // proctoring в контракте нет (возможно внутри policy_snapshot) — на чтение
    // не влияет, показываем выключенным.
    proctoringEnabled: false,
    dueAt: b.due_at ? formatDate(b.due_at) : "",
    createdAt: b.created_at ? formatDate(b.created_at) : "",
    candidateName: b.candidate?.full_name ?? undefined,
    candidateHeadline: b.candidate?.headline ?? undefined,
    rawStatus: b.status,
  };
}

/** GET /me/verification-runs — проверки текущего кандидата (из его токена). */
export async function getMyVerificationRuns(): Promise<VerificationRun[]> {
  const response = await apiClient<VerificationRunPaginated>(
    "/me/verification-runs",
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapVerificationRun);
}

/** GET /verification-runs/{id} — детали прогона (HR-вид). */
export async function getVerificationRunById(
  id: string
): Promise<VerificationRun | null> {
  try {
    const response = await apiClient<VerificationRunEnvelope>(
      `/verification-runs/${id}`,
      { method: "GET", auth: "required" }
    );
    return mapVerificationRun(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** GET /me/verification-runs/{id} — детали прогона текущего кандидата. */
export async function getMyVerificationRunById(
  id: string
): Promise<VerificationRun | null> {
  try {
    const response = await apiClient<VerificationRunEnvelope>(
      `/me/verification-runs/${id}`,
      { method: "GET", auth: "required" }
    );
    return mapVerificationRun(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** GET /vacancies/{vacancyId}/verification-runs — прогоны по вакансии (HR). */
export async function getVerificationRunsForVacancy(
  vacancyId: string
): Promise<VerificationRun[]> {
  const response = await apiClient<VerificationRunPaginated>(
    `/vacancies/${vacancyId}/verification-runs`,
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapVerificationRun);
}

/** POST /vacancies/{vacancyId}/verification-runs — HR запускает проверку.
 *  experience_id обязателен для trust_only. */
export async function createVerificationRunForVacancy(
  vacancyId: string,
  input: {
    candidateId: string;
    runType: VerificationScope;
    experienceId?: string;
    dueAt?: string;
  }
): Promise<VerificationRun> {
  const response = await apiClient<VerificationRunEnvelope>(
    `/vacancies/${vacancyId}/verification-runs`,
    {
      method: "POST",
      auth: "required",
      body: {
        candidate_id: input.candidateId,
        run_type: input.runType,
        ...(input.experienceId ? { experience_id: input.experienceId } : {}),
        ...(input.dueAt ? { due_at: input.dueAt } : {}),
      },
    }
  );
  return mapVerificationRun(response.data);
}

/** POST /me/verification-runs/{id}/activate — кандидат активирует прогон
 *  (awaiting_consent → active). Требует active consent type=verification. */
export async function activateMyVerificationRun(
  id: string
): Promise<VerificationRun> {
  const response = await apiClient<VerificationRunEnvelope>(
    `/me/verification-runs/${id}/activate`,
    { method: "POST", auth: "required" }
  );
  return mapVerificationRun(response.data);
}

/** POST /verification-runs/{id}/review — HR-ревью full-прогона. */
export async function reviewVerificationRun(
  id: string,
  input: { decision: "approve" | "reject"; comment?: string }
): Promise<VerificationRun> {
  const response = await apiClient<VerificationRunEnvelope>(
    `/verification-runs/${id}/review`,
    {
      method: "POST",
      auth: "required",
      body: {
        decision: input.decision,
        ...(input.comment ? { comment: input.comment } : {}),
      },
    }
  );
  return mapVerificationRun(response.data);
}
