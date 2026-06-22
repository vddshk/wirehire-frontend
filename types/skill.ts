// === Legacy: AI-assessment-driven skill bag (per-candidate, derived). ===
// Эти типы оставлены для совместимости с экранами AI-оценки. Не путать с
// CandidateSkill ниже — это новая структурированная модель из таблицы
// `candidate_skills` бэка (отдельный CRUD через /me/skills).
export type SkillStatus =
  | "claimed"
  | "partially_confirmed"
  | "confirmed"
  | "questionable";

export type SkillCategory =
  | "frontend"
  | "backend"
  | "mobile"
  | "data"
  | "devops"
  | "design"
  | "product"
  | "management"
  | "other";

export type Skill = {
  id: string;
  candidateId: string;
  name: string;
  category: SkillCategory;
  status: SkillStatus;
  selfReportedLevel?: number;
  assessmentScore?: number;
  updatedAt: string;
};

// === New: structured candidate skills (taxonomy + per-candidate CRUD). ===
// Контракт зеркалит CandidateSkill из openapi.yaml (snake_case → camelCase).
export type CandidateSkillSelfLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

export type CandidateSkillStatus = "declared" | "verified" | "deprecated";

export type SkillTaxonomyEntry = {
  id: number;
  /** Машинный код навыка (например, `python`). У некоторых записей пусто. */
  code?: string;
  /** Человеческое название (например, «Python»). */
  label: string;
  /** Категория (`backend` / `frontend` / …) для группировки в автодополнении. */
  category?: string;
  /** Родительский id для иерархичных навыков. */
  parentId?: number;
};

export type CandidateSkill = {
  id: string;
  candidateId: string;
  /** Если навык взят из справочника — id записи taxonomy; иначе null. */
  taxonomyId?: number;
  label: string;
  selfLevel?: CandidateSkillSelfLevel;
  /** Дробное число лет (0..50), `null` если не указано. */
  yearsUsed?: number;
  /** Свободный текст — где/как использовал. До 2000 символов. */
  context?: string;
  status: CandidateSkillStatus;
  /** Дублирующий объект taxonomy в ответе — удобно показать категорию. */
  taxonomy?: SkillTaxonomyEntry;
  createdAt?: string;
  updatedAt?: string;
};
