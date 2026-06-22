export type ProfileSectionKey =
  | "basics"
  | "experience"
  | "skills"
  | "visibility";

export type ProfileSection = {
  key: ProfileSectionKey;
  label: string;
  done: boolean;
};

export type ProfileCompletionInput = {
  fullName?: string;
  headline?: string;
  location?: string;
  desiredRole?: string;
  summary?: string;
  experienceCount: number;
  skillsCount: number;
};

/** Четыре раздела профиля — та же логика, что у вкладок на /candidate/profile. */
export function getProfileSections(
  input: ProfileCompletionInput
): ProfileSection[] {
  return [
    {
      key: "basics",
      label: "Профиль",
      done: Boolean(
        input.fullName?.trim() &&
          input.headline?.trim() &&
          input.location?.trim() &&
          input.desiredRole?.trim() &&
          input.summary?.trim()
      ),
    },
    {
      key: "experience",
      label: "Опыт",
      done: input.experienceCount > 0,
    },
    {
      key: "skills",
      label: "Навыки",
      done: input.skillsCount > 0,
    },
    {
      key: "visibility",
      label: "Кто видит профиль",
      done: true,
    },
  ];
}

export function computeProfileCompletionPercent(
  input: ProfileCompletionInput
): number {
  const sections = getProfileSections(input);
  const done = sections.filter((section) => section.done).length;
  return Math.round((done / sections.length) * 100);
}
