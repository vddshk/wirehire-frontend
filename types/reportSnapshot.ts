// Сводный отчет по verification-run (report_snapshots, коммит f8caa20).
export type ReportOverallStatus =
  | "verified"
  | "partially_verified"
  | "questionable"
  | "insufficient_data";

export type ReportConfidenceLevel = "high" | "medium" | "low";

export type AiScreeningRecommendation = "hire" | "hold" | "reject";

export type AiQuestionEvaluation = {
  questionId: string;
  skill: string;
  questionText: string;
  answerExcerpt?: string;
  score: number;
  rationale: string;
  attentionFlags?: string[];
};

export type AiCaseEvaluation = {
  score: number;
  rationale: string;
  attentionFlags?: string[];
};

export type AiScreeningDetail = {
  provider?: string;
  model?: string;
  generatedAt?: string;
  overallRationale?: string;
  recommendation?: AiScreeningRecommendation;
  questionEvaluations: AiQuestionEvaluation[];
  caseEvaluation?: AiCaseEvaluation;
};

export type ReportSnapshot = {
  id: string;
  verificationRunId?: string;
  vacancyId?: string;
  reportType: "trust_only" | "skills_only" | "full";
  version: number;
  generatedAt?: string;

  // Исходный AI-статус и эффективный (с учетом override) — для UI берем effective.
  overallStatus: ReportOverallStatus;
  effectiveOverallStatus: ReportOverallStatus;
  overrideStatus?: ReportOverallStatus;
  overrideReason?: string;
  overriddenAt?: string;

  confidenceLevel: ReportConfidenceLevel;
  summary: string;

  experienceScore?: number;
  skillsScore?: number;
  proctoringScore?: number;
  weightedScore?: number;

  referencesPositiveCount: number;
  referencesTotalCount: number;

  keyFindings: string[];
  risks: string[];
  nextSteps: string[];

  /** Детализация AI-скрининга — вопросы, баллы, обоснования. */
  aiScreening?: AiScreeningDetail;

  /** Активные веса блоков на момент расчета (ТЗ §15а). */
  weightsSnapshot?: {
    experience: number;
    skills: number;
    /** До миграции бэка на ТЗ §A.13 (3 блока) может отсутствовать. */
    references?: number;
    proctoring: number;
  };

  referencesScore?: number;
};
