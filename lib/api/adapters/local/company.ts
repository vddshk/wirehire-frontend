import { Company } from "@/types/company";
import { getCompanies, saveCompany } from "./companies";
import { getCurrentUser } from "./session";
import type { UpdateMyCompanyInput } from "../remote/company";

async function getMyCompanyId(): Promise<Company | null> {
  const user = getCurrentUser();
  const companies = await getCompanies();
  return (
    (user.companyId
      ? companies.find((c) => c.id === user.companyId)
      : undefined) ??
    companies.find((c) => c.ownerUserId === user.id) ??
    companies.find((c) => c.name === user.companyName) ??
    null
  );
}

export async function getMyCompany(): Promise<Company> {
  const c = await getMyCompanyId();
  if (!c) throw new Error("Компания не найдена");
  return c;
}

export async function updateMyCompany(
  input: UpdateMyCompanyInput
): Promise<Company> {
  const current = await getMyCompany();
  const next: Company = {
    ...current,
    name: input.publicName ?? current.name,
    website: input.site ?? current.website,
    industry: input.industry ?? current.industry,
    description: input.about ?? current.description,
  };
  return await saveCompany(next);
}
