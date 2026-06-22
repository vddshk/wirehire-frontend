import { CandidateDashboard } from "@/types/dashboard";
import { getCandidateById } from "./candidates";
import { getApplicationsByCandidateId } from "./applications";
import { getCurrentUser } from "./session";

export async function getCandidateDashboard(): Promise<CandidateDashboard> {
  const user = getCurrentUser();
  const candidateId = user.candidateId ?? `candidate-${user.id}`;
  const [candidate, applications] = await Promise.all([
    getCandidateById(candidateId),
    getApplicationsByCandidateId(candidateId),
  ]);

  const profileChecks: Record<string, boolean> = {
    full_name: Boolean(candidate?.fullName),
    location: Boolean(candidate?.location),
    headline: Boolean(candidate?.headline),
    summary: Boolean(candidate?.summary),
    resume: Boolean(candidate?.resume),
  };

  const filledCount = Object.values(profileChecks).filter(Boolean).length;
  const profileCompletionPercent = Math.round(
    (filledCount / Object.keys(profileChecks).length) * 100
  );

  const activeApplicationsCount = applications.filter(
    (application) => application.status !== "withdrawn"
  ).length;

  return {
    candidateStatus: candidate?.profileStatus ?? "draft",
    profileCompletionPercent,
    profileChecks,
    applicationsCount: activeApplicationsCount,
    experiencesCount: candidate?.experience.length ?? 0,
  };
}
