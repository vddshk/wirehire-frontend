import type {
  SkillVerification,
  SkillVerificationStatus,
} from "@/types/skillVerification";
import { apiClient } from "./client";

interface BackendSkillVerification {
  id: string;
  candidate_skill_id: string;
  verification_run_id?: string | null;
  status: SkillVerificationStatus;
  source_type?: "assessment" | "manual";
  score?: number | null;
  reason?: string | null;
  candidate_skill?: { label?: string | null } | null;
}

interface SkillVerificationPaginated {
  data: BackendSkillVerification[];
}

function mapSkillVerification(b: BackendSkillVerification): SkillVerification {
  return {
    id: b.id,
    candidateSkillId: b.candidate_skill_id,
    verificationRunId: b.verification_run_id ?? undefined,
    status: b.status,
    sourceType: b.source_type ?? "assessment",
    score: b.score ?? undefined,
    reason: b.reason ?? undefined,
    skillLabel: b.candidate_skill?.label ?? "",
  };
}

/** GET /me/verification-runs/{runId}/skill-verifications — кандидат. */
export async function getMySkillVerifications(
  runId: string
): Promise<SkillVerification[]> {
  const response = await apiClient<SkillVerificationPaginated>(
    `/me/verification-runs/${runId}/skill-verifications`,
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapSkillVerification);
}

/** GET /verification-runs/{runId}/skill-verifications — HR. */
export async function getSkillVerificationsForRun(
  runId: string
): Promise<SkillVerification[]> {
  const response = await apiClient<SkillVerificationPaginated>(
    `/verification-runs/${runId}/skill-verifications`,
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapSkillVerification);
}
