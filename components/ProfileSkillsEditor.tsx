"use client";

import { useEffect, useState } from "react";
import { SkillSuggestInput } from "@/components/SkillSuggestInput";
import { SKILL_PICKER_MAX } from "@/components/SkillPicker";
import type { CandidateSkill } from "@/types/skill";

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

type ProfileSkillsEditorProps = {
  skills: CandidateSkill[];
  disabled?: boolean;
  maxSkills?: number;
  onAdd: (payload: {
    label: string;
    taxonomyId?: number;
    yearsUsed?: number;
  }) => Promise<void>;
  onUpdateYears: (
    skillId: string,
    yearsUsed: number | undefined
  ) => Promise<void>;
  onDelete: (skillId: string) => Promise<void>;
};

function parseYearsInput(raw: string): number | null | string {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return "Введите число (например, 3 или 1.5)";
  if (parsed < 0 || parsed > 50) return "Допустимо от 0 до 50 лет";
  return parsed;
}

export function ProfileSkillsEditor({
  skills,
  disabled = false,
  maxSkills = SKILL_PICKER_MAX,
  onAdd,
  onUpdateYears,
  onDelete,
}: ProfileSkillsEditorProps) {
  const atMax = skills.length >= maxSkills;

  const [draftLabel, setDraftLabel] = useState("");
  const [draftTaxonomyId, setDraftTaxonomyId] = useState<number | undefined>();
  const [draftYears, setDraftYears] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [yearsDrafts, setYearsDrafts] = useState<Record<string, string>>({});
  const [yearsErrors, setYearsErrors] = useState<Record<string, string>>({});
  const [busySkillId, setBusySkillId] = useState<string | null>(null);

  useEffect(() => {
    setYearsDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const skill of skills) {
        next[skill.id] =
          prev[skill.id] ??
          (skill.yearsUsed !== undefined ? String(skill.yearsUsed) : "");
      }
      return next;
    });
  }, [skills]);

  const takenLabels = skills.map((skill) => skill.label);

  function resetDraft() {
    setDraftLabel("");
    setDraftTaxonomyId(undefined);
    setDraftYears("");
    setAddError("");
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || atMax || isAdding) return;

    const label = draftLabel.trim();
    if (!label) {
      setAddError("Выберите навык из справочника");
      return;
    }

    const duplicate = skills.some(
      (skill) => skill.label.toLowerCase() === label.toLowerCase()
    );
    if (duplicate) {
      setAddError("Этот навык уже есть в профиле");
      return;
    }

    const yearsParsed = parseYearsInput(draftYears);
    if (typeof yearsParsed === "string") {
      setAddError(yearsParsed);
      return;
    }

    setIsAdding(true);
    setAddError("");
    try {
      await onAdd({
        label,
        taxonomyId: draftTaxonomyId,
        yearsUsed: yearsParsed ?? undefined,
      });
      resetDraft();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Не удалось добавить навык"
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function commitYears(skill: CandidateSkill) {
    if (disabled || busySkillId) return;

    const raw = yearsDrafts[skill.id] ?? "";
    const parsed = parseYearsInput(raw);
    if (typeof parsed === "string") {
      setYearsErrors((prev) => ({ ...prev, [skill.id]: parsed }));
      return;
    }

    setYearsErrors((prev) => {
      const next = { ...prev };
      delete next[skill.id];
      return next;
    });

    const nextYears = parsed ?? undefined;
    if (skill.yearsUsed === nextYears) return;

    setBusySkillId(skill.id);
    try {
      await onUpdateYears(skill.id, nextYears);
    } catch (err) {
      setYearsErrors((prev) => ({
        ...prev,
        [skill.id]:
          err instanceof Error ? err.message : "Не удалось сохранить",
      }));
      setYearsDrafts((prev) => ({
        ...prev,
        [skill.id]:
          skill.yearsUsed !== undefined ? String(skill.yearsUsed) : "",
      }));
    } finally {
      setBusySkillId(null);
    }
  }

  async function handleDelete(skillId: string) {
    if (disabled || busySkillId) return;
    setBusySkillId(skillId);
    try {
      await onDelete(skillId);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Не удалось удалить навык"
      );
    } finally {
      setBusySkillId(null);
    }
  }

  return (
    <div className="profile-skills-editor">
      {!disabled && !atMax && (
        <form className="profile-skills-compose" onSubmit={handleAdd}>
          <div className="profile-skills-compose__skill">
            <SkillSuggestInput
              id="profile-skill-add"
              label="Навык"
              value={draftLabel}
              onChange={setDraftLabel}
              onTaxonomyIdChange={setDraftTaxonomyId}
              excludeLabels={takenLabels}
              placeholder="React, PostgreSQL, Figma…"
            />
          </div>
          <div className="profile-skills-compose__years field">
            <span className="field-label">Лет</span>
            <input
              value={draftYears}
              onChange={(event) => setDraftYears(event.target.value)}
              className="input"
              inputMode="decimal"
              placeholder="3"
              aria-label="Лет использования"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary profile-skills-compose__submit"
            disabled={isAdding || !draftLabel.trim()}
          >
            {isAdding ? "Добавляем…" : "Добавить →"}
          </button>
          {addError && (
            <p className="profile-skills-compose__error" role="alert">
              {addError}
            </p>
          )}
        </form>
      )}

      {skills.length === 0 ? (
        <div className="profile-skills-hint">
          <p className="profile-skills-hint__title">
            {disabled
              ? "Сначала сохраните профиль"
              : "Пока нет навыков"}
          </p>
          {!disabled && (
            <p className="profile-skills-hint__desc">
              Технологии, языки и инструменты — добавьте первый навык в форме
              выше
            </p>
          )}
        </div>
      ) : (
        <ul className="profile-skills-list" aria-label="Навыки в профиле">
          {skills.map((skill) => {
            const category = skill.taxonomy?.category;
            const yearsError = yearsErrors[skill.id];
            const isBusy = busySkillId === skill.id;

            return (
              <li className="profile-skill-row" key={skill.id}>
                <div className="profile-skill-row__main">
                  <span className="profile-skill-row__name">{skill.label}</span>
                  {category && (
                    <span className="profile-skill-row__category">
                      {categoryLabels[category] ?? category}
                    </span>
                  )}
                </div>

                <div className="profile-skill-row__years">
                  <input
                    type="text"
                    className="input profile-skill-row__years-input"
                    value={yearsDrafts[skill.id] ?? ""}
                    onChange={(event) =>
                      setYearsDrafts((prev) => ({
                        ...prev,
                        [skill.id]: event.target.value,
                      }))
                    }
                    onBlur={() => void commitYears(skill)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void commitYears(skill);
                      }
                    }}
                    inputMode="decimal"
                    placeholder="—"
                    disabled={disabled || isBusy}
                    aria-label={`Лет использования: ${skill.label}`}
                    aria-invalid={Boolean(yearsError)}
                  />
                  <span className="profile-skill-row__years-label">лет</span>
                  {yearsError && (
                    <span className="profile-skill-row__years-error" role="alert">
                      {yearsError}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="profile-skill-row__remove"
                  onClick={() => void handleDelete(skill.id)}
                  disabled={disabled || isBusy}
                  aria-label={`Удалить ${skill.label}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
