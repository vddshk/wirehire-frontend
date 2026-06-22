import { CandidateSkill, SkillTaxonomyEntry } from "@/types/skill";
import { getStoredArray, setStoredArray } from "./storage";

// Locally-stored proxy of /me/skills для оффлайн-режима и тестов без бэка.
// Структура слов в slot'е та же, что вернул бы remote-адаптер, чтобы UI
// мог переключаться между local/remote без правок.
const STORAGE_KEY = "wirehire-candidate-skills";

// candidateId привязки нет в local-режиме — у нас один «текущий» кандидат.
// Используем константу-плейсхолдер: при переключении на remote эти id все
// равно перетрутся.
const LOCAL_CANDIDATE_ID = "local-candidate";

function generateId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getMySkills(): Promise<CandidateSkill[]> {
  return getStoredArray<CandidateSkill>(STORAGE_KEY);
}

export type StoreSkillInput = {
  taxonomyId?: number;
  label?: string;
  selfLevel?: CandidateSkill["selfLevel"];
  yearsUsed?: number;
  context?: string;
};

export async function createMySkill(
  input: StoreSkillInput
): Promise<CandidateSkill> {
  const label = input.label?.trim();
  if (!label) {
    throw new Error("label обязателен для локального хранения навыка");
  }
  const skills = await getMySkills();
  const now = new Date().toISOString();
  const skill: CandidateSkill = {
    id: generateId(),
    candidateId: LOCAL_CANDIDATE_ID,
    taxonomyId: input.taxonomyId,
    label,
    selfLevel: input.selfLevel,
    yearsUsed: input.yearsUsed,
    context: input.context?.trim() || undefined,
    status: "declared",
    createdAt: now,
    updatedAt: now,
  };
  setStoredArray<CandidateSkill>(STORAGE_KEY, [...skills, skill]);
  return skill;
}

export async function updateMySkill(
  skillId: string,
  input: StoreSkillInput
): Promise<CandidateSkill> {
  const skills = await getMySkills();
  const idx = skills.findIndex((s) => s.id === skillId);
  if (idx === -1) {
    throw new Error("Навык не найден");
  }
  const updated: CandidateSkill = {
    ...skills[idx],
    ...(input.taxonomyId !== undefined && { taxonomyId: input.taxonomyId }),
    ...(input.label !== undefined && { label: input.label.trim() }),
    ...(input.selfLevel !== undefined && { selfLevel: input.selfLevel }),
    ...(input.yearsUsed !== undefined && { yearsUsed: input.yearsUsed }),
    ...(input.context !== undefined && {
      context: input.context.trim() || undefined,
    }),
    updatedAt: new Date().toISOString(),
  };
  const next = [...skills];
  next[idx] = updated;
  setStoredArray<CandidateSkill>(STORAGE_KEY, next);
  return updated;
}

export async function deleteMySkill(skillId: string): Promise<void> {
  const skills = await getMySkills();
  setStoredArray<CandidateSkill>(
    STORAGE_KEY,
    skills.filter((s) => s.id !== skillId)
  );
}

export type TaxonomyQuery = {
  q?: string;
  category?: string;
  page?: number;
  perPage?: number;
};

const MOCK_TAXONOMY: SkillTaxonomyEntry[] = [
  { id: 1, code: "react", label: "React", category: "frontend" },
  { id: 2, code: "typescript", label: "TypeScript", category: "frontend" },
  { id: 3, code: "javascript", label: "JavaScript", category: "frontend" },
  { id: 4, code: "nextjs", label: "Next.js", category: "frontend" },
  { id: 5, code: "vue", label: "Vue", category: "frontend" },
  { id: 6, code: "angular", label: "Angular", category: "frontend" },
  { id: 7, code: "python", label: "Python", category: "backend" },
  { id: 8, code: "django", label: "Django", category: "backend" },
  { id: 9, code: "nodejs", label: "Node.js", category: "backend" },
  { id: 10, code: "go", label: "Go", category: "backend" },
  { id: 11, code: "rust", label: "Rust", category: "backend" },
  { id: 12, code: "postgresql", label: "PostgreSQL", category: "backend" },
  { id: 13, code: "mongodb", label: "MongoDB", category: "data" },
  { id: 14, code: "docker", label: "Docker", category: "devops" },
  { id: 15, code: "kubernetes", label: "Kubernetes", category: "devops" },
  { id: 16, code: "aws", label: "AWS", category: "devops" },
  { id: 17, code: "tailwind", label: "Tailwind CSS", category: "frontend" },
  { id: 18, code: "product-management", label: "Product Management", category: "product" },
  { id: 19, code: "project-management", label: "Project Management", category: "management" },
  { id: 20, code: "figma", label: "Figma", category: "design" },
];

export async function getSkillsTaxonomy(
  query: TaxonomyQuery = {}
): Promise<SkillTaxonomyEntry[]> {
  const perPage = query.perPage ?? 50;
  const term = query.q?.trim().toLowerCase();

  let items = MOCK_TAXONOMY;
  if (query.category) {
    items = items.filter((entry) => entry.category === query.category);
  }
  if (term) {
    items = items.filter(
      (entry) =>
        entry.label.toLowerCase().includes(term) ||
        entry.code?.toLowerCase().includes(term)
    );
  }

  const page = query.page ?? 1;
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}
