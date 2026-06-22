import {
  Candidate,
  CandidateStatus,
  ProfileStatus,
  WorkFormat,
} from "@/types/candidate";
import type {
  CandidateFilterDefinition,
  CandidateSearchFilters,
  CandidateSearchMeta,
} from "@/types/candidateSearch";
import { ApiError, apiClient } from "./client";
import { mapCandidateSkill } from "./skills";
import { BackendExperience, mapExperience } from "./experiences";

export interface BackendPublicCandidate {
  id: string;
  status?: string;
  in_talent_pool?: boolean;
  full_name?: string;
  headline?: string;
  summary?: string;
  location?: string;
  work_format?: string;
  visibility_mode?: "private" | "public_limited" | "public";
  experiences_count?: number;
  verified_experiences_count?: number;
  has_profile_report?: boolean;
  profile_report_score?: number | null;
  profile_report_status?: string | null;
  // Карточки опыта в детальной карточке HR (`GET /candidates/{id}` с
  // eager-load experiences). На листинге это поле бэк не отдает.
  experiences_preview?: BackendExperience[];
  // Структурированные навыки (`candidate_skills`) — приходят в детальной
  // карточке HR.
  skills_preview?: Parameters<typeof mapCandidateSkill>[0][];
  has_resume?: boolean;
}

interface BackendPaginatedCandidates {
  data: BackendPublicCandidate[];
  meta?: {
    total?: number;
    pool_total?: number;
    current_page?: number;
    per_page?: number;
  };
}

interface BackendCandidateFiltersResponse {
  filters: CandidateFilterDefinition[];
}

interface BackendCandidateEnvelope {
  data: BackendPublicCandidate;
}

const WORK_FORMAT_VALUES: WorkFormat[] = ["remote", "office", "hybrid"];

function mapWorkFormat(value?: string | null): WorkFormat {
  if (value && (WORK_FORMAT_VALUES as string[]).includes(value)) {
    return value as WorkFormat;
  }
  return "remote";
}

function mapVerificationStatus(status?: string): CandidateStatus {
  // На лендинге HR публичные карточки уже отфильтрованы; маппим status
  // кандидата с бэка в локальный verificationStatus только для бейджа.
  if (status === "admitted_to_talent_pool") return "verified";
  if (status === "awaiting_verification_threshold") return "pending";
  return "not_verified";
}

function mapProfileStatus(status?: string): ProfileStatus | undefined {
  // Бэк-статусы профиля → локальные. Нужно sidebar/листингу для счетчика
  // «допущенных» и фильтрации pool=admitted на клиенте.
  if (status === "admitted_to_talent_pool") return "admitted";
  if (status === "awaiting_verification_threshold") return "pending_threshold";
  if (status === "draft") return "draft";
  if (status === "active") return "active";
  return undefined;
}

export function mapCandidate(b: BackendPublicCandidate): Candidate {
  const skillsPreview = b.skills_preview?.map(mapCandidateSkill);
  const experience = b.experiences_preview?.map(mapExperience) ?? [];
  return {
    id: b.id,
    fullName: b.full_name ?? "",
    headline: b.headline ?? "",
    location: b.location ?? "",
    workFormat: mapWorkFormat(b.work_format),
    verificationStatus: mapVerificationStatus(b.status),
    // Плоский список лейблов — для обратной совместимости с экранами, которые
    // еще читают candidate.skills. Источник — те же `candidate_skills`.
    skills: skillsPreview?.map((s) => s.label) ?? [],
    summary: b.summary ?? "",
    experience,
    profileStatus: mapProfileStatus(b.status),
    experiencesCount: b.experiences_count,
    verifiedExperiencesCount: b.verified_experiences_count,
    visibilityMode:
      b.visibility_mode === "private"
        ? "hidden"
        : b.visibility_mode === "public_limited"
          ? "restricted"
          : "public",
    skillsPreview,
    hasProfileReport: b.has_profile_report,
    profileReportScore:
      b.profile_report_score != null ? Number(b.profile_report_score) : undefined,
    profileReportStatus: b.profile_report_status ?? undefined,
    hasResume: b.has_resume ?? false,
  };
}

export type CandidatePool = "admitted" | "all_visible";

export type { CandidateSearchFilters } from "@/types/candidateSearch";

function appendArrayParam(
  params: URLSearchParams,
  key: string,
  values?: string[]
) {
  if (!values?.length) return;
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) params.append(`${key}[]`, trimmed);
  }
}

function buildQuery(filters: CandidateSearchFilters): string {
  const params = new URLSearchParams();
  if (filters.pool) params.set("pool", filters.pool);
  if (filters.location) params.set("location", filters.location);
  if (filters.workFormat) params.set("work_format", filters.workFormat);
  if (filters.verificationStatus) {
    params.set("verification_status", filters.verificationStatus);
  }
  if (filters.q) params.set("q", filters.q);
  if (filters.skill) params.set("skill", filters.skill);
  appendArrayParam(params, "skills_must", filters.skillsMust);
  appendArrayParam(params, "skills_nice", filters.skillsNice);
  if (filters.minAssessmentScore != null && filters.minAssessmentScore > 0) {
    params.set("min_assessment_score", String(filters.minAssessmentScore));
  }
  if (filters.skillConfirmedOnly) {
    params.set("skill_confirmed_only", "1");
  }
  if (filters.verifiedExperienceOnly) {
    params.set("verified_experience_only", "1");
  }
  if (filters.proctoredOnly) {
    params.set("proctored_only", "1");
  }
  if (filters.vacancyId) params.set("vacancy_id", filters.vacancyId);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getCandidateSearchFilters(): Promise<
  CandidateFilterDefinition[]
> {
  const response = await apiClient<BackendCandidateFiltersResponse>(
    "/candidates/filters",
    { method: "GET", auth: "required" }
  );
  return response.filters;
}

export type CandidateSearchResponse = {
  candidates: Candidate[];
  meta: CandidateSearchMeta;
};

/** Поиск кандидатов в базе HR с метаданными пагинации. */
export async function searchCandidates(
  filters: CandidateSearchFilters = {}
): Promise<CandidateSearchResponse> {
  const response = await apiClient<BackendPaginatedCandidates>(
    `/candidates${buildQuery(filters)}`,
    { method: "GET", auth: "required" }
  );
  return {
    candidates: response.data.map(mapCandidate),
    meta: {
      total: response.meta?.total ?? response.data.length,
      poolTotal:
        response.meta?.pool_total ??
        response.meta?.total ??
        response.data.length,
    },
  };
}

/** Поиск кандидатов в базе HR. По умолчанию pool=admitted (только допущенные). */
export async function getCandidates(
  filters: CandidateSearchFilters = {}
): Promise<Candidate[]> {
  const result = await searchCandidates(filters);
  return result.candidates;
}

export async function getCandidateById(
  candidateId: string,
  pool: CandidatePool = "all_visible"
): Promise<Candidate | null> {
  try {
    const response = await apiClient<BackendCandidateEnvelope>(
      `/candidates/${candidateId}?pool=${pool}`,
      { method: "GET", auth: "required" }
    );
    return mapCandidate(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
