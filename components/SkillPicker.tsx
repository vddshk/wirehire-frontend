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

export const SKILL_PICKER_MAX = 15;

const DEBOUNCE_MS = 280;
const SUGGEST_LIMIT = 10;

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

type SkillPickerProps = {
  slots: string[];
  onChange: (slots: string[]) => void;
  max?: number;
  /** Подпись поля поиска, когда ничего не выбрано */
  emptyLabel?: string;
  /** Подпись поля поиска, когда уже есть чипы */
  moreLabel?: string;
  placeholder?: string;
  /** Оставлять список открытым после выбора — удобно для фильтров */
  keepOpenOnSelect?: boolean;
  className?: string;
};

function normalizeSelected(slots: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of slots) {
    const label = raw.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

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

export function SkillPicker({
  slots,
  onChange,
  max = SKILL_PICKER_MAX,
  emptyLabel = "Добавьте навык",
  moreLabel = "Еще навык",
  placeholder = "Начните вводить — подскажем из справочника",
  keepOpenOnSelect = false,
  className,
}: SkillPickerProps) {
  const selected = useMemo(() => normalizeSelected(slots), [slots]);
  const atMax = selected.length >= max;

  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SkillTaxonomyEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const loadSuggestions = useCallback(
    async (search: string, selectedOverride?: string[]) => {
      setIsLoading(true);
      try {
        const items = await getSkillsTaxonomy({
          q: search.trim() || undefined,
          perPage: SUGGEST_LIMIT,
        });
        const taken = new Set(
          (selectedOverride ?? selected).map((item) => item.toLowerCase())
        );
        const filtered = items.filter(
          (entry) => !taken.has(entry.label.toLowerCase())
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
    [selected]
  );

  useEffect(() => {
    if (!isOpen || atMax) return;

    const timer = window.setTimeout(() => {
      void loadSuggestions(query);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [isOpen, query, loadSuggestions, atMax]);

  function commitSelection(next: string[]) {
    onChange(normalizeSelected(next).slice(0, max));
  }

  function addSkill(label: string) {
    const trimmed = label.trim();
    if (!trimmed || atMax) return;
    if (selected.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    const nextSelected = normalizeSelected([...selected, trimmed]).slice(0, max);
    commitSelection(nextSelected);
    setQuery("");
    if (keepOpenOnSelect) {
      setIsOpen(true);
      void loadSuggestions("", nextSelected);
    } else {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  function removeSkill(label: string) {
    commitSelection(selected.filter((item) => item !== label));
  }

  function selectSuggestion(entry: SkillTaxonomyEntry) {
    addSkill(entry.label);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (atMax) return;

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
    !atMax &&
    isOpen &&
    (isLoading || suggestions.length > 0 || query.trim().length > 0);

  return (
    <div className={`skill-picker${className ? ` ${className}` : ""}`}>
      {selected.length > 0 && (
        <ul className="skill-picker__chips" aria-label="Выбранные навыки">
          {selected.map((skill) => (
            <li key={skill}>
              <span className="skill-picker__chip">
                {skill}
                <button
                  type="button"
                  className="skill-picker__chip-remove"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Убрать ${skill}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!atMax && (
        <div
          ref={rootRef}
          className={`search-filter skill-suggest skill-picker__search${
            isOpen ? " is-open" : ""
          }`}
          onBlur={(event) => {
            if (!rootRef.current?.contains(event.relatedTarget as Node)) {
              setIsOpen(false);
              setActiveIndex(-1);
            }
          }}
        >
          <label className="search-filter__label" htmlFor={inputId}>
            {selected.length === 0 ? emptyLabel : moreLabel}
          </label>
          <div
            className={`search-filter__control skill-suggest__control${
              query.trim() ? " is-active" : ""
            }${isOpen ? " is-open" : ""}`}
          >
            <input
              id={inputId}
              type="text"
              className="search-filter__input skill-suggest__input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
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
                    {highlightMatch(entry.label, query)}
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

              {!isLoading && suggestions.length === 0 && query.trim() && (
                <p className="skill-suggest__status">
                  Навык не найден — выберите из списка
                </p>
              )}

              {!isLoading && suggestions.length === 0 && !query.trim() && (
                <p className="skill-suggest__status">
                  Начните вводить название навыка
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
