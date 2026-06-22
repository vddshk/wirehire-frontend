// Backend-модель assessment, привязанного к verification-run (коммит 5ae9b0d).
// Отдельно от мокового types/assessment.ts (AssessmentPackage/Submission).

export type AssessmentQuestion = {
  id: string;
  skill: string;
  text: string;
  isEnabled: boolean;
};

export type AssessmentTest = {
  id: string;
  title: string;
  instructions: string;
  coverageExplanation?: string;
  durationMinutes: number;
  attemptsLimit: number;
  status: string;
  proctoringEnabled?: boolean;
  questions: AssessmentQuestion[];
};

export type AssessmentCase = {
  id: string;
  title: string;
  prompt: string;
  criteria: string[];
  submissionType: string;
};

export type TestResultStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "graded";

export type SkillBreakdownItem = {
  skill: string;
  score: number;
  level: string;
};

export type TestResult = {
  id: string;
  testId: string;
  status: TestResultStatus;
  startedAt?: string;
  submittedAt?: string;
  score?: number;
  skillBreakdown?: SkillBreakdownItem[];
};

// Полный пакет с экрана прохождения: тест + кейс + текущий результат.
export type RunAssessment = {
  verificationRunId: string;
  runType: string;
  status: string;
  test: AssessmentTest | null;
  case: AssessmentCase | null;
  result: TestResult | null;
};
