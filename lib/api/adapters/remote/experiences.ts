import {
  CandidateExperience,
  ExperienceStatus,
  ExperienceType,
} from "@/types/candidate";
import { apiClient } from "./client";

export interface BackendExperience {
  id: string;
  experience_type: ExperienceType;
  company_name?: string | null;
  project_name?: string | null;
  role_title?: string | null;
  institution_name?: string | null;
  speciality?: string | null;
  degree?: string | null;
  thesis_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  employment_type?: string | null;
  responsibilities?: string | null;
  skills?: string[];
  referrer_company_name?: string | null;
  referrer_contact?: {
    email?: string;
    phone?: string;
    person?: string;
  };
  verification_status?: string;
  verification_applicable?: boolean;
  title_label?: string;
  organization_label?: string;
}

interface ExperienceEnvelope {
  data: BackendExperience;
}

interface ExperiencePaginated {
  data: BackendExperience[];
}

function mapStatus(value?: string): ExperienceStatus {
  switch (value) {
    case "verified":
    case "confirmed":
      return "verified";
    case "partially_confirmed":
    case "partially_verified":
      return "partially_verified";
    case "awaiting_reference":
      return "awaiting_reference";
    case "questionable":
      return "questionable";
    case "not_applicable":
    case "not_checked":
    case "not_verified":
    default:
      return "not_checked";
  }
}

function formatPeriod(start?: string | null, end?: string | null): string {
  if (!start) return "";
  if (!end) return `${start} — по настоящее время`;
  return `${start} — ${end}`;
}

export function mapExperience(b: BackendExperience): CandidateExperience {
  const isEducation = b.experience_type === "education";
  return {
    id: b.id,
    type: b.experience_type,
    company:
      b.organization_label ??
      b.company_name ??
      b.project_name ??
      b.institution_name ??
      "",
    role: b.title_label ?? b.role_title ?? b.speciality ?? "",
    period: formatPeriod(b.start_date, b.end_date),
    employmentType: b.employment_type ?? (isEducation ? "Education" : "Full-time"),
    responsibilities: b.responsibilities ?? "",
    stack: b.skills ?? [],
    status: mapStatus(b.verification_status),
    referenceCompanyName: b.referrer_company_name ?? undefined,
    referenceContactName: b.referrer_contact?.person,
    referenceContactEmail: b.referrer_contact?.email,
    educationDetails: isEducation
      ? {
          institutionName: b.institution_name ?? "",
          speciality: b.speciality ?? "",
          degree: b.degree ?? undefined,
          thesisTitle: b.thesis_title ?? undefined,
        }
      : undefined,
    titleLabel: b.title_label,
    organizationLabel: b.organization_label,
    verificationApplicable: b.verification_applicable,
  };
}

export type ExperienceTypeFilter = ExperienceType | undefined;

export async function listMyExperiences(
  experienceType?: ExperienceTypeFilter
): Promise<CandidateExperience[]> {
  const params = experienceType ? `?experience_type=${experienceType}` : "";
  const response = await apiClient<ExperiencePaginated>(
    `/me/experiences${params}`,
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapExperience);
}

export type CreateExperienceInput = {
  experienceType: ExperienceType;
  companyName?: string;
  projectName?: string;
  roleTitle?: string;
  institutionName?: string;
  speciality?: string;
  degree?: string;
  thesisTitle?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  employmentType?: string;
  responsibilities?: string;
  skills?: string[];
  referrerCompanyName?: string;
  referrerContact?: { email?: string; phone?: string; person?: string };
};

function toBackendBody(input: CreateExperienceInput) {
  return {
    experience_type: input.experienceType,
    company_name: input.companyName,
    project_name: input.projectName,
    role_title: input.roleTitle,
    institution_name: input.institutionName,
    speciality: input.speciality,
    degree: input.degree,
    thesis_title: input.thesisTitle,
    start_date: input.startDate,
    end_date: input.endDate,
    employment_type: input.employmentType,
    responsibilities: input.responsibilities,
    skills: input.skills,
    referrer_company_name: input.referrerCompanyName,
    referrer_contact: input.referrerContact,
  };
}

export async function createMyExperience(
  input: CreateExperienceInput
): Promise<CandidateExperience> {
  const response = await apiClient<ExperienceEnvelope>(`/me/experiences`, {
    method: "POST",
    auth: "required",
    body: toBackendBody(input),
  });
  return mapExperience(response.data);
}

export async function getMyExperience(
  experienceId: string
): Promise<CandidateExperience> {
  const response = await apiClient<ExperienceEnvelope>(
    `/me/experiences/${experienceId}`,
    { method: "GET", auth: "required" }
  );
  return mapExperience(response.data);
}

export async function updateMyExperience(
  experienceId: string,
  input: Partial<CreateExperienceInput>
): Promise<CandidateExperience> {
  const response = await apiClient<ExperienceEnvelope>(
    `/me/experiences/${experienceId}`,
    {
      method: "PATCH",
      auth: "required",
      body: toBackendBody(input as CreateExperienceInput),
    }
  );
  return mapExperience(response.data);
}

export async function deleteMyExperience(experienceId: string): Promise<void> {
  await apiClient(`/me/experiences/${experienceId}`, {
    method: "DELETE",
    auth: "required",
  });
}
