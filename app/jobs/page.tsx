"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublishedVacancies } from "@/lib/api/vacancies";
import { Vacancy, VacancyWorkFormat } from "@/types/vacancy";
import { formatDate } from "@/lib/utils/date";
import {
  EMPLOYMENT_TYPE_LABELS as employmentTypeLabels,
  SENIORITY_LABELS as seniorityLabels,
  WORK_FORMAT_LABELS as workFormatLabels,
  formatVacancyLocation as getVacancyLocation,
  vacancyMatchesSkill,
} from "@/lib/utils/vacancy";
import { SkillPicker } from "@/components/SkillPicker";
import { getCurrentUser } from "@/lib/api/session";
import { getCandidateById } from "@/lib/api/candidates";
import { Candidate } from "@/types/candidate";
import {
  SearchFilterSelect,
  SearchFilterToggle,
} from "@/components/SearchFilterField";
import { PageHeader, EmptyState } from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const FAVORITES_STORAGE_KEY = "wirehire-favorite-vacancies";

const SKILL_FILTER_MAX = 8;

const FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Любой" },
  { value: "remote", label: workFormatLabels.remote },
  { value: "office", label: workFormatLabels.office },
  { value: "hybrid", label: workFormatLabels.hybrid },
];

export default function JobsPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const [formatFilter, setFormatFilter] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    async function loadVacancies() {
      const loadedVacancies = await getPublishedVacancies();
      setVacancies(loadedVacancies);
      setIsLoaded(true);
      const user = getCurrentUser();
      if (user.candidateId) {
        const loadedCandidate = await getCandidateById(user.candidateId);
        if (loadedCandidate) setCandidate(loadedCandidate);
      }
    }

    loadVacancies();

    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites) as string[];
        if (Array.isArray(parsed)) setFavorites(new Set(parsed));
      } catch {
        /* ignore corrupted favorites */
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || vacancies.length === 0) return;
    const visibleIds = new Set(vacancies.map((v) => v.id));
    setFavorites((previous) => {
      const cleaned = new Set(
        Array.from(previous).filter((id) => visibleIds.has(id))
      );
      if (cleaned.size !== previous.size) {
        localStorage.setItem(
          FAVORITES_STORAGE_KEY,
          JSON.stringify(Array.from(cleaned))
        );
      }
      return cleaned;
    });
  }, [isLoaded, vacancies]);

  function toggleFavorite(vacancyId: string) {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (next.has(vacancyId)) next.delete(vacancyId);
      else next.add(vacancyId);
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(Array.from(next))
      );
      return next;
    });
  }

  const filteredVacancies = vacancies.filter((vacancy) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      !searchText ||
      vacancy.title.toLowerCase().includes(searchText) ||
      vacancy.companyName.toLowerCase().includes(searchText) ||
      vacancy.skills.some((skill) =>
        skill.toLowerCase().includes(searchText)
      );

    const matchesSkill =
      skillFilters.length === 0 ||
      skillFilters.some((skill) => vacancyMatchesSkill(vacancy, skill));
    const matchesFormat =
      !formatFilter || vacancy.workFormat === formatFilter;
    const matchesFavorite = !showOnlyFavorites || favorites.has(vacancy.id);

    return matchesSearch && matchesSkill && matchesFormat && matchesFavorite;
  });

  const filtersActive =
    search.trim().length > 0 ||
    showOnlyFavorites ||
    formatFilter !== "" ||
    skillFilters.length > 0;

  function clearFilters() {
    setSearch("");
    setSkillFilters([]);
    setFormatFilter("");
    setShowOnlyFavorites(false);
  }

  const favoritesLabel =
    favorites.size > 0 ? `★ ${favorites.size} в избранном` : "★ Только избранное";

  if (!isLoaded) {
    return <PageSkeleton variant="compact" />;
  }

  return (
    <div className="job-search" data-screen-label="Кандидат · Поиск работы">
      <PageHeader
        eyebrow="Поиск работы"
        title={
          <>
            Вакансии
            <br />
            <em>под ваш профиль</em>
          </>
        }
        lead={`${vacancies.length} опубликованных вакансий`}
        actions={
          <Link href="/candidate/applications" className="btn">
            Мои отклики
          </Link>
        }
      />

      <div className="job-search__panel">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="input search job-search__query"
          placeholder="Роль, компания, навык…"
        />

        <div className="job-search__filters">
          <SearchFilterToggle
            id="filter-favorites"
            label="Избранное"
            active={showOnlyFavorites}
            onChange={setShowOnlyFavorites}
            offLabel="Все вакансии"
            onLabel={favoritesLabel}
          />
          <SearchFilterSelect
            id="filter-format"
            label="Формат"
            value={formatFilter}
            inactiveValue=""
            onChange={setFormatFilter}
            options={FORMAT_OPTIONS}
          />
        </div>

        <div className="job-search__skill-filter">
          <span className="search-filter__label">Навыки</span>
          <SkillPicker
            slots={skillFilters}
            onChange={setSkillFilters}
            max={SKILL_FILTER_MAX}
            emptyLabel="Навык"
            moreLabel="Еще навык"
            placeholder="React, TypeScript…"
            keepOpenOnSelect
            className="job-search__skill-picker"
          />
        </div>

        {filtersActive && (
          <div className="job-search__chips">
            {search.trim() && (
              <span className="job-search__chip">
                Поиск: <strong>{search.trim()}</strong>
              </span>
            )}
            {showOnlyFavorites && (
              <span className="job-search__chip">
                Избранное: <strong>{favoritesLabel}</strong>
              </span>
            )}
            {formatFilter && (
              <span className="job-search__chip">
                Формат:{" "}
                <strong>
                  {workFormatLabels[formatFilter as VacancyWorkFormat]}
                </strong>
              </span>
            )}
            {skillFilters.map((skill) => (
              <span className="job-search__chip" key={skill}>
                Навык: <strong>{skill}</strong>
              </span>
            ))}
          </div>
        )}

        <div className="job-search__bar">
          <p className="job-search__summary">
            <strong>{filteredVacancies.length}</strong>{" "}
            {filteredVacancies.length === 1 ? "вакансия" : "вакансий"}
            <span className="talent-search__summary-note">
              {" "}
              · из {vacancies.length} опубликованных
            </span>
          </p>
          {filtersActive && (
            <button
              type="button"
              className="job-search__reset"
              onClick={clearFilters}
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      <div className="job-list">
        {filteredVacancies.length === 0 ? (
          <EmptyState
            title="Вакансий под фильтр нет"
            description="Попробуйте другой запрос или сбросьте фильтры — список обновится сразу."
            action={
              filtersActive ? (
                <button type="button" className="btn btn-primary" onClick={clearFilters}>
                  Сбросить фильтры →
                </button>
              ) : (
                <Link href="/candidate/profile" className="btn">
                  Дополнить профиль
                </Link>
              )
            }
          />
        ) : (
          filteredVacancies.map((vacancy) => {
            const isFavorite = favorites.has(vacancy.id);
            const candidateSkills = candidate?.skills ?? [];
            const matched = vacancy.skills.filter((skill) =>
              candidateSkills.includes(skill)
            );
            const missing = vacancy.skills.filter(
              (skill) => !candidateSkills.includes(skill)
            );
            const matchPercent =
              vacancy.skills.length === 0
                ? null
                : Math.round((matched.length / vacancy.skills.length) * 100);
            const teaser = vacancy.description.replace(/\s+/g, " ").trim();

            return (
              <Link
                href={`/jobs/${vacancy.id}`}
                key={vacancy.id}
                className="job-card"
              >
                <div className="job-card__main">
                  <div className="job-card__head">
                    <h2 className="job-card__title">{vacancy.title}</h2>
                    {matchPercent !== null && candidate && (
                      <span className="job-card__match-pill">
                        {matchPercent}% совпадение
                      </span>
                    )}
                  </div>

                  <div className="job-card__meta">
                    {vacancy.companyName} · {getVacancyLocation(vacancy)} ·{" "}
                    {seniorityLabels[vacancy.seniority]} ·{" "}
                    {employmentTypeLabels[vacancy.employmentType]} ·{" "}
                    {workFormatLabels[vacancy.workFormat]} ·{" "}
                    {vacancy.salaryRange}
                  </div>

                  <p className="job-card__teaser">{teaser}</p>

                  <div className="job-card__summary">
                    {candidate ? (
                      <>
                        {matched.map((skill) => (
                          <span
                            key={`m-${skill}`}
                            className="job-card__skill is-match"
                          >
                            {skill}
                          </span>
                        ))}
                        {missing.map((skill) => (
                          <span
                            key={`g-${skill}`}
                            className="job-card__skill is-gap"
                          >
                            {skill}
                          </span>
                        ))}
                        {matched.length === 0 && missing.length === 0 && (
                          <span className="caption" style={{ marginBottom: 0 }}>
                            Навыки не указаны
                          </span>
                        )}
                      </>
                    ) : (
                      vacancy.skills.map((skill) => (
                        <span key={skill} className="job-card__skill">
                          {skill}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="job-card__aside">
                  <div className="job-card__actions">
                    <button
                      type="button"
                      className={`job-card__fav${isFavorite ? " is-on" : ""}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleFavorite(vacancy.id);
                      }}
                      aria-label={
                        isFavorite ? "Убрать из избранного" : "В избранное"
                      }
                      title={
                        isFavorite ? "Убрать из избранного" : "В избранное"
                      }
                    >
                      {isFavorite ? "★" : "☆"}
                    </button>
                    <span className="btn btn-sm btn-primary">посмотреть →</span>
                  </div>
                  <div className="job-card__date">
                    {formatDate(vacancy.createdAt)}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
