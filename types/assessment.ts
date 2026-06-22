import type { ProctoringViolationCounts } from "./proctoring";

export type AssessmentSubmissionStatus = "draft" | "submitted";

export type AssessmentAnswer = {
  questionId: string;
  question: string;
  answer: string;
};

// FR-046: per-category auto-score recorded after submission.
export type AssessmentLevel = "intermediate" | "advanced" | "expert";

export type AssessmentCategoryScore = {
  skill: string;
  score: number;
  level: AssessmentLevel;
};

// FR-049: proctoring mode chosen by candidate on intro.
export type AssessmentProctoringMode = "enabled" | "disabled";

export type AssessmentSubmission = {
  id: string;
  candidateId: string;
  status: AssessmentSubmissionStatus;
  testAnswers: AssessmentAnswer[];
  caseAnswer: string;
  proctoringAccepted: boolean;
  submittedAt: string;

  // FR-042: new model — submission is bound to a profile-level package.
  assessmentPackageId?: string;
  // FR-046: auto-score recorded after submission.
  scoreOverall?: number;
  scoreByCategory?: AssessmentCategoryScore[];
  proctoringMode?: AssessmentProctoringMode;

  // FR-050 / ТЗ 15a: proctoring metrics (anti-fraud events + risk + score).
  proctoringViolations?: number;
  proctoringViolationBreakdown?: ProctoringViolationCounts;
  proctoringRiskLevel?: "low" | "medium" | "high" | "review";
  proctoringScore?: number;
  rawSkillsScore?: number;

  // Legacy bindings — kept optional for back-compat with vacancy-bound tasks.
  verificationRunId?: string;
  vacancyId?: string;
};

// FR-042/043: package lifecycle on the candidate profile.
// Legacy values `draft|assigned` kept for back-compat with stored data.
export type AssessmentPackageStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "draft"
  | "assigned";

export type AssessmentPackageQuestion = {
  id: string;
  skill: string;
  text: string;
  isEnabled: boolean;
};

export type AssessmentPackage = {
  id: string;
  candidateId: string;

  status: AssessmentPackageStatus;

  title: string;
  instructions: string;
  durationMinutes: number;

  questions: AssessmentPackageQuestion[];

  caseTitle: string;
  caseText: string;
  evaluationRubric: string;

  proctoringEnabled: boolean;

  assignedAt?: string;
  createdAt: string;
  updatedAt: string;

  // FR-044: rubric explanation shown to the candidate on the intro stage.
  rubricExplanation?: string;
  // FR-042: package bound to the candidate profile, not a vacancy.
  verificationRunId?: string;
  vacancyId?: string;
};