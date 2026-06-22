"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Candidate, CandidateStatus, ProfileStatus } from "@/types/candidate";
import type {
  CandidateFilterDefinition,
  CandidateSearchSort,
} from "@/types/candidateSearch";
import {
  getCandidateSearchFilters,
  searchCandidates,
} from "@/lib/api/candidates";
import { getVacancyById } from "@/lib/api/vacancies";
import { TalentSearchPanel } from "@/components/candidates/TalentSearchPanel";
import { PageHeader, Status, Placeholder } from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { candidateSkillLabels } from "@/lib/candidates/candidateSkills";
import type { WorkFormat } from "@/types/candidate";

const statusLabels: Record<CandidateStatus, string> = {
  not_verified: "не проверен",
  pending: "в проверке",
  verified: "подтвержден",
  questionable: "под вопросом",
};

const statusTones: Record<
  CandidateStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  not_verified: "muted",
  pending: "warn",
  verified: "good",
  questionable: "risk",
};

const profileStatusLabels: Record<ProfileStatus, string> = {
  draft: "черновик",
  active: "активен",
  pending_threshold: "ожидает порог",
  admitted: "допущен",
};

const profileStatusTones: Record<
  ProfileStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  draft: "muted",
  active: "muted",
  pending_threshold: "warn",
  admitted: "good",
};

const workFormatLabels: Record<WorkFormat, string> = {
  remote: "Удаленно",
  office: "Офис",
  hybrid: "Гибрид",
};

type SavedQuery = {
  id: string;
  searchQ: string;
  filterValues: Record<string, string>;
  skillsMust: string[];
  skillsNice: string[];
  sort: CandidateSearchSort;
  savedAt: string;
};

const SAVED_QUERY_KEY = "wirehire-saved-queries";
const SEARCH_DEBOUNCE_MS = 300;

function defaultFilterValues(
  schema: CandidateFilterDefinition[]
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of schema) {
    if (field.type === "search") continue;
    values[field.key] = field.default ?? "";
  }
  return values;
}

function hasActiveFilters(
  schema: CandidateFilterDefinition[],
  filterValues: Record<string, string>,
  searchQ: string,
  skillsMust: string[],
  skillsNice: string[]
): boolean {
  if (searchQ.trim()) return true;
  if (skillsMust.length > 0 || skillsNice.length > 0) return true;
  return schema.some((field) => {
    if (field.type === "search") return false;
    const current = filterValues[field.key] ?? "";
    const defaultValue = field.default ?? "";
    return current !== defaultValue;
  });
}

function parseQualityFilters(filterValues: Record<string, string>) {
  const minRaw = filterValues.min_assessment_score?.trim();
  const minParsed = minRaw ? Number(minRaw) : undefined;
  const minAssessmentScore =
    minParsed != null && !Number.isNaN(minParsed) && minParsed > 0
      ? minParsed
      : undefined;

  return {
    minAssessmentScore,
    skillConfirmedOnly: filterValues.skill_confirmed_only === "true",
    verifiedExperienceOnly: filterValues.verified_experience_only === "true",
    proctoredOnly: filterValues.proctored_only === "true",
  };
}

export default function CandidatesPage() {
  const searchParams = useSearchParams();
  const vacancyIdParam = searchParams.get("vacancyId");

  const [filterSchema, setFilterSchema] = useState<CandidateFilterDefinition[]>(
    []
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchQ, setSearchQ] = useState("");
  const [skillsMust, setSkillsMust] = useState<string[]>([]);
  const [skillsNice, setSkillsNice] = useState<string[]>([]);
  const [sort, setSort] = useState<CandidateSearchSort>("relevance");
  const [vacancyId, setVacancyId] = useState<string | null>(null);
  const [vacancyTitle, setVacancyTitle] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [poolTotal, setPoolTotal] = useState(0);
  const [isSchemaLoaded, setIsSchemaLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [savedQueryNotice, setSavedQueryNotice] = useState(false);

  const runSearch = useCallback(async () => {
    if (!isSchemaLoaded) return;
    setIsSearching(true);
    try {
      const quality = parseQualityFilters(filterValues);
      const result = await searchCandidates({
        pool:
          (filterValues.pool as "admitted" | "all_visible" | undefined) ||
          "admitted",
        location: filterValues.location || undefined,
        workFormat: (filterValues.work_format as WorkFormat | undefined) ||
          undefined,
        verificationStatus:
          (filterValues.verification_status as CandidateStatus | undefined) ||
          undefined,
        q: searchQ.trim() || undefined,
        skillsMust: skillsMust.length > 0 ? skillsMust : undefined,
        skillsNice: skillsNice.length > 0 ? skillsNice : undefined,
        ...quality,
        vacancyId: vacancyId ?? undefined,
        sort,
        perPage: 50,
      });
      setCandidates(result.candidates);
      setTotal(result.meta.total);
      setPoolTotal(result.meta.poolTotal);
    } finally {
      setIsSearching(false);
    }
  }, [
    filterValues,
    isSchemaLoaded,
    searchQ,
    skillsMust,
    skillsNice,
    sort,
    vacancyId,
  ]);

  useEffect(() => {
    async function loadSchema() {
      const schema = await getCandidateSearchFilters();
      setFilterSchema(schema);
      setFilterValues(defaultFilterValues(schema));
      setIsSchemaLoaded(true);
    }
    void loadSchema();
  }, []);

  useEffect(() => {
    if (!isSchemaLoaded || !vacancyIdParam) return;

    const presetVacancyId = vacancyIdParam;
    let cancelled = false;
    async function applyVacancyPreset() {
      const vacancy = await getVacancyById(presetVacancyId);
      if (cancelled || !vacancy) return;

      const must = vacancy.skills.slice(0, 3);
      const nice = vacancy.skills.slice(3);
      setVacancyId(vacancy.id);
      setVacancyTitle(vacancy.title);
      setSkillsMust(must);
      setSkillsNice(nice);
      setFilterValues((current) => ({
        ...current,
        pool: "admitted",
        work_format: vacancy.workFormat,
        location: vacancy.locationCity ?? "",
      }));
    }

    void applyVacancyPreset();
    return () => {
      cancelled = true;
    };
  }, [isSchemaLoaded, vacancyIdParam]);

  useEffect(() => {
    if (!isSchemaLoaded) return;
    const timer = window.setTimeout(() => {
      void runSearch();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    filterValues,
    searchQ,
    skillsMust,
    skillsNice,
    sort,
    isSchemaLoaded,
    runSearch,
  ]);

  const filtersActive = hasActiveFilters(
    filterSchema,
    filterValues,
    searchQ,
    skillsMust,
    skillsNice
  );

  function updateFilter(key: string, value: string) {
    setFilterValues((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilterValues(defaultFilterValues(filterSchema));
    setSearchQ("");
    setSkillsMust([]);
    setSkillsNice([]);
    setSort("relevance");
    setVacancyId(null);
    setVacancyTitle(null);
  }

  function clearVacancyPreset() {
    setVacancyId(null);
    setVacancyTitle(null);
    setSkillsMust([]);
    setSkillsNice([]);
    setFilterValues((current) => ({
      ...current,
      work_format: "",
      location: "",
    }));
  }

  function handleSaveQuery() {
    let list: SavedQuery[] = [];
    try {
      list = JSON.parse(localStorage.getItem(SAVED_QUERY_KEY) ?? "[]");
    } catch {
      list = [];
    }
    const entry: SavedQuery = {
      id: `q-${Date.now()}`,
      searchQ: searchQ.trim(),
      filterValues: { ...filterValues },
      skillsMust: [...skillsMust],
      skillsNice: [...skillsNice],
      sort,
      savedAt: new Date().toLocaleDateString("ru-RU"),
    };
    localStorage.setItem(SAVED_QUERY_KEY, JSON.stringify([entry, ...list]));
    setSavedQueryNotice(true);
    window.setTimeout(() => setSavedQueryNotice(false), 2400);
  }

  if (!isSchemaLoaded) {
    return <PageSkeleton />;
  }

  return (
    <div className="talent-search" data-screen-label="HR · Поиск кандидатов">
      <PageHeader
        wideTitle
        eyebrow="База кандидатов"
        title="Поиск кандидатов"
        lead="Умный поиск по базе: обязательные и желательные навыки, пресеты и фильтры качества WireHire."
      />

      <TalentSearchPanel
        filterSchema={filterSchema}
        filterValues={filterValues}
        onFilterChange={updateFilter}
        searchQ={searchQ}
        onSearchChange={setSearchQ}
        skillsMust={skillsMust}
        onSkillsMustChange={setSkillsMust}
        skillsNice={skillsNice}
        onSkillsNiceChange={setSkillsNice}
        sort={sort}
        onSortChange={setSort}
        total={total}
        poolTotal={poolTotal}
        isSearching={isSearching}
        filtersActive={filtersActive}
        onClear={clearFilters}
        onSaveQuery={handleSaveQuery}
        saveQueryLabel={savedQueryNotice ? "Сохранено ✓" : "Сохранить запрос"}
        saveQueryDisabled={!filtersActive}
        vacancyBanner={
          vacancyTitle
            ? { title: vacancyTitle, onClear: clearVacancyPreset }
            : null
        }
      />

      <div className="talent-search__results">
        {!isSearching && candidates.length === 0 ? (
          <Placeholder>
            Никого не нашли по этим фильтрам. Попробуйте убрать обязательные навыки,
            расширить город или переключить базу на «Все профили».
          </Placeholder>
        ) : (
          candidates.map((candidate) => {
            const skills = candidateSkillLabels(candidate).slice(0, 6);
            const mustSet = new Set(skillsMust.map((s) => s.toLowerCase()));
            const experienceCount =
              candidate.experiencesCount ?? candidate.experience.length;

            return (
              <Link
                href={`/candidates/${candidate.id}`}
                key={candidate.id}
                className="talent-card"
              >
                <div className="talent-card__main">
                  <h2 className="talent-card__name">{candidate.fullName}</h2>
                  <p className="talent-card__meta">
                    {candidate.headline} · {candidate.location} ·{" "}
                    {workFormatLabels[candidate.workFormat]}
                  </p>
                  {candidate.summary && (
                    <p className="talent-card__summary">{candidate.summary}</p>
                  )}
                  {skills.length > 0 && (
                    <div className="talent-card__skills">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className={`talent-card__skill${
                            mustSet.has(skill.toLowerCase()) ? " is-match" : ""
                          }`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="talent-card__aside">
                  <div className="talent-card__statuses">
                    <Status tone={statusTones[candidate.verificationStatus]}>
                      {statusLabels[candidate.verificationStatus]}
                    </Status>
                    {candidate.profileStatus && (
                      <Status
                        tone={profileStatusTones[candidate.profileStatus]}
                      >
                        {profileStatusLabels[candidate.profileStatus]}
                      </Status>
                    )}
                  </div>
                  <p className="talent-card__exp">
                    {experienceCount}{" "}
                    {experienceCount === 1
                      ? "карточка опыта"
                      : experienceCount >= 2 && experienceCount <= 4
                        ? "карточки опыта"
                        : "карточек опыта"}
                  </p>
                  <span className="talent-card__cta">открыть →</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
