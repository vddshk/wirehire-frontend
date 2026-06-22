import type {
  AssessmentCase,
  AssessmentQuestion,
  AssessmentTest,
  RunAssessment,
  SkillBreakdownItem,
  TestResult,
  TestResultStatus,
} from "@/types/runAssessment";
import { ApiError, apiClient } from "./client";

interface BackendQuestion {
  id: string;
  skill?: string;
  text?: string;
  is_enabled?: boolean;
}

interface BackendTest {
  id: string;
  title?: string;
  instructions?: string;
  coverage_explanation?: string;
  duration_minutes?: number;
  attempts_limit?: number;
  status?: string;
  proctoring_enabled?: boolean;
  questions?: BackendQuestion[];
}

interface BackendCase {
  id: string;
  title?: string;
  prompt?: string;
  rubric?: { title?: string; criteria?: string[] } | null;
  submission_type?: string;
}

interface BackendTestResult {
  id: string;
  test_id: string;
  status: TestResultStatus;
  started_at?: string | null;
  submitted_at?: string | null;
  score?: number | null;
  skill_breakdown?: Array<{ skill?: string; score?: number; level?: string }>;
}

interface BackendRunAssessment {
  verification_run_id: string;
  run_type?: string;
  status?: string;
  test?: BackendTest | null;
  case?: BackendCase | null;
}

interface RunAssessmentResponse {
  data: BackendRunAssessment;
  result?: BackendTestResult | null;
}

interface TestResultEnvelope {
  data: BackendTestResult;
  skill_verifications?: unknown[];
}

function mapQuestion(q: BackendQuestion): AssessmentQuestion {
  return {
    id: q.id,
    skill: q.skill ?? "",
    text: q.text ?? "",
    isEnabled: q.is_enabled !== false,
  };
}

function mapTest(t: BackendTest): AssessmentTest {
  return {
    id: t.id,
    title: t.title ?? "Assessment",
    instructions: t.instructions ?? "",
    coverageExplanation: t.coverage_explanation,
    durationMinutes: t.duration_minutes ?? 0,
    attemptsLimit: t.attempts_limit ?? 1,
    status: t.status ?? "assigned",
    proctoringEnabled: t.proctoring_enabled === true,
    questions: (t.questions ?? []).map(mapQuestion),
  };
}

function mapCase(c: BackendCase): AssessmentCase {
  return {
    id: c.id,
    title: c.title ?? c.rubric?.title ?? "Практический кейс",
    prompt: c.prompt ?? "",
    criteria: c.rubric?.criteria ?? [],
    submissionType: c.submission_type ?? "text",
  };
}

function mapSkillBreakdown(
  raw?: BackendTestResult["skill_breakdown"]
): SkillBreakdownItem[] | undefined {
  if (!raw) return undefined;
  return raw.map((s) => ({
    skill: s.skill ?? "",
    score: s.score ?? 0,
    level: s.level ?? "",
  }));
}

function mapResult(r: BackendTestResult): TestResult {
  return {
    id: r.id,
    testId: r.test_id,
    status: r.status,
    startedAt: r.started_at ?? undefined,
    submittedAt: r.submitted_at ?? undefined,
    score: r.score ?? undefined,
    skillBreakdown: mapSkillBreakdown(r.skill_breakdown),
  };
}

/** GET /me/assessment — profile-level пакет (авто после опыт + навыки). */
export async function getMyProfileAssessment(): Promise<RunAssessment | null> {
  try {
    const response = await apiClient<RunAssessmentResponse>("/me/assessment", {
      method: "GET",
      auth: "required",
    });
    const d = response.data;
    return {
      verificationRunId: d.verification_run_id,
      runType: d.run_type ?? "",
      status: d.status ?? "",
      test: d.test ? mapTest(d.test) : null,
      case: d.case ? mapCase(d.case) : null,
      result: response.result ? mapResult(response.result) : null,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** GET /me/verification-runs/{runId}/assessment — тест + кейс + текущий результат. */
export async function getMyRunAssessment(
  runId: string
): Promise<RunAssessment | null> {
  try {
    const response = await apiClient<RunAssessmentResponse>(
      `/me/verification-runs/${runId}/assessment`,
      { method: "GET", auth: "required" }
    );
    const d = response.data;
    return {
      verificationRunId: d.verification_run_id,
      runType: d.run_type ?? "",
      status: d.status ?? "",
      test: d.test ? mapTest(d.test) : null,
      case: d.case ? mapCase(d.case) : null,
      result: response.result ? mapResult(response.result) : null,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** POST /me/tests/{testId}/start — начать прохождение (assigned → in_progress). */
export async function startTest(testId: string): Promise<TestResult> {
  const response = await apiClient<TestResultEnvelope>(
    `/me/tests/${testId}/start`,
    { method: "POST", auth: "required" }
  );
  return mapResult(response.data);
}

/** POST /me/tests/{testId}/submit — отправить ответы теста и кейса. */
export async function submitTest(
  testId: string,
  input: {
    answers: Array<{ questionId: string; answer: string }>;
    caseAnswer?: string;
  }
): Promise<TestResult> {
  const response = await apiClient<TestResultEnvelope>(
    `/me/tests/${testId}/submit`,
    {
      method: "POST",
      auth: "required",
      body: {
        answers: input.answers.map((a) => ({
          question_id: a.questionId,
          answer: a.answer,
        })),
        ...(input.caseAnswer ? { case_answer: input.caseAnswer } : {}),
      },
    }
  );
  return mapResult(response.data);
}
