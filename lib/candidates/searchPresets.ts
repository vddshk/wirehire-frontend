import type { CandidateSearchSort } from "@/types/candidateSearch";

export type TalentSearchPreset = {
  id: string;
  label: string;
  description?: string;
  filterValues: Record<string, string>;
  skillsMust?: string[];
  skillsNice?: string[];
  sort?: CandidateSearchSort;
};

export const TALENT_SEARCH_PRESETS: TalentSearchPreset[] = [
  {
    id: "admitted_verified",
    label: "Проверенные",
    description: "Допущены в базу · статус проверки «подтвержден»",
    filterValues: {
      pool: "admitted",
      verification_status: "verified",
      location: "",
      work_format: "",
    },
  },
  {
    id: "remote_ready",
    label: "Удаленка",
    description: "Допущены · формат работы удаленный",
    filterValues: {
      pool: "admitted",
      work_format: "remote",
      verification_status: "",
      location: "",
    },
  },
  {
    id: "all_visible",
    label: "Широкий поиск",
    description: "Все видимые профили, без ограничения базы",
    filterValues: {
      pool: "all_visible",
      verification_status: "",
      location: "",
      work_format: "",
    },
  },
];

export function presetMatchesState(
  preset: TalentSearchPreset,
  filterValues: Record<string, string>,
  skillsMust: string[],
  skillsNice: string[]
): boolean {
  for (const [key, value] of Object.entries(preset.filterValues)) {
    if ((filterValues[key] ?? "") !== value) return false;
  }
  const must = preset.skillsMust ?? [];
  const nice = preset.skillsNice ?? [];
  if (must.length !== skillsMust.length || nice.length !== skillsNice.length) {
    return false;
  }
  const mustSet = new Set(skillsMust.map((s) => s.toLowerCase()));
  if (!must.every((s) => mustSet.has(s.toLowerCase()))) return false;
  const niceSet = new Set(skillsNice.map((s) => s.toLowerCase()));
  return nice.every((s) => niceSet.has(s.toLowerCase()));
}
