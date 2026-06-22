import { mockCompanies } from "@/data/mockCompanies";
import { mockCompanyTeam } from "@/data/mockCompanyTeam";
import { Company, CompanyStatus, ModerateCompanyInput } from "@/types/company";
import {
  CompanyTeamRole,
  CompanyTeamStatus,
  TeamMember,
} from "@/types/companyTeam";
import { getStoredArray, setStoredArray } from "./storage";

const COMPANIES_STORAGE_KEY = "wirehire-companies";
const TEAM_STORAGE_KEY = "wirehire-company-team";

export type ListCompaniesParams = {
  status?: CompanyStatus | "all";
  search?: string;
};

function bootstrappedCompanies(): Company[] {
  const saved = getStoredArray<Company>(COMPANIES_STORAGE_KEY);
  if (saved.length > 0) return saved;
  setStoredArray<Company>(COMPANIES_STORAGE_KEY, mockCompanies);
  return mockCompanies;
}

function bootstrappedTeam(): TeamMember[] {
  const saved = getStoredArray<TeamMember>(TEAM_STORAGE_KEY);
  if (saved.length > 0) return saved;
  setStoredArray<TeamMember>(TEAM_STORAGE_KEY, mockCompanyTeam);
  return mockCompanyTeam;
}

export async function getCompanies(
  params: ListCompaniesParams = {}
): Promise<Company[]> {
  const companies = bootstrappedCompanies();
  const search = params.search?.trim().toLowerCase() ?? "";
  return companies.filter((company) => {
    const matchesStatus =
      !params.status ||
      params.status === "all" ||
      company.status === params.status;
    const haystack = [
      company.name,
      company.brandName,
      company.legalForm,
      company.ownerName,
      company.ownerEmail,
      company.industry,
      company.website,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesStatus && matchesSearch;
  });
}

export async function getCompanyById(
  companyId: string
): Promise<Company | null> {
  const companies = bootstrappedCompanies();
  return companies.find((company) => company.id === companyId) ?? null;
}

export async function saveCompany(company: Company): Promise<Company> {
  const companies = bootstrappedCompanies();
  const next = companies.filter((item) => item.id !== company.id);
  setStoredArray<Company>(COMPANIES_STORAGE_KEY, [...next, company]);
  return company;
}

export async function moderateCompany(
  companyId: string,
  input: ModerateCompanyInput
): Promise<Company> {
  const companies = bootstrappedCompanies();
  const existing = companies.find((company) => company.id === companyId);
  if (!existing) {
    throw new Error("Компания не найдена");
  }
  const updated: Company = {
    ...existing,
    status: input.status,
    moderationNote: input.moderationNote ?? existing.moderationNote,
    rejectionReason:
      input.status === "suspended"
        ? input.rejectionReason ?? existing.rejectionReason
        : undefined,
    documentsRequestedAt: input.requestDocuments
      ? new Date().toISOString()
      : existing.documentsRequestedAt,
    moderatedAt: new Date().toISOString(),
  };
  return saveCompany(updated);
}

export async function getTeamForCompany(
  companyId: string
): Promise<TeamMember[]> {
  const team = bootstrappedTeam();
  return team.filter((member) => member.companyId === companyId);
}

export type InviteTeamMemberInput = {
  companyId: string;
  fullName: string;
  email: string;
  role: CompanyTeamRole;
};

export async function inviteTeamMember(
  input: InviteTeamMemberInput
): Promise<TeamMember> {
  const team = bootstrappedTeam();
  const newMember: TeamMember = {
    id: `tm-${Date.now()}`,
    companyId: input.companyId,
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    status: "invited",
    joinedAt: new Date().toLocaleDateString("ru-RU"),
  };
  setStoredArray<TeamMember>(TEAM_STORAGE_KEY, [...team, newMember]);
  return newMember;
}

export async function updateTeamMemberStatus(
  memberId: string,
  status: CompanyTeamStatus
): Promise<TeamMember | null> {
  const team = bootstrappedTeam();
  let updated: TeamMember | null = null;
  const next = team.map((member) => {
    if (member.id !== memberId) return member;
    updated = { ...member, status };
    return updated;
  });
  setStoredArray<TeamMember>(TEAM_STORAGE_KEY, next);
  return updated;
}
