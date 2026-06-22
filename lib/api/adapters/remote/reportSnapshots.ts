import type {
  AiCaseEvaluation,
  AiQuestionEvaluation,
  AiScreeningDetail,
  AiScreeningRecommendation,
  ReportConfidenceLevel,
  ReportOverallStatus,
  ReportSnapshot,
} from "@/types/reportSnapshot";
import { ApiError, apiClient } from "./client";

export type { ReportOverallStatus };

interface BackendAiQuestionEvaluation {
  question_id: string;
  skill: string;
  question_text: string;
  answer_excerpt?: string | null;
  score: number;
  rationale: string;
  attention_flags?: string[];
}

interface BackendAiScreening {
  provider?: string | null;
  model?: string | null;
  generated_at?: string | null;
  overall_rationale?: string | null;
  recommendation?: AiScreeningRecommendation | null;
  question_evaluations?: BackendAiQuestionEvaluation[];
  case_evaluation?: {
    score: number;
    rationale: string;
    attention_flags?: string[];
  } | null;
}

export interface BackendReportSnapshot {
  id: string;
  verification_run_id?: string | null;
  vacancy_id?: string | null;
  report_type: ReportSnapshot["reportType"];
  version: number;
  generated_at?: string | null;
  overall_status: ReportOverallStatus;
  effective_overall_status?: ReportOverallStatus;
  override_status?: ReportOverallStatus | null;
  override_reason?: string | null;
  overridden_at?: string | null;
  confidence_level?: ReportConfidenceLevel;
  summary?: string;
  experience_score?: number | null;
  skills_score?: number | null;
  proctoring_score?: number | null;
  weighted_score?: number | null;
  references_positive_count?: number;
  references_total_count?: number;
  key_findings?: string[];
  risks?: string[];
  next_steps?: string[];
  ai_screening?: BackendAiScreening | null;
}

function mapAiScreening(raw?: BackendAiScreening | null): AiScreeningDetail | undefined {
  if (!raw) return undefined;
  const questionEvaluations: AiQuestionEvaluation[] = (
    raw.question_evaluations ?? []
  ).map((item) => ({
    questionId: item.question_id,
    skill: item.skill,
    questionText: item.question_text,
    answerExcerpt: item.answer_excerpt ?? undefined,
    score: item.score,
    rationale: item.rationale,
    attentionFlags: item.attention_flags,
  }));

  const caseEvaluation: AiCaseEvaluation | undefined = raw.case_evaluation
    ? {
        score: raw.case_evaluation.score,
        rationale: raw.case_evaluation.rationale,
        attentionFlags: raw.case_evaluation.attention_flags,
      }
    : undefined;

  return {
    provider: raw.provider ?? undefined,
    model: raw.model ?? undefined,
    generatedAt: raw.generated_at ?? undefined,
    overallRationale: raw.overall_rationale ?? undefined,
    recommendation: raw.recommendation ?? undefined,
    questionEvaluations,
    caseEvaluation,
  };
}

interface ReportSnapshotEnvelope {
  data: BackendReportSnapshot;
}

export function mapReportSnapshot(b: BackendReportSnapshot): ReportSnapshot {
  return {
    id: b.id,
    verificationRunId: b.verification_run_id ?? undefined,
    vacancyId: b.vacancy_id ?? undefined,
    reportType: b.report_type,
    version: b.version,
    generatedAt: b.generated_at ?? undefined,
    overallStatus: b.overall_status,
    effectiveOverallStatus: b.effective_overall_status ?? b.overall_status,
    overrideStatus: b.override_status ?? undefined,
    overrideReason: b.override_reason ?? undefined,
    overriddenAt: b.overridden_at ?? undefined,
    confidenceLevel: b.confidence_level ?? "low",
    summary: b.summary ?? "",
    experienceScore: b.experience_score ?? undefined,
    skillsScore: b.skills_score ?? undefined,
    proctoringScore: b.proctoring_score ?? undefined,
    weightedScore: b.weighted_score ?? undefined,
    referencesPositiveCount: b.references_positive_count ?? 0,
    referencesTotalCount: b.references_total_count ?? 0,
    keyFindings: b.key_findings ?? [],
    risks: b.risks ?? [],
    nextSteps: b.next_steps ?? [],
    aiScreening: mapAiScreening(b.ai_screening),
  };
}

/** GET /me/verification-runs/{runId}/report-snapshot — последний отчет (кандидат). */
export async function getMyReportSnapshot(
  runId: string
): Promise<ReportSnapshot | null> {
  try {
    const response = await apiClient<ReportSnapshotEnvelope>(
      `/me/verification-runs/${runId}/report-snapshot`,
      { method: "GET", auth: "required" }
    );
    return mapReportSnapshot(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** GET /verification-runs/{runId}/report-snapshot — последний отчет (HR). */
export async function getReportSnapshotForRun(
  runId: string
): Promise<ReportSnapshot | null> {
  try {
    const response = await apiClient<ReportSnapshotEnvelope>(
      `/verification-runs/${runId}/report-snapshot`,
      { method: "GET", auth: "required" }
    );
    return mapReportSnapshot(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** POST /report-snapshots/{id}/override — HR переопределяет статус (FR-053). */
export async function overrideReportSnapshot(
  snapshotId: string,
  input: { status: ReportOverallStatus; reason: string }
): Promise<ReportSnapshot> {
  const response = await apiClient<ReportSnapshotEnvelope>(
    `/report-snapshots/${snapshotId}/override`,
    {
      method: "POST",
      auth: "required",
      body: { override_status: input.status, reason: input.reason },
    }
  );
  return mapReportSnapshot(response.data);
}

/** DELETE /report-snapshots/{id}/override — сбросить override. */
export async function clearReportSnapshotOverride(
  snapshotId: string
): Promise<ReportSnapshot> {
  const response = await apiClient<ReportSnapshotEnvelope>(
    `/report-snapshots/${snapshotId}/override`,
    { method: "DELETE", auth: "required" }
  );
  return mapReportSnapshot(response.data);
}
