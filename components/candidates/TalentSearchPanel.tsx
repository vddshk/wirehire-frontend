"use client";

import { useMemo, useState } from "react";
import { SkillPicker } from "@/components/SkillPicker";
import { FormDropdown } from "@/components/FormDropdown";
import { SearchFilterSelect } from "@/components/SearchFilterField";
import type { CandidateFilterDefinition, CandidateSearchSort } from "@/types/candidateSearch";
import {
  TALENT_SEARCH_PRESETS,
  presetMatchesState,
  type TalentSearchPreset,
} from "@/lib/candidates/searchPresets";

const SORT_OPTIONS: { value: CandidateSearchSort; label: string }[] = [
  { value: "relevance", label: "По релевантности" },
  { value: "assessment_score", label: "По оценке навыков" },
  { value: "profile_updated", label: "По свежести профиля" },
];

type ActiveChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type TalentSearchPanelProps = {
  filterSchema: CandidateFilterDefinition[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  searchQ: string;
  onSearchChange: (value: string) => void;
  skillsMust: string[];
  onSkillsMustChange: (skills: string[]) => void;
  skillsNice: string[];
  onSkillsNiceChange: (skills: string[]) => void;
  sort: CandidateSearchSort;
  onSortChange: (sort: CandidateSearchSort) => void;
  total: number;
  poolTotal: number;
  isSearching: boolean;
  filtersActive: boolean;
  onClear: () => void;
  onSaveQuery: () => void;
  saveQueryLabel: string;
  saveQueryDisabled: boolean;
  vacancyBanner?: { title: string; onClear: () => void } | null;
};

function optionLabel(
  field: CandidateFilterDefinition,
  value: string
): string {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

function isDefaultValue(
  field: CandidateFilterDefinition,
  value: string
): boolean {
  return value === (field.default ?? "");
}

export function TalentSearchPanel({
  filterSchema,
  filterValues,
  onFilterChange,
  searchQ,
  onSearchChange,
  skillsMust,
  onSkillsMustChange,
  skillsNice,
  onSkillsNiceChange,
  sort,
  onSortChange,
  total,
  poolTotal,
  isSearching,
  filtersActive,
  onClear,
  onSaveQuery,
  saveQueryLabel,
  saveQueryDisabled,
  vacancyBanner,
}: TalentSearchPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const searchPlaceholder = useMemo(
    () =>
      filterSchema.find((field) => field.key === "q")?.placeholder ??
      "Имя, роль, город…",
    [filterSchema]
  );

  const advancedFields = useMemo(
    () =>
      filterSchema.filter((field) => {
        if (field.type === "search" || field.key === "skill") return false;
        if (field.group === "primary" || field.group === "deprecated") {
          return false;
        }
        return (
          field.type === "select" ||
          field.type === "text" ||
          field.type === "toggle" ||
          field.type === "range"
        );
      }),
    [filterSchema]
  );

  const qualityFields = useMemo(
    () =>
      filterSchema.filter(
        (field) =>
          field.group === "quality" &&
          (field.type === "toggle" || field.type === "range")
      ),
    [filterSchema]
  );

  const poolValue = filterValues.pool ?? "admitted";
  const admittedOnly = poolValue === "admitted";

  function applyPreset(preset: TalentSearchPreset) {
    for (const [key, value] of Object.entries(preset.filterValues)) {
      onFilterChange(key, value);
    }
    onSkillsMustChange(preset.skillsMust ?? []);
    onSkillsNiceChange(preset.skillsNice ?? []);
    if (preset.sort) onSortChange(preset.sort);
  }

  const activeChips = useMemo((): ActiveChip[] => {
    const chips: ActiveChip[] = [];

    if (searchQ.trim()) {
      chips.push({
        id: "q",
        label: `Поиск: ${searchQ.trim()}`,
        onRemove: () => onSearchChange(""),
      });
    }

    for (const skill of skillsMust) {
      chips.push({
        id: `must-${skill}`,
        label: `Обязательно: ${skill}`,
        onRemove: () =>
          onSkillsMustChange(skillsMust.filter((item) => item !== skill)),
      });
    }

    for (const skill of skillsNice) {
      chips.push({
        id: `nice-${skill}`,
        label: `Желательно: ${skill}`,
        onRemove: () =>
          onSkillsNiceChange(skillsNice.filter((item) => item !== skill)),
      });
    }

    for (const field of advancedFields) {
      const value = filterValues[field.key] ?? "";
      if (isDefaultValue(field, value)) continue;
      if (field.type === "toggle" && value !== "true") continue;

      const label =
        field.type === "select"
          ? optionLabel(field, value)
          : field.type === "range"
            ? `${value}+`
            : field.label;

      chips.push({
        id: field.key,
        label: `${field.label}: ${label}`,
        onRemove: () => onFilterChange(field.key, field.default ?? ""),
      });
    }

    for (const field of qualityFields) {
      const value = filterValues[field.key] ?? "";
      if (isDefaultValue(field, value)) continue;
      if (field.type === "toggle" && value !== "true") continue;

      chips.push({
        id: field.key,
        label:
          field.type === "range"
            ? `${field.label}: ${value}+`
            : field.label,
        onRemove: () => onFilterChange(field.key, field.default ?? ""),
      });
    }

    return chips;
  }, [
    searchQ,
    skillsMust,
    skillsNice,
    advancedFields,
    qualityFields,
    filterValues,
    onSearchChange,
    onSkillsMustChange,
    onSkillsNiceChange,
    onFilterChange,
  ]);

  function renderSchemaField(field: CandidateFilterDefinition) {
    const value = filterValues[field.key] ?? field.default ?? "";
    const backendReady = field.backendReady !== false;

    if (field.type === "select") {
      return (
        <SearchFilterSelect
          key={field.key}
          id={`filter-${field.key}`}
          label={field.label}
          value={value}
          inactiveValue={field.default ?? ""}
          onChange={(next) => onFilterChange(field.key, next)}
          options={
            field.options?.map((option) => ({
              value: option.value,
              label: option.label,
            })) ?? []
          }
        />
      );
    }

    if (field.type === "toggle") {
      const checked = value === "true";
      return (
        <label
          key={field.key}
          className={`talent-search__toggle${checked ? " is-active" : ""}${
            !backendReady ? " is-disabled" : ""
          }`}
          title={field.helpText}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={!backendReady}
            onChange={(event) =>
              onFilterChange(field.key, event.target.checked ? "true" : "false")
            }
          />
          <span>{field.label}</span>
          {!backendReady && (
            <span className="talent-search__soon">скоро</span>
          )}
        </label>
      );
    }

    if (field.type === "range") {
      return (
        <label key={field.key} className="search-filter">
          <span className="search-filter__label">{field.label}</span>
          <div
            className={`search-filter__control${
              value.trim() ? " is-active" : ""
            }`}
          >
            <input
              type="number"
              className="search-filter__input"
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              value={value}
              disabled={!backendReady}
              title={field.helpText}
              placeholder={field.placeholder ?? `${field.min ?? 0}–${field.max ?? 100}`}
              onChange={(event) => onFilterChange(field.key, event.target.value)}
            />
          </div>
        </label>
      );
    }

    return (
      <label key={field.key} className="search-filter">
        <span className="search-filter__label">{field.label}</span>
        <div
          className={`search-filter__control${
            value.trim() ? " is-active" : ""
          }`}
        >
          <input
            type="text"
            className="search-filter__input"
            value={value}
            onChange={(event) => onFilterChange(field.key, event.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      </label>
    );
  }

  return (
    <div className="talent-search__panel">
      {vacancyBanner && (
        <div className="talent-search__vacancy-banner">
          <p>
            Поиск по вакансии: <strong>{vacancyBanner.title}</strong>
          </p>
          <button
            type="button"
            className="talent-search__vacancy-clear"
            onClick={vacancyBanner.onClear}
          >
            Сбросить пресет
          </button>
        </div>
      )}

      <input
        value={searchQ}
        onChange={(event) => onSearchChange(event.target.value)}
        className="input search talent-search__query"
        placeholder={searchPlaceholder}
        aria-label="Поиск кандидатов"
      />

      <div className="talent-search__skills">
        <div className="talent-search__skill-group">
          <p className="talent-search__skill-label">Обязательные навыки</p>
          <SkillPicker
            slots={skillsMust}
            onChange={onSkillsMustChange}
            max={8}
            emptyLabel="Добавьте обязательный навык"
            moreLabel="Еще обязательный"
            placeholder="React, Python… — все должны совпасть"
            keepOpenOnSelect
            className="talent-search__skill-picker"
          />
        </div>
        <div className="talent-search__skill-group">
          <p className="talent-search__skill-label">Желательные навыки</p>
          <SkillPicker
            slots={skillsNice}
            onChange={onSkillsNiceChange}
            max={10}
            emptyLabel="Добавьте желательный навык"
            moreLabel="Еще желательный"
            placeholder="Плюсом к релевантности, не обязательны"
            keepOpenOnSelect
            className="talent-search__skill-picker"
          />
        </div>
      </div>

      <div className="talent-search__toolbar">
        <div className="talent-search__presets">
          {TALENT_SEARCH_PRESETS.map((preset) => {
            const active = presetMatchesState(
              preset,
              filterValues,
              skillsMust,
              skillsNice
            );
            return (
              <button
                key={preset.id}
                type="button"
                className={`talent-search__preset${active ? " is-active" : ""}`}
                title={preset.description}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="talent-search__toolbar-actions">
          <button
            type="button"
            className={`talent-search__pool-toggle${
              admittedOnly ? " is-active" : ""
            }`}
            onClick={() =>
              onFilterChange("pool", admittedOnly ? "all_visible" : "admitted")
            }
            aria-pressed={admittedOnly}
          >
            {admittedOnly ? "Только допущенные" : "Все профили"}
          </button>
          <button
            type="button"
            className={`talent-search__advanced-toggle${
              advancedOpen ? " is-open" : ""
            }`}
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
          >
            Еще фильтры
            <span className="talent-search__advanced-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </div>
      </div>

      {advancedOpen && (
        <div className="talent-search__advanced">
          <div className="talent-search__filters">
            {advancedFields.map((field) => renderSchemaField(field))}
          </div>
          {qualityFields.length > 0 && (
            <div className="talent-search__quality">
              <p className="talent-search__quality-title">
                Качество профиля WireHire
              </p>
              <div className="talent-search__quality-grid">
                {qualityFields.map((field) => renderSchemaField(field))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeChips.length > 0 && (
        <div className="talent-search__chips">
          {activeChips.map((chip) => (
            <span key={chip.id} className="talent-search__chip">
              {chip.label}
              <button
                type="button"
                className="talent-search__chip-remove"
                onClick={chip.onRemove}
                aria-label={`Убрать фильтр: ${chip.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="talent-search__bar">
        <p className="talent-search__summary">
          <strong>{total}</strong>
          {isSearching ? " · ищем…" : null}
          {!isSearching && (
            <>
              {" "}
              {total === 1 ? "кандидат" : "кандидатов"}
              {admittedOnly && (
                <span className="talent-search__summary-note">
                  {" "}
                  · база допущенных ({poolTotal})
                </span>
              )}
            </>
          )}
        </p>

        <div className="talent-search__bar-actions">
          <label className="talent-search__sort-inline">
            <span className="talent-search__sort-caption">Сортировка</span>
            <FormDropdown
              id="candidate-search-sort"
              value={sort}
              onChange={(value) =>
                onSortChange(value as CandidateSearchSort)
              }
              options={SORT_OPTIONS}
              placeholder="По релевантности"
              hideClearOption
              inactiveValue=""
              className="form-dropdown--filter talent-search__sort-dropdown"
              ariaLabel="Сортировка"
            />
          </label>
          {filtersActive && (
            <button
              type="button"
              className="talent-search__action talent-search__action--ghost"
              onClick={onClear}
            >
              Сбросить
            </button>
          )}
          <button
            type="button"
            className="talent-search__action talent-search__action--primary"
            onClick={onSaveQuery}
            disabled={saveQueryDisabled}
            title={
              saveQueryDisabled
                ? "Задайте фильтры, чтобы сохранить запрос"
                : "Сохранить текущий запрос"
            }
          >
            {saveQueryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
