import type { ProfileReport } from "@/types/profileReport";
import type { ReportSnapshot } from "@/types/reportSnapshot";

function activeWeightSum(report: ProfileReport): number {
  let sum = 0;
  if (report.profileSnapshot.experienceCount > 0) sum += report.weights.experience;
  if (report.profileSnapshot.skillsCount > 0) sum += report.weights.skills;
  if (report.referencesTotalCount > 0 && report.weights.references != null) {
    sum += report.weights.references;
  }
  if (report.profileSnapshot.hasProctoring) sum += report.weights.proctoring;
  return sum || 1;
}

export function profileReportToSnapshot(report: ProfileReport): ReportSnapshot {
  const weightSum = activeWeightSum(report);
  const weightedScore =
    report.weightedScore ??
    Math.round(
      ((report.profileSnapshot.experienceCount > 0
        ? report.experienceScore * report.weights.experience
        : 0) +
        (report.profileSnapshot.skillsCount > 0
          ? report.skillsScore * report.weights.skills
          : 0) +
        (report.referencesTotalCount > 0 && report.weights.references != null
          ? (report.referencesScore ?? 0) * report.weights.references
          : 0) +
        (report.profileSnapshot.hasProctoring
          ? (report.proctoringScore ?? 0) * report.weights.proctoring
          : 0)) /
        weightSum
    );

  return {
    id: report.id,
    verificationRunId: report.verificationRunId,
    reportType: "skills_only",
    version: report.version,
    generatedAt: report.generatedAt,
    overallStatus: report.overallStatus,
    effectiveOverallStatus: report.overallStatus,
    confidenceLevel: report.confidenceLevel,
    summary: report.summary,
    experienceScore: report.experienceScore,
    skillsScore: report.skillsScore,
    referencesScore: report.referencesScore ?? undefined,
    proctoringScore: report.proctoringScore ?? undefined,
    weightedScore,
    referencesPositiveCount: report.referencesPositiveCount,
    referencesTotalCount: report.referencesTotalCount,
    keyFindings: report.keyFindings,
    risks: report.risks,
    nextSteps: report.nextSteps,
    aiScreening: report.aiScreening,
    weightsSnapshot: {
      experience: report.weights.experience,
      skills: report.weights.skills,
      ...(report.weights.references != null
        ? { references: report.weights.references }
        : {}),
      proctoring: report.weights.proctoring,
    },
  };
}
