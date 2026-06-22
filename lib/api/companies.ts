import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/companies";
import * as remote from "./adapters/remote/companies";
import type { Company, ModerateCompanyInput } from "@/types/company";

export type ListCompaniesParams = local.ListCompaniesParams;
export type InviteTeamMemberInput = local.InviteTeamMemberInput;

export async function getCompanies(
  params?: ListCompaniesParams
): Promise<Company[]> {
  return USE_REMOTE_API
    ? remote.getCompanies(params)
    : local.getCompanies(params);
}

export async function getCompanyById(
  companyId: string
): Promise<Company | null> {
  return USE_REMOTE_API
    ? remote.getCompanyById(companyId)
    : local.getCompanyById(companyId);
}

export async function saveCompany(company: Company): Promise<Company> {
  return local.saveCompany(company);
}

export async function moderateCompany(
  companyId: string,
  input: ModerateCompanyInput
): Promise<Company> {
  return USE_REMOTE_API
    ? remote.moderateCompany(companyId, input)
    : local.moderateCompany(companyId, input);
}

export async function getTeamForCompany(companyId: string) {
  return local.getTeamForCompany(companyId);
}

export async function inviteTeamMember(input: InviteTeamMemberInput) {
  return local.inviteTeamMember(input);
}

export async function updateTeamMemberStatus(
  memberId: string,
  status: Parameters<typeof local.updateTeamMemberStatus>[1]
) {
  return local.updateTeamMemberStatus(memberId, status);
}
