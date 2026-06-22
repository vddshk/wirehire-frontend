export type ReportOverallStatus =
  | "verified"
  | "partially_verified"
  | "questionable"
  | "insufficient_data";

export type ConfidenceLevel = "high" | "medium" | "low";

export type VerificationReport = {
  id: string;
  verificationRunId: string;
  candidateId: string;
  vacancyId: string;
  version: number;
  generatedAt: string;

  overallStatus: ReportOverallStatus;
  confidenceLevel: ConfidenceLevel;

  summary: string;
  keyFindings: string[];
  risks: string[];
  nextSteps: string[];

  experienceScore: number;
  skillsScore: number;
  proctoringScore: number | null;

  assessmentSummary?: string;
  assessmentQuestionsAnswered?: number;
  assessmentQuestionsTotal?: number;
  assessmentCaseSubmitted?: boolean;
  assessmentSubmittedAt?: string;

  proctoringEnabled?: boolean;
  proctoringAccepted?: boolean;

  // FR-053: manual override of the AI-derived status. Original overallStatus /
  // scores stay intact for auditability — UI shows both side-by-side.
  overrideStatus?: ReportOverallStatus;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
};