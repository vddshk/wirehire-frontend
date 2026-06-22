import { mockCandidates } from "@/data/mockCandidates";
import {
  Candidate,
  CandidateExperience,
  CandidateStatus,
  WorkFormat,
} from "@/types/candidate";
import type {
  CandidateFilterDefinition,
  CandidateSearchFilters,
  CandidateSearchSort,
} from "@/types/candidateSearch";
import {
  candidateSkillLabels,
  countNiceSkillMatches,
  hasConfirmedSkillsOnly,
  matchesAllMustSkills,
  maxAssessmentScore,
} from "@/lib/candidates/candidateSkills";
import { getStoredArray, setStoredArray } from "./storage";
import {
  cancelByExperienceId as cancelVerificationsByExperienceId,
  createForExperience as createVerificationRunForExperience,
  getActiveRunByExperienceId,
} from "./verification";
import { createForExperience as createReferenceRequestForExperience } from "./references";
import { autoGenerateForCandidate as autoGenerateAssessmentForCandidate } from "./assessmentPackages";

const CANDIDATES_STORAGE_KEY = "wirehire-candidates";

function experienceKeyFieldsChanged(
  prev: CandidateExperience,
  next: CandidateExperience
): boolean {
  return (
    prev.company !== next.company ||
    prev.role !== next.role ||
    prev.period !== next.period ||
    prev.type !== next.type
  );
}

function hasReferenceContact(exp: CandidateExperience): boolean {
  return Boolean(
    exp.referenceCompanyName?.trim() &&
      exp.referenceContactName?.trim() &&
      exp.referenceContactEmail?.trim()
  );
}

async function triggerVerificationForExperience(
  exp: CandidateExperience,
  candidateId: string
): Promise<void> {
  if (exp.type === "education") return;
  const existing = await getActiveRunByExperienceId(exp.id);
  if (existing) return; // already running
  await createVerificationRunForExperience({
    experienceId: exp.id,
    candidateId,
    hasReferenceContact: hasReferenceContact(exp),
  });
  if (hasReferenceContact(exp)) {
    await createReferenceRequestForExperience({
      experienceId: exp.id,
      candidateId,
      referenceCompanyName: exp.referenceCompanyName!,
      referenceContactName: exp.referenceContactName!,
      referenceContactEmail: exp.referenceContactEmail!,
    });
  }
}

// FR-015b: when key fields change, cancel old runs and start a fresh one.
async function reTriggerVerificationForExperience(
  exp: CandidateExperience,
  candidateId: string
): Promise<void> {
  if (exp.type === "education") return;
  await cancelVerificationsByExperienceId(exp.id);
  await createVerificationRunForExperience({
    experienceId: exp.id,
    candidateId,
    hasReferenceContact: hasReferenceContact(exp),
  });
  if (hasReferenceContact(exp)) {
    await createReferenceRequestForExperience({
      experienceId: exp.id,
      candidateId,
      referenceCompanyName: exp.referenceCompanyName!,
      referenceContactName: exp.referenceContactName!,
      referenceContactEmail: exp.referenceContactEmail!,
    });
  }
}

export type CreateCandidateInput = {
  fullName: string;
  headline: string;
  location: string;
  workFormat: WorkFormat;
  verificationStatus: CandidateStatus;
  skills: string[];
  summary: string;
  experience?: CandidateExperience[];
};

function getSavedCandidates(): Candidate[] {
  return getStoredArray<Candidate>(CANDIDATES_STORAGE_KEY);
}

function getCandidatesWithoutDuplicates(
  mockItems: Candidate[],
  savedItems: Candidate[]
): Candidate[] {
  return mockItems.filter(
    (mockCandidate) =>
      !savedItems.some(
        (savedCandidate) => savedCandidate.id === mockCandidate.id
      )
  );
}

const LOCAL_FILTER_SCHEMA: CandidateFilterDefinition[] = [
  {
    key: "pool",
    type: "select",
    label: "База",
    group: "advanced",
    default: "admitted",
    options: [
      { value: "admitted", label: "Допущены в поиск" },
      { value: "all_visible", label: "Все профили" },
    ],
  },
  {
    key: "location",
    type: "select",
    label: "Город",
    group: "advanced",
    default: "",
    options: [
      { value: "", label: "Любой" },
      ...[...new Set(getSavedCandidates().map((c) => c.location).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "ru"))
        .map((city) => ({ value: city, label: city })),
    ],
  },
  {
    key: "work_format",
    type: "select",
    label: "Формат",
    group: "advanced",
    default: "",
    options: [
      { value: "", label: "Любой" },
      { value: "remote", label: "Удаленно" },
      { value: "office", label: "Офис" },
      { value: "hybrid", label: "Гибрид" },
    ],
  },
  {
    key: "verification_status",
    type: "select",
    label: "Проверка",
    group: "advanced",
    default: "",
    options: [
      { value: "", label: "Любой статус" },
      { value: "verified", label: "Подтвержден" },
      { value: "pending", label: "В проверке" },
      { value: "questionable", label: "Под вопросом" },
      { value: "not_verified", label: "Не проверен" },
    ],
  },
  {
    key: "q",
    type: "search",
    label: "Поиск",
    placeholder: "Имя, роль, город…",
    group: "primary",
  },
  {
    key: "min_assessment_score",
    type: "range",
    group: "quality",
    label: "Мин. балл навыков",
    default: "",
    min: 0,
    max: 100,
    step: 5,
    placeholder: "0–100",
    backendReady: true,
    helpText: "Средний или макс. балл подтвержденных навыков из AI-оценки",
  },
  {
    key: "skill_confirmed_only",
    type: "toggle",
    group: "quality",
    label: "Только подтвержденные навыки",
    default: "false",
    backendReady: true,
  },
  {
    key: "verified_experience_only",
    type: "toggle",
    group: "quality",
    label: "Есть проверенный опыт",
    default: "false",
    backendReady: true,
  },
  {
    key: "proctored_only",
    type: "toggle",
    group: "quality",
    label: "Проходил прокторинг",
    default: "false",
    backendReady: false,
    helpText: "Будет доступно после поля proctored_sessions_count на бэке",
  },
];

export async function getCandidateSearchFilters(): Promise<
  CandidateFilterDefinition[]
> {
  return LOCAL_FILTER_SCHEMA;
}

function matchesPool(candidate: Candidate, pool?: string): boolean {
  if (!pool || pool === "all_visible") return true;
  return candidate.profileStatus === "admitted";
}

function sortCandidates(
  list: Candidate[],
  filters: CandidateSearchFilters
): Candidate[] {
  const sort: CandidateSearchSort = filters.sort ?? "relevance";
  const nice = filters.skillsNice ?? [];

  return [...list].sort((left, right) => {
    if (sort === "assessment_score") {
      return maxAssessmentScore(right) - maxAssessmentScore(left);
    }

    if (sort === "profile_updated") {
      return right.fullName.localeCompare(left.fullName, "ru");
    }

    const niceLeft = countNiceSkillMatches(candidateSkillLabels(left), nice);
    const niceRight = countNiceSkillMatches(candidateSkillLabels(right), nice);
    if (niceRight !== niceLeft) return niceRight - niceLeft;

    return left.fullName.localeCompare(right.fullName, "ru");
  });
}

function filterCandidatesList(
  all: Candidate[],
  filters: CandidateSearchFilters
): Candidate[] {
  const searchText = filters.q?.trim().toLowerCase() ?? "";
  const legacySkill = filters.skill?.trim() ?? "";
  const mustSkills =
    filters.skillsMust && filters.skillsMust.length > 0
      ? filters.skillsMust
      : legacySkill
        ? [legacySkill]
        : [];

  const filtered = all.filter((candidate) => {
    const skillLabels = candidateSkillLabels(candidate);

    const matchesSearch =
      !searchText ||
      candidate.fullName.toLowerCase().includes(searchText) ||
      candidate.headline.toLowerCase().includes(searchText) ||
      candidate.location.toLowerCase().includes(searchText) ||
      skillLabels.some((skill) => skill.toLowerCase().includes(searchText));

    const matchesStatus =
      !filters.verificationStatus ||
      candidate.verificationStatus === filters.verificationStatus;

    const matchesPoolFilter = matchesPool(candidate, filters.pool);

    const matchesLocation =
      !filters.location ||
      candidate.location.toLowerCase().includes(filters.location.toLowerCase());

    const matchesFormat =
      !filters.workFormat || candidate.workFormat === filters.workFormat;

    const matchesMust = matchesAllMustSkills(skillLabels, mustSkills);

    const minScore = filters.minAssessmentScore;
    const matchesMinScore =
      minScore == null ||
      minScore <= 0 ||
      maxAssessmentScore(candidate) >= minScore;

    const matchesConfirmed =
      !filters.skillConfirmedOnly || hasConfirmedSkillsOnly(candidate);

    const matchesVerifiedExp =
      !filters.verifiedExperienceOnly ||
      (candidate.verifiedExperiencesCount ?? 0) > 0;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPoolFilter &&
      matchesLocation &&
      matchesFormat &&
      matchesMust &&
      matchesMinScore &&
      matchesConfirmed &&
      matchesVerifiedExp
    );
  });

  return sortCandidates(filtered, filters);
}

// Локальная реализация принимает те же опциональные фильтры, что и remote,
// чтобы фасад в lib/api/candidates.ts работал в обоих режимах.
export async function searchCandidates(
  filters: CandidateSearchFilters = {}
): Promise<{
  candidates: Candidate[];
  meta: { total: number; poolTotal: number };
}> {
  const savedCandidates = getSavedCandidates();
  const mockCandidatesWithoutDuplicates = getCandidatesWithoutDuplicates(
    mockCandidates,
    savedCandidates
  );
  const all = [...mockCandidatesWithoutDuplicates, ...savedCandidates];
  const poolOnly = filterCandidatesList(all, {
    pool: filters.pool ?? "admitted",
  });
  const filtered = filterCandidatesList(all, {
    ...filters,
    pool: filters.pool ?? "admitted",
  });

  return {
    candidates: filtered,
    meta: {
      total: filtered.length,
      poolTotal: poolOnly.length,
    },
  };
}

export async function getCandidates(
  filters: CandidateSearchFilters = {}
): Promise<Candidate[]> {
  const result = await searchCandidates(filters);
  return result.candidates;
}

export async function getCandidateById(
  candidateId: string,
  _pool?: "admitted" | "all_visible"
): Promise<Candidate | null> {
  // Параметр pool в локальном моке не учитываем — данные не разделены по пулам.
  const candidates = await getCandidates();

  return candidates.find((candidate) => candidate.id === candidateId) ?? null;
}

export async function createCandidate(
  input: CreateCandidateInput
): Promise<Candidate> {
  const savedCandidates = getSavedCandidates();

  const newCandidate: Candidate = {
    id: `cand-${Date.now()}`,
    fullName: input.fullName,
    headline: input.headline,
    location: input.location,
    workFormat: input.workFormat,
    verificationStatus: input.verificationStatus,
    skills: input.skills,
    summary: input.summary,
    experience: input.experience ?? [],
  };

  setStoredArray<Candidate>(CANDIDATES_STORAGE_KEY, [
    ...savedCandidates,
    newCandidate,
  ]);

  return newCandidate;
}

export async function updateCandidate(
  updatedCandidate: Candidate
): Promise<Candidate> {
  // Diff against previous state (saved or mock) to detect new / changed experience cards.
  const all = await getCandidates();
  const previous =
    all.find((candidate) => candidate.id === updatedCandidate.id) ?? null;
  const previousExperience: CandidateExperience[] =
    previous?.experience ?? [];

  const savedCandidates = getSavedCandidates();
  const savedCandidatesWithoutCurrent = savedCandidates.filter(
    (candidate) => candidate.id !== updatedCandidate.id
  );

  // Mark new experience cards as awaiting_reference if contact provided —
  // this is what the candidate sees as "отправлено на подтверждение" (FR-015a).
  const nextExperience = updatedCandidate.experience.map((exp) => {
    const prev = previousExperience.find((p) => p.id === exp.id);
    const isBrandNew = !prev;
    const keyChanged = prev && experienceKeyFieldsChanged(prev, exp);
    if ((isBrandNew || keyChanged) && exp.type !== "education") {
      return {
        ...exp,
        status: hasReferenceContact(exp)
          ? ("awaiting_reference" as const)
          : ("not_checked" as const),
      };
    }
    return exp;
  });

  const candidateToPersist: Candidate = {
    ...updatedCandidate,
    experience: nextExperience,
  };

  setStoredArray<Candidate>(CANDIDATES_STORAGE_KEY, [
    ...savedCandidatesWithoutCurrent,
    candidateToPersist,
  ]);

  // Fire auto-verification triggers AFTER persist so UI reload sees both.
  for (const exp of candidateToPersist.experience) {
    const prev = previousExperience.find((p) => p.id === exp.id);
    if (!prev) {
      await triggerVerificationForExperience(exp, candidateToPersist.id);
    } else if (experienceKeyFieldsChanged(prev, exp)) {
      await reTriggerVerificationForExperience(exp, candidateToPersist.id);
    }
  }

  // FR-042/043: profile-level AI-оценка package generates automatically
  // once the candidate has at least one work/project experience and one skill.
  // Idempotent — does not duplicate or recreate a completed package.
  await autoGenerateAssessmentForCandidate(candidateToPersist);

  return candidateToPersist;
}
