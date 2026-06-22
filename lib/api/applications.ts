import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/applications";
import * as remote from "./adapters/remote/applications";
import { getCurrentUser } from "./session";
import type { Application, ApplicationStatus } from "@/types/application";
import type { CreateApplicationInput } from "./adapters/local/applications";

export async function getApplications(): Promise<Application[]> {
  if (USE_REMOTE_API) {
    return [];
  }
  return local.getApplications();
}

export type { CreateApplicationInput } from "./adapters/local/applications";

// HR-вид по вакансии — список откликов. При remote = GET /vacancies/{id}/applications.
export async function getApplicationsForVacancy(
  vacancyId: string
): Promise<Application[]> {
  if (USE_REMOTE_API) {
    return remote.getApplicationsForVacancy(vacancyId);
  }
  const all = await local.getApplications();
  return all.filter((a) => a.vacancyId === vacancyId);
}

// HR меняет статус отклика — при remote = PATCH /applications/{id}.
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<Application | null> {
  if (USE_REMOTE_API) {
    return remote.updateApplicationStatus(applicationId, status);
  }
  return local.updateApplicationStatus(applicationId, status);
}

// getApplicationsByCandidateId — для своего кабинета используем /me/applications,
// для HR-просмотра кандидата читаем локально (бэк еще не отдает по id).
export async function getApplicationsByCandidateId(
  candidateId: string
): Promise<Application[]> {
  if (USE_REMOTE_API) {
    const me = getCurrentUser();
    // /me/applications не вкладывает candidate.id — фильтр по candidateId
    // отбрасывал все строки. Для своего кабинета отдаем ответ бэка как есть.
    if (me.role === "candidate" && me.candidateId === candidateId) {
      return remote.getMyApplications();
    }
    return [];
  }
  return local.getApplicationsByCandidateId(candidateId);
}

export async function createApplication(
  input: CreateApplicationInput
): Promise<Application> {
  if (USE_REMOTE_API) {
    return remote.createApplication({
      vacancyId: input.vacancyId,
      candidateId: input.candidateId,
      source: input.source,
    });
  }
  return local.createApplication(input);
}

export const withdrawMyApplication = USE_REMOTE_API
  ? remote.withdrawMyApplication
  : local.withdrawMyApplication;
