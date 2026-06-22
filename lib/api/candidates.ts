// Список кандидатов: при remote = GET /candidates, иначе local mock.
// getCandidateById для СВОЕГО профиля кандидата собирается из /me/profile +
// /me/experiences (роль candidate не имеет доступа к /candidates/{id} → 403).
import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/candidates";
import * as remote from "./adapters/remote/candidates";
import { getCurrentUser } from "./session";
import { getMyProfile } from "./profile";
import { listMyExperiences } from "./experiences";
import { getMySkills } from "./skills";
import type { Candidate } from "@/types/candidate";
import type { CandidateSearchFilters } from "@/types/candidateSearch";
import type { CandidatePool } from "./adapters/remote/candidates";

export async function getCandidates(
  filters: CandidateSearchFilters = {}
): Promise<Candidate[]> {
  if (USE_REMOTE_API) {
    return remote.getCandidates({
      pool: filters.pool ?? "admitted",
      ...filters,
    });
  }
  return local.getCandidates(filters);
}

export async function getCandidateSearchFilters() {
  if (USE_REMOTE_API) {
    return remote.getCandidateSearchFilters();
  }
  return local.getCandidateSearchFilters();
}

export async function searchCandidates(filters: CandidateSearchFilters = {}) {
  if (USE_REMOTE_API) {
    return remote.searchCandidates({
      pool: filters.pool ?? "admitted",
      ...filters,
    });
  }
  return local.searchCandidates(filters);
}

export async function getCandidateById(
  candidateId: string,
  pool?: CandidatePool
): Promise<Candidate | null> {
  if (USE_REMOTE_API) {
    const me = getCurrentUser();
    // Кандидат — только /me/*; /candidates/{id} для этой роли всегда 403.
    if (me?.role === "candidate") {
      if (me.candidateId && candidateId !== me.candidateId) {
        return null;
      }
      const [profile, experiences, skills] = await Promise.all([
        getMyProfile(),
        listMyExperiences().catch(() => []),
        getMySkills().catch(() => []),
      ]);
      return {
        ...profile,
        experience: experiences,
        skills: skills.map((skill) => skill.label),
        skillsPreview: skills,
      };
    }
    return remote.getCandidateById(candidateId, pool);
  }
  return local.getCandidateById(candidateId);
}

export {
  createCandidate,
  updateCandidate,
} from "./adapters/local/candidates";

export type { CreateCandidateInput } from "./adapters/local/candidates";
export type { CandidatePool } from "./adapters/remote/candidates";
export type {
  CandidateFilterDefinition,
  CandidateSearchFilters,
} from "@/types/candidateSearch";
