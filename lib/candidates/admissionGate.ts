import { Candidate, CandidateExperience } from "@/types/candidate";
import { Consent } from "@/types/consent";

export type AdmissionRequirement = {
  key: string;
  label: string;
  met: boolean;
  hint?: string;
};

export type AdmissionCheckResult = {
  admitted: boolean;
  requirements: AdmissionRequirement[];
};

/**
 * Проверяет, прошел ли кандидат порог допуска в общую базу.
 *
 * Критерии (черновые — backend заменяет на финальную логику из ТЗ §15):
 *   1. Заполнены обязательные поля профиля (fullName, headline, location, summary).
 *   2. Не менее 1 карточки опыта со статусом "verified".
 *   3. Активное согласие типа "profile_visibility".
 *   4. Активное согласие типа "verification".
 *
 * @param candidate — текущий профиль
 * @param consents  — все согласия кандидата (только своего candidateId)
 */
export function checkAdmission(
  candidate: Candidate,
  consents: Consent[]
): AdmissionCheckResult {
  const hasRequiredFields =
    !!candidate.fullName.trim() &&
    !!candidate.headline.trim() &&
    !!candidate.location.trim() &&
    !!candidate.summary.trim() &&
    candidate.skills.length > 0;

  const verifiedExperiences = (candidate.experience ?? []).filter(
    (exp: CandidateExperience) => exp.status === "verified"
  );
  const hasVerifiedExperience = verifiedExperiences.length >= 1;

  const activeConsents = new Set(
    consents
      .filter((c) => c.status === "active")
      .map((c) => c.type)
  );
  const hasVisibilityConsent = activeConsents.has("profile_visibility");
  const hasVerificationConsent = activeConsents.has("verification");

  const requirements: AdmissionRequirement[] = [
    {
      key: "profile_fields",
      label: "Базовые поля заполнены",
      met: hasRequiredFields,
      hint: "Имя, заголовок, локация, summary и хотя бы один навык.",
    },
    {
      key: "verified_experience",
      label: "Не менее 1 верифицированного опыта",
      met: hasVerifiedExperience,
      hint: "Карточка опыта должна иметь статус «подтверждено».",
    },
    {
      key: "consent_visibility",
      label: "Согласие на видимость профиля",
      met: hasVisibilityConsent,
      hint: "Активное согласие типа «Видимость профиля» в разделе Согласия.",
    },
    {
      key: "consent_verification",
      label: "Согласие на проверку",
      met: hasVerificationConsent,
      hint: "Активное согласие типа «Проверка опыта и навыков» в разделе Согласия.",
    },
  ];

  const admitted = requirements.every((r) => r.met);

  return { admitted, requirements };
}

export function isAdmitted(
  candidate: Candidate,
  consents: Consent[]
): boolean {
  return checkAdmission(candidate, consents).admitted;
}
