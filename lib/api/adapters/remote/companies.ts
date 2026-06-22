import { Company, CompanyStatus, ModerateCompanyInput } from "@/types/company";
import {
  isCompanyLegalForm,
  type CompanyLegalForm,
} from "@/lib/utils/companyLegalForm";
import { apiClient } from "./client";

interface BackendCompany {
  id: string;
  legal_name?: string | null;
  legal_form?: string | null;
  brand_name?: string | null;
  public_name: string;
  site?: string | null;
  industry?: string | null;
  about?: string | null;
  moderation_status: "pending" | "approved" | "rejected";
  owner_name?: string | null;
  owner_email?: string | null;
  moderation_note?: string | null;
  rejection_reason?: string | null;
  documents_requested_at?: string | null;
  moderated_at?: string | null;
  created_at?: string | null;
}

interface BackendCompanyList {
  data: BackendCompany[];
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
  const legalForm = b.legal_form && isCompanyLegalForm(b.legal_form)
    ? b.legal_form
    : undefined;

  return {
    id: b.id,
    name: b.public_name,
    brandName: b.brand_name ?? undefined,
    legalForm,
    legalName: b.legal_name ?? undefined,
    website: b.site ?? undefined,
    industry: b.industry ?? undefined,
    description: b.about ?? undefined,
    status: mapStatus(b.moderation_status),
    ownerName: b.owner_name ?? undefined,
    ownerEmail: b.owner_email ?? undefined,
    moderationNote: b.moderation_note ?? undefined,
    rejectionReason: b.rejection_reason ?? undefined,
    documentsRequestedAt: b.documents_requested_at ?? undefined,
    moderatedAt: b.moderated_at ?? undefined,
    createdAt: b.created_at ?? "",
  };
}

export type ListCompaniesParams = {
  status?: CompanyStatus | "all";
  search?: string;
};

function toBackendStatus(status: CompanyStatus): string {
  if (status === "active") return "approved";
  if (status === "suspended") return "rejected";
  return "pending";
}

export async function getCompanies(
  params: ListCompaniesParams = {}
): Promise<Company[]> {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") {
    query.set("moderation_status", toBackendStatus(params.status));
  }
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const response = await apiClient<BackendCompanyList>(
    `/admin/companies${suffix}`,
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapCompany);
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  try {
    const response = await apiClient<BackendCompanyEnvelope>(
      `/admin/companies/${companyId}`,
      { method: "GET", auth: "required" }
    );
    return mapCompany(response.data);
  } catch {
    return null;
  }
}

export async function moderateCompany(
  companyId: string,
  input: ModerateCompanyInput
): Promise<Company> {
  const response = await apiClient<BackendCompanyEnvelope>(
    `/admin/companies/${companyId}/moderation`,
    {
      method: "PATCH",
      auth: "required",
      body: {
        moderation_status: toBackendStatus(input.status),
        moderation_note: input.moderationNote ?? null,
        rejection_reason: input.rejectionReason ?? null,
        request_documents: input.requestDocuments ?? false,
      },
    }
  );
  return mapCompany(response.data);
}
