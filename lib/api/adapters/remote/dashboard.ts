import { CandidateDashboard } from "@/types/dashboard";
import { apiClient } from "./client";

interface BackendDashboard {
  data: {
    candidate_status?: string;
    profile_completion_percent?: number;
    profile_checks?: Record<string, boolean>;
    applications_count?: number;
    experiences_count?: number;
  };
}

export async function getCandidateDashboard(): Promise<CandidateDashboard> {
  const response = await apiClient<BackendDashboard>("/me/dashboard", {
    method: "GET",
    auth: "required",
  });
  return {
    candidateStatus: response.data.candidate_status ?? "draft",
    profileCompletionPercent: response.data.profile_completion_percent ?? 0,
    profileChecks: response.data.profile_checks ?? {},
    applicationsCount: response.data.applications_count ?? 0,
    experiencesCount: response.data.experiences_count ?? 0,
  };
}
