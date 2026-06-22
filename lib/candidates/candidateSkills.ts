import type { Candidate } from "@/types/candidate";

/** Нормализованные подписи навыков кандидата для поиска и чипов. */
export function candidateSkillLabels(candidate: Candidate): string[] {
  if (candidate.structuredSkills?.length) {
    return candidate.structuredSkills.map((skill) => skill.name);
  }
  if (candidate.skillsPreview?.length) {
    return candidate.skillsPreview.map((skill) => skill.label);
  }
  return candidate.skills ?? [];
}

export function matchesSkillQuery(
  skillLabels: string[],
  query: string
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return skillLabels.some((label) => label.toLowerCase().includes(needle));
}

export function matchesAllMustSkills(
  skillLabels: string[],
  must: string[]
): boolean {
  if (must.length === 0) return true;
  const lower = skillLabels.map((label) => label.toLowerCase());
  return must.every((required) => {
    const needle = required.trim().toLowerCase();
    if (!needle) return true;
    return lower.some(
      (label) => label.includes(needle) || needle.includes(label)
    );
  });
}

export function countNiceSkillMatches(
  skillLabels: string[],
  nice: string[]
): number {
  if (nice.length === 0) return 0;
  const lower = skillLabels.map((label) => label.toLowerCase());
  let count = 0;
  for (const item of nice) {
    const needle = item.trim().toLowerCase();
    if (!needle) continue;
    if (
      lower.some((label) => label.includes(needle) || needle.includes(label))
    ) {
      count += 1;
    }
  }
  return count;
}

export function maxAssessmentScore(candidate: Candidate): number {
  const scores =
    candidate.structuredSkills
      ?.map((skill) => skill.assessmentScore)
      .filter((score): score is number => typeof score === "number") ?? [];
  if (scores.length === 0) return 0;
  return Math.max(...scores);
}

export function hasConfirmedSkillsOnly(candidate: Candidate): boolean {
  const structured = candidate.structuredSkills;
  if (!structured?.length) return false;
  return structured.every((skill) => skill.status === "confirmed");
}
