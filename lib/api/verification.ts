import { USE_REMOTE_API } from "./config";
import { getCurrentRole } from "./session";
import * as local from "./adapters/local/verification";
import * as remote from "./adapters/remote/verification";
import type { VerificationRun } from "@/types/verification";

// Список проверок «по кандидату» в кабинете кандидата = его собственные прогоны.
// При remote ходим в /me/verification-runs (кандидат из токена), candidateId
// игнорируется — как и /me/applications в applications-фасаде.
export async function getVerificationRunsByCandidateId(
  candidateId: string
): Promise<VerificationRun[]> {
  if (USE_REMOTE_API) {
    try {
      return await remote.getMyVerificationRuns();
    } catch {
      // fallback на local
    }
  }
  return local.getVerificationRunsByCandidateId(candidateId);
}

// Детали прогона. У бэка два эндпоинта: кандидат смотрит свой через /me/...,
// HR/менеджер — общий /verification-runs/{id}. Выбираем по текущей роли.
export async function getVerificationRunById(
  verificationRunId: string
): Promise<VerificationRun | null> {
  if (USE_REMOTE_API) {
    try {
      const role = getCurrentRole();
      if (role === "candidate") {
        return await remote.getMyVerificationRunById(verificationRunId);
      }
      return await remote.getVerificationRunById(verificationRunId);
    } catch {
      // fallback на local
    }
  }
  return local.getVerificationRunById(verificationRunId);
}

// Прогоны по вакансии (HR). При remote = /vacancies/{id}/verification-runs.
export async function getVerificationRunsForVacancy(
  vacancyId: string
): Promise<VerificationRun[]> {
  if (USE_REMOTE_API) {
    try {
      return await remote.getVerificationRunsForVacancy(vacancyId);
    } catch {
      // fallback на local
    }
  }
  const all = await local.getVerificationRuns();
  return all.filter((run) => run.vacancyId === vacancyId);
}

// Действия (запись) — remote напрямую, без local-fallback: при сбое показываем
// ошибку, не имитируя успех в localStorage.
export {
  createVerificationRunForVacancy,
  activateMyVerificationRun,
  reviewVerificationRun,
} from "./adapters/remote/verification";

// Остальное пока на local (локальная логика автосоздания по опыту):
export {
  getVerificationRuns,
  updateVerificationRun,
  createForExperience as createVerificationRunForExperience,
  cancelByExperienceId as cancelVerificationByExperienceId,
  getActiveRunByExperienceId,
} from "./adapters/local/verification";
