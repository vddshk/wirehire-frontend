// Результат проверки навыка (skill_verifications, коммит bd02bd5).
export type SkillVerificationStatus =
  | "verified"
  | "partially_verified"
  | "questionable";

export type SkillVerification = {
  id: string;
  candidateSkillId: string;
  verificationRunId?: string;
  status: SkillVerificationStatus;
  sourceType: "assessment" | "manual";
  score?: number;
  reason?: string;
  // Название навыка из вложенного candidate_skill — для показа без доп. запроса.
  skillLabel: string;
};
