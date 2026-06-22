import { CandidateExperience, ExperienceType } from "@/types/candidate";
import { getCurrentUser } from "./session";
import { getCandidateById, updateCandidate } from "./candidates";

/**
 * Локальный CRUD опыта поверх Candidate.experience.
 * Когда подключим бэк, фасад в lib/api/experiences.ts переключится на remote.
 */

export type CreateExperienceInput = {
  experienceType: ExperienceType;
  companyName?: string;
  projectName?: string;
  roleTitle?: string;
  institutionName?: string;
  speciality?: string;
  degree?: string;
  thesisTitle?: string;
  startDate: string;
  endDate?: string;
  employmentType?: string;
  responsibilities?: string;
  skills?: string[];
  referrerCompanyName?: string;
  referrerContact?: { email?: string; phone?: string; person?: string };
};

async function getMyCandidate() {
  const user = getCurrentUser();
  const candidateId = user.candidateId ?? `candidate-${user.id}`;
  const candidate = await getCandidateById(candidateId);
  if (!candidate) throw new Error("Кандидат не найден");
  return candidate;
}

function inputToExperience(
  id: string,
  input: CreateExperienceInput
): CandidateExperience {
  const isEducation = input.experienceType === "education";
  return {
    id,
    type: input.experienceType,
    company:
      input.companyName ?? input.projectName ?? input.institutionName ?? "",
    role: input.roleTitle ?? input.speciality ?? "",
    period: input.endDate
      ? `${input.startDate} — ${input.endDate}`
      : `${input.startDate} — по настоящее время`,
    employmentType:
      input.employmentType ?? (isEducation ? "Education" : "Full-time"),
    responsibilities: input.responsibilities ?? "",
    stack: input.skills ?? [],
    status: isEducation ? "not_checked" : "not_checked",
    referenceCompanyName: input.referrerCompanyName,
    referenceContactName: input.referrerContact?.person,
    referenceContactEmail: input.referrerContact?.email,
    educationDetails: isEducation
      ? {
          institutionName: input.institutionName ?? "",
          speciality: input.speciality ?? "",
          degree: input.degree,
          thesisTitle: input.thesisTitle,
        }
      : undefined,
    verificationApplicable: !isEducation,
  };
}

export async function listMyExperiences(
  experienceType?: ExperienceType
): Promise<CandidateExperience[]> {
  const candidate = await getMyCandidate();
  const all = candidate.experience;
  return experienceType ? all.filter((e) => e.type === experienceType) : all;
}

export async function createMyExperience(
  input: CreateExperienceInput
): Promise<CandidateExperience> {
  const candidate = await getMyCandidate();
  const newExperience = inputToExperience(`exp-${Date.now()}`, input);
  const updated = await updateCandidate({
    ...candidate,
    experience: [...candidate.experience, newExperience],
  });
  return (
    updated.experience.find((e) => e.id === newExperience.id) ?? newExperience
  );
}

export async function getMyExperience(
  experienceId: string
): Promise<CandidateExperience> {
  const candidate = await getMyCandidate();
  const found = candidate.experience.find((e) => e.id === experienceId);
  if (!found) throw new Error("Карточка опыта не найдена");
  return found;
}

export async function updateMyExperience(
  experienceId: string,
  input: Partial<CreateExperienceInput>
): Promise<CandidateExperience> {
  const candidate = await getMyCandidate();
  const existing = candidate.experience.find((e) => e.id === experienceId);
  if (!existing) throw new Error("Карточка опыта не найдена");
  const merged: CreateExperienceInput = {
    experienceType:
      input.experienceType ?? (existing.type ?? "work"),
    companyName: input.companyName ?? existing.company,
    roleTitle: input.roleTitle ?? existing.role,
    startDate:
      input.startDate ?? existing.period.split(" — ")[0] ?? "",
    endDate: input.endDate,
    employmentType: input.employmentType ?? existing.employmentType,
    responsibilities: input.responsibilities ?? existing.responsibilities,
    skills: input.skills ?? existing.stack,
    referrerCompanyName:
      input.referrerCompanyName ?? existing.referenceCompanyName,
    referrerContact: input.referrerContact ?? {
      person: existing.referenceContactName,
      email: existing.referenceContactEmail,
    },
    institutionName:
      input.institutionName ?? existing.educationDetails?.institutionName,
    speciality: input.speciality ?? existing.educationDetails?.speciality,
    degree: input.degree ?? existing.educationDetails?.degree,
    thesisTitle: input.thesisTitle ?? existing.educationDetails?.thesisTitle,
  };
  const next = inputToExperience(experienceId, merged);
  await updateCandidate({
    ...candidate,
    experience: candidate.experience.map((e) =>
      e.id === experienceId ? next : e
    ),
  });
  return next;
}

export async function deleteMyExperience(experienceId: string): Promise<void> {
  const candidate = await getMyCandidate();
  await updateCandidate({
    ...candidate,
    experience: candidate.experience.filter((e) => e.id !== experienceId),
  });
}
