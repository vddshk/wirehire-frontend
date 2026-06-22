"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { getSkillsTaxonomy } from "@/lib/api/skills";
import type { SkillTaxonomyEntry } from "@/types/skill";

const DEBOUNCE_MS = 280;
const SUGGEST_LIMIT = 8;

const categoryLabels: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  mobile: "Mobile",
  data: "Data",
  devops: "DevOps",
  design: "Design",
  product: "Product",
  management: "Management",
  other: "Другое",
};

type SkillSuggestInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Вызывается при выборе из справочника или при ручном вводе (сброс id). */
  onTaxonomyIdChange?: (taxonomyId: number | undefined) => void;
  /** Уже выбранные названия — не показываем в подсказках. */
  excludeLabels?: string[];
  placeholder?: string;
  id?: string;
};

function highlightMatch(label: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return label;

  const lowerLabel = label.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerLabel.indexOf(lowerQuery);
  if (index === -1) return label;

  return (
    <>
      {label.slice(0, index)}
      <mark className="skill-suggest__match">
        {label.slice(index, index + trimmed.length)}
      </mark>
      {label.slice(index + trimmed.length)}
    </>
  );
}

export function SkillSuggestInput({
  label,
  value,
  onChange,
  onTaxonomyIdChange,
  excludeLabels = [],
  placeholder,
  id: idProp,
}: SkillSuggestInputProps) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SkillTaxonomyEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const active = value.trim().length > 0;

  const excluded = useMemo(
    () => new Set(excludeLabels.map((item) => item.trim().toLowerCase())),
    [excludeLabels]
  );

  const loadSuggestions = useCallback(
    async (query: string) => {
      setIsLoading(true);
      try {
        const items = await getSkillsTaxonomy({
          q: query.trim() || undefined,
          perPage: SUGGEST_LIMIT,
        });
        const filtered = items.filter(
          (entry) => !excluded.has(entry.label.toLowerCase())
        );
        setSuggestions(filtered);
        setActiveIndex(filtered.length > 0 ? 0 : -1);
      } catch {
        setSuggestions([]);
        setActiveIndex(-1);
      } finally {
        setIsLoading(false);
      }
    },
    [excluded]
  );

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      void loadSuggestions(value);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [isOpen, value, loadSuggestions]);

  function selectSuggestion(entry: SkillTaxonomyEntry) {
    onChange(entry.label);
    onTaxonomyIdChange?.(entry.id);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        setIsOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const showDropdown =
    isOpen &&
    (isLoading || suggestions.length > 0 || value.trim().length > 0);

  return (
    <div
      ref={rootRef}
      className={`search-filter skill-suggest${isOpen ? " is-open" : ""}`}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node)) {
          setIsOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label className="search-filter__label" htmlFor={inputId}>
        {label}
      </label>
      <div
        className={`search-filter__control skill-suggest__control${
          active ? " is-active" : ""
        }${isOpen ? " is-open" : ""}`}
      >
        <input
          id={inputId}
          type="text"
          className="search-filter__input skill-suggest__input"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onTaxonomyIdChange?.(undefined);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
      </div>

      {showDropdown && (
        <div
          className={`skill-suggest__dropdown${
            isLoading ? " is-loading" : ""
          }`}
          id={listboxId}
          role="listbox"
        >
          {suggestions.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`skill-suggest__option${
                index === activeIndex ? " is-active" : ""
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(entry)}
            >
              <span className="skill-suggest__option-label">
                {highlightMatch(entry.label, value)}
              </span>
              {entry.category && (
                <span className="skill-suggest__option-meta">
                  {categoryLabels[entry.category] ?? entry.category}
                </span>
              )}
            </button>
          ))}

          {isLoading && suggestions.length === 0 && (
            <p className="skill-suggest__status">Ищем навыки…</p>
          )}

          {!isLoading && suggestions.length === 0 && value.trim() && (
            <p className="skill-suggest__status">
              Не нашли в справочнике — поиск пойдет по введенному тексту
            </p>
          )}

          {!isLoading && suggestions.length === 0 && !value.trim() && (
            <p className="skill-suggest__status">Начните вводить название навыка</p>
          )}
        </div>
      )}
    </div>
  );
}
