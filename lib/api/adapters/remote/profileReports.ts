import type { ProfileReportFetchResult } from "@/types/profileReportFetch";
import type { ProfileReport } from "@/types/profileReport";
import { ApiError, apiClient } from "./client";
import { mapReportSnapshot, type BackendReportSnapshot } from "./reportSnapshots";

function mapProfileReport(b: BackendReportSnapshot & { candidate_id?: string }): ProfileReport {
  const snapshot = mapReportSnapshot(b);
  const weights = (b as { weights_snapshot?: Record<string, number> }).weights_snapshot;

  return {
    id: snapshot.id,
    candidateId: b.candidate_id ?? "",
    version: snapshot.version,
    generatedAt: snapshot.generatedAt ?? "",
    weights: {
      experience: weights?.experience ?? 0.5,
      skills: weights?.skills ?? 0.35,
      proctoring: weights?.proctoring ?? 0.15,
      references: weights?.references,
    },
    weightedScore: snapshot.weightedScore,
    verificationRunId: snapshot.verificationRunId,
    aiScreening: snapshot.aiScreening,
    overallStatus: snapshot.effectiveOverallStatus,
    confidenceLevel: snapshot.confidenceLevel,
    experienceScore: snapshot.experienceScore ?? 0,
    skillsScore: snapshot.skillsScore ?? 0,
    referencesScore:
      snapshot.referencesTotalCount > 0
        ? snapshot.referencesPositiveCount > 0
          ? Math.round(
              (snapshot.referencesPositiveCount /
                Math.max(1, snapshot.referencesTotalCount)) *
                100
            )
          : 0
        : null,
    proctoringScore: snapshot.proctoringScore ?? null,
    referencesPositiveCount: snapshot.referencesPositiveCount,
    referencesTotalCount: snapshot.referencesTotalCount,
    summary: snapshot.summary,
    keyFindings: snapshot.keyFindings,
    risks: snapshot.risks,
    nextSteps: snapshot.nextSteps,
    profileSnapshot: {
      experienceCount: 0,
      skillsCount: 0,
      hasProctoring: snapshot.proctoringScore != null,
    },
  };
}

interface ProfileReportErrorBody {
  message?: string;
  data?: {
    missing_blocks?: string[];
    candidate_status?: string;
  };
}

export async function fetchProfileReportForCandidate(
  candidateId: string
): Promise<ProfileReportFetchResult> {
  try {
    const response = await apiClient<{ data: BackendReportSnapshot & { candidate_id?: string } }>(
      `/candidates/${candidateId}/profile-report`,
      { method: "GET", auth: "required" }
    );
    return { report: mapProfileReport(response.data) };
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }

    const body = err.body as ProfileReportErrorBody | undefined;

    if (err.status === 403) {
      return {
        report: null,
        accessDenied: true,
        accessDeniedMessage:
          body?.message ??
          "Отчет профиля недоступен: профиль скрыт или нет согласия на видимость.",
      };
    }

    if (err.status === 404) {
      return {
        report: null,
        missingBlocks: body?.data?.missing_blocks,
        candidateStatus: body?.data?.candidate_status,
      };
    }

    throw err;
  }
}

export async function getProfileReportByCandidateId(
  candidateId: string
): Promise<ProfileReport | null> {
  const result = await fetchProfileReportForCandidate(candidateId);
  return result.report;
}
