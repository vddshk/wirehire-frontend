import { Company, CompanyStatus } from "@/types/company";
import { apiClient } from "./client";

interface BackendCompany {
  id: string;
  legal_name?: string | null;
  public_name: string;
  site?: string | null;
  industry?: string | null;
  about?: string | null;
  moderation_status: "pending" | "approved" | "rejected";
  created_at?: string | null;
  updated_at?: string | null;
}

interface BackendCompanyEnvelope {
  data: BackendCompany;
}

function mapStatus(value: string): CompanyStatus {
  if (value === "approved") return "active";
  if (value === "rejected") return "suspended";
  return "pending_moderation";
}

function mapCompany(b: BackendCompany): Company {
  return {
    id: b.id,
    name: b.public_name,
    website: b.site ?? undefined,
    industry: b.industry ?? undefined,
    description: b.about ?? undefined,
    status: mapStatus(b.moderation_status),
    createdAt: b.created_at ?? "",
  };
}

export async function getMyCompany(): Promise<Company> {
  const response = await apiClient<BackendCompanyEnvelope>("/me/company", {
    method: "GET",
    auth: "required",
  });
  return mapCompany(response.data);
}

export type UpdateMyCompanyInput = Partial<{
  legalName: string | null;
  publicName: string;
  site: string | null;
  industry: string | null;
  about: string | null;
}>;

function toBackendUpdate(input: UpdateMyCompanyInput) {
  const body: Record<string, unknown> = {};
  if (input.legalName !== undefined) body.legal_name = input.legalName;
  if (input.publicName !== undefined) body.public_name = input.publicName;
  if (input.site !== undefined) body.site = input.site;
  if (input.industry !== undefined) body.industry = input.industry;
  if (input.about !== undefined) body.about = input.about;
  return body;
}

export async function updateMyCompany(
  input: UpdateMyCompanyInput
): Promise<Company> {
  const response = await apiClient<BackendCompanyEnvelope>("/me/company", {
    method: "PATCH",
    auth: "required",
    body: toBackendUpdate(input),
  });
  return mapCompany(response.data);
}
