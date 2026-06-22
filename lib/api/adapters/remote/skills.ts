import {
  CandidateSkill,
  CandidateSkillSelfLevel,
  CandidateSkillStatus,
  SkillTaxonomyEntry,
} from "@/types/skill";
import { apiClient } from "./client";

// === Бэк-контракт (snake_case) ===

interface BackendTaxonomyEntry {
  id: number;
  code?: string | null;
  label: string;
  category?: string | null;
  parent_id?: number | null;
}

interface BackendCandidateSkill {
  id: string;
  candidate_id: string;
  taxonomy_id?: number | null;
  label: string;
  self_level?: string | null;
  years_used?: number | null;
  context?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  taxonomy?: BackendTaxonomyEntry | null;
}

interface CandidateSkillEnvelope {
  data: BackendCandidateSkill;
}

interface CandidateSkillPaginated {
  data: BackendCandidateSkill[];
}

interface TaxonomyPaginated {
  data: BackendTaxonomyEntry[];
}

// === Мапперы ===

const SELF_LEVELS: CandidateSkillSelfLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];
const STATUSES: CandidateSkillStatus[] = ["declared", "verified", "deprecated"];

function mapSelfLevel(
  value?: string | null
): CandidateSkillSelfLevel | undefined {
  if (!value) return undefined;
  return (SELF_LEVELS as string[]).includes(value)
    ? (value as CandidateSkillSelfLevel)
    : undefined;
}

function mapStatus(value: string): CandidateSkillStatus {
  return (STATUSES as string[]).includes(value)
    ? (value as CandidateSkillStatus)
    : "declared";
}

function mapTaxonomy(b: BackendTaxonomyEntry): SkillTaxonomyEntry {
  return {
    id: b.id,
    code: b.code ?? undefined,
    label: b.label,
    category: b.category ?? undefined,
    parentId: b.parent_id ?? undefined,
  };
}

export function mapCandidateSkill(b: BackendCandidateSkill): CandidateSkill {
  return {
    id: b.id,
    candidateId: b.candidate_id,
    taxonomyId: b.taxonomy_id ?? undefined,
    label: b.label,
    selfLevel: mapSelfLevel(b.self_level),
    yearsUsed: b.years_used ?? undefined,
    context: b.context ?? undefined,
    status: mapStatus(b.status),
    taxonomy: b.taxonomy ? mapTaxonomy(b.taxonomy) : undefined,
    createdAt: b.created_at ?? undefined,
    updatedAt: b.updated_at ?? undefined,
  };
}

// === Запросы ===

export async function getMySkills(): Promise<CandidateSkill[]> {
  const response = await apiClient<CandidateSkillPaginated>("/me/skills", {
    method: "GET",
    auth: "required",
  });
  return response.data.map(mapCandidateSkill);
}

export type StoreSkillInput = {
  /** Если указан — backend подставит label из справочника при отсутствии. */
  taxonomyId?: number;
  /** Обязателен если нет taxonomyId. */
  label?: string;
  selfLevel?: CandidateSkillSelfLevel;
  /** Дробное число лет, 0..50. */
  yearsUsed?: number;
  context?: string;
};

function toBackendBody(input: StoreSkillInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.taxonomyId !== undefined) body.taxonomy_id = input.taxonomyId;
  if (input.label !== undefined) body.label = input.label;
  if (input.selfLevel !== undefined) body.self_level = input.selfLevel;
  if (input.yearsUsed !== undefined) body.years_used = input.yearsUsed;
  if (input.context !== undefined) body.context = input.context;
  return body;
}

export async function createMySkill(
  input: StoreSkillInput
): Promise<CandidateSkill> {
  const response = await apiClient<CandidateSkillEnvelope>("/me/skills", {
    method: "POST",
    auth: "required",
    body: toBackendBody(input),
  });
  return mapCandidateSkill(response.data);
}

export async function updateMySkill(
  skillId: string,
  input: StoreSkillInput
): Promise<CandidateSkill> {
  const response = await apiClient<CandidateSkillEnvelope>(
    `/me/skills/${skillId}`,
    {
      method: "PATCH",
      auth: "required",
      body: toBackendBody(input),
    }
  );
  return mapCandidateSkill(response.data);
}

export async function deleteMySkill(skillId: string): Promise<void> {
  await apiClient(`/me/skills/${skillId}`, {
    method: "DELETE",
    auth: "required",
  });
}

export type TaxonomyQuery = {
  q?: string;
  category?: string;
  page?: number;
  perPage?: number;
};

export async function getSkillsTaxonomy(
  query: TaxonomyQuery = {}
): Promise<SkillTaxonomyEntry[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.page) params.set("page", String(query.page));
  if (query.perPage) params.set("per_page", String(query.perPage));
  const qs = params.toString();
  const response = await apiClient<TaxonomyPaginated>(
    `/skills/taxonomy${qs ? `?${qs}` : ""}`,
    { method: "GET", auth: "none" }
  );
  return response.data.map(mapTaxonomy);
}
