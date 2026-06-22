import { Candidate, VisibilityMode, WorkFormat } from "@/types/candidate";
import { apiClient } from "./client";

interface BackendCandidateProfile {
  id: string;
  full_name?: string | null;
  headline?: string | null;
  desired_role?: string | null;
  summary?: string | null;
  location?: string | null;
  work_format?: WorkFormat | null;
  contacts?: { email?: string; phone?: string } | null;
  visibility_mode?: "private" | "public_limited" | "public";
  resume_file_id?: string | null;
}

interface BackendProfileEnvelope {
  data: {
    candidate_id: string;
    user_id: string;
    status: string;
    profile?: BackendCandidateProfile | null;
  };
}

function mapVisibility(value?: string): VisibilityMode {
  if (value === "private") return "hidden";
  if (value === "public_limited") return "restricted";
  return "public";
}

function mapWorkFormat(value?: string | null): WorkFormat {
  if (value === "remote" || value === "hybrid" || value === "office") return value;
  return "remote";
}

function mapProfile(envelope: BackendProfileEnvelope): Candidate {
  const data = envelope.data;
  const profile = data.profile;
  return {
    id: data.candidate_id,
    fullName: profile?.full_name ?? "",
    headline: profile?.headline ?? "",
    desiredRole: profile?.desired_role ?? undefined,
    location: profile?.location ?? "",
    workFormat: mapWorkFormat(profile?.work_format),
    verificationStatus: "not_verified",
    skills: [],
    summary: profile?.summary ?? "",
    experience: [],
    email: profile?.contacts?.email,
    phone: profile?.contacts?.phone,
    visibilityMode: mapVisibility(profile?.visibility_mode),
    profileStatus:
      data.status === "admitted_to_talent_pool"
        ? "admitted"
        : data.status === "awaiting_verification_threshold"
          ? "pending_threshold"
          : data.status === "published"
            ? "active"
            : "draft",
  };
}

export async function getMyProfile(): Promise<Candidate> {
  const response = await apiClient<BackendProfileEnvelope>("/me/profile", {
    method: "GET",
    auth: "required",
  });
  return mapProfile(response);
}

export type UpdateMyProfileInput = Partial<{
  fullName: string;
  headline: string;
  desiredRole: string;
  summary: string;
  location: string;
  workFormat: WorkFormat;
  contacts: { email?: string; phone?: string };
  visibilityMode: VisibilityMode;
}>;

function toBackendUpdate(input: UpdateMyProfileInput) {
  const body: Record<string, unknown> = {};
  if (input.fullName !== undefined) body.full_name = input.fullName;
  if (input.headline !== undefined) body.headline = input.headline;
  if (input.desiredRole !== undefined) body.desired_role = input.desiredRole;
  if (input.summary !== undefined) body.summary = input.summary;
  if (input.location !== undefined) body.location = input.location;
  if (input.workFormat !== undefined) body.work_format = input.workFormat;
  if (input.contacts !== undefined) body.contacts = input.contacts;
  if (input.visibilityMode !== undefined) {
    body.visibility_mode =
      input.visibilityMode === "hidden"
        ? "private"
        : input.visibilityMode === "restricted"
          ? "public_limited"
          : "public";
  }
  return body;
}

export async function updateMyProfile(
  input: UpdateMyProfileInput
): Promise<Candidate> {
  const response = await apiClient<BackendProfileEnvelope>("/me/profile", {
    method: "PATCH",
    auth: "required",
    body: toBackendUpdate(input),
  });
  return mapProfile(response);
}
