import {
  AdminCandidateDetail,
  AdminCandidateListItem,
  AdminExperienceItem,
  AdminReferenceRequestItem,
  ReferenceVerdict,
} from "@/types/adminCandidate";
import { apiClient } from "./client";

interface BackendCandidate {
  id: string;
  user_id: string;
  full_name?: string | null;
  headline?: string | null;
  email?: string | null;
  status: string;
  visibility_mode?: string | null;
  pending_references_count?: number;
  experiences_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

interface BackendExperience {
  id: string;
  experience_type?: string | null;
  company_name?: string | null;
  project_name?: string | null;
  role_title?: string | null;
  verification_status: string;
  referrer_email?: string | null;
  referrer_name?: string | null;
}

interface BackendReferenceRequest {
  id: string;
  status: string;
  db_status: string;
  recipient_email: string;
  experience_id: string;
  experience_title?: string | null;
  company_name?: string | null;
  created_at?: string | null;
  answered_at?: string | null;
  verdict?: string | null;
  can_confirm: boolean;
}

interface BackendCandidateDetail extends BackendCandidate {
  experiences?: BackendExperience[];
  reference_requests?: BackendReferenceRequest[];
  can_admit?: boolean;
}

interface BackendList {
  data: BackendCandidate[];
}

interface BackendDetailEnvelope {
  data: BackendCandidateDetail;
}

interface BackendCandidateEnvelope {
  data: BackendCandidate;
}

interface BackendReferenceEnvelope {
  data: BackendReferenceRequest;
}

function mapListItem(item: BackendCandidate): AdminCandidateListItem {
  return {
    id: item.id,
    userId: item.user_id,
    fullName: item.full_name?.trim() || item.email?.split("@")[0] || "—",
    email: item.email ?? "",
    status: item.status,
    headline: item.headline ?? undefined,
    visibilityMode: item.visibility_mode ?? undefined,
    pendingReferencesCount: item.pending_references_count ?? 0,
    experiencesCount: item.experiences_count ?? 0,
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

function mapExperience(item: BackendExperience): AdminExperienceItem {
  return {
    id: item.id,
    experienceType: item.experience_type ?? undefined,
    companyName: item.company_name ?? undefined,
    projectName: item.project_name ?? undefined,
    roleTitle: item.role_title ?? undefined,
    verificationStatus: item.verification_status,
    referrerEmail: item.referrer_email ?? undefined,
    referrerName: item.referrer_name ?? undefined,
  };
}

function mapReferenceRequest(item: BackendReferenceRequest): AdminReferenceRequestItem {
  return {
    id: item.id,
    status: item.status,
    dbStatus: item.db_status,
    recipientEmail: item.recipient_email,
    experienceId: item.experience_id,
    experienceTitle: item.experience_title ?? undefined,
    companyName: item.company_name ?? undefined,
    createdAt: item.created_at ?? undefined,
    answeredAt: item.answered_at ?? undefined,
    verdict: item.verdict ?? undefined,
    canConfirm: item.can_confirm,
  };
}

function mapDetail(item: BackendCandidateDetail): AdminCandidateDetail {
  return {
    ...mapListItem(item),
    experiences: (item.experiences ?? []).map(mapExperience),
    referenceRequests: (item.reference_requests ?? []).map(mapReferenceRequest),
    canAdmit: item.can_admit ?? item.status !== "admitted_to_talent_pool",
  };
}

export type ListAdminCandidatesParams = {
  status?: string;
  search?: string;
};

export async function getAdminCandidates(
  params: ListAdminCandidatesParams = {}
): Promise<AdminCandidateListItem[]> {
  const query = new URLSearchParams({ per_page: "100" });
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  const response = await apiClient<BackendList>(
    `/admin/candidates?${query.toString()}`,
    { method: "GET", auth: "required" }
  );

  return response.data.map(mapListItem);
}

export async function getAdminCandidateById(
  candidateId: string
): Promise<AdminCandidateDetail | null> {
  try {
    const response = await apiClient<BackendDetailEnvelope>(
      `/admin/candidates/${candidateId}`,
      { method: "GET", auth: "required" }
    );
    return mapDetail(response.data);
  } catch {
    return null;
  }
}

export async function adminAdmitCandidate(
  candidateId: string
): Promise<AdminCandidateListItem> {
  const response = await apiClient<BackendCandidateEnvelope>(
    `/admin/candidates/${candidateId}/admit`,
    { method: "POST", auth: "required" }
  );
  return mapListItem(response.data);
}

export async function adminConfirmReference(
  requestId: string,
  verdict: ReferenceVerdict,
  note?: string
): Promise<AdminReferenceRequestItem> {
  const response = await apiClient<BackendReferenceEnvelope>(
    `/admin/reference-requests/${requestId}/confirm`,
    {
      method: "POST",
      auth: "required",
      body: {
        verdict,
        note: note?.trim() || undefined,
      },
    }
  );
  return mapReferenceRequest(response.data);
}
