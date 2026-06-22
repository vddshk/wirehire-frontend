import type {
  AssessmentLevel,
  AssessmentPackage,
  AssessmentPackageStatus,
  AssessmentSubmission,
} from "@/types/assessment";
import type { Candidate } from "@/types/candidate";
import type { RunAssessment } from "@/types/runAssessment";
import { getMyProfileAssessment } from "./assessments";
import type { SaveAssessmentPackageInput } from "../local/assessmentPackages";

function levelFromScore(score: number): AssessmentLevel {
  if (score >= 90) return "expert";
  if (score >= 80) return "advanced";
  return "intermediate";
}

function mapPackageStatus(run: RunAssessment): AssessmentPackageStatus {
  const resultStatus = run.result?.status;
  if (resultStatus === "submitted" || resultStatus === "graded") {
    return "completed";
  }
  if (
    resultStatus === "in_progress" ||
    run.test?.status === "in_progress"
  ) {
    return "in_progress";
  }
  return "pending";
}

function buildRubricExplanation(skills: string[]): string {
  if (skills.length === 0) return "";
  return `Покрытие сформировано из заявленных вами навыков: ${skills.join(", ")}. Категории, для которых нет шаблона, останутся в статусе «заявлено» и не повлияют на итоговый средний результат`;
}

export function mapRunAssessmentToPackage(
  run: RunAssessment | null,
  candidateId: string
): AssessmentPackage | null {
  if (!run?.test) return null;

  const test = run.test;
  const caseItem = run.case;
  const skills = Array.from(
    new Set(test.questions.filter((q) => q.isEnabled).map((q) => q.skill))
  );

  return {
    id: test.id,
    candidateId,
    verificationRunId: run.verificationRunId,
    status: mapPackageStatus(run),
    title: test.title || "Общая AI-оценка навыков",
    instructions:
      test.instructions ||
      "Серия коротких вопросов по основным заявленным навыкам. Отвечай развернуто и опирайся на реальный опыт. Результат сохранится в профиле и будет виден работодателям как подтверждение",
    durationMinutes: test.durationMinutes || 30,
    questions: test.questions.map((q) => ({
      id: q.id,
      skill: q.skill,
      text: q.text,
      isEnabled: q.isEnabled,
    })),
    caseTitle: caseItem?.title ?? "",
    caseText: caseItem?.prompt ?? "",
    evaluationRubric: caseItem?.criteria.join("\n") ?? "",
    proctoringEnabled: test.proctoringEnabled === true,
    rubricExplanation:
      test.coverageExplanation?.trim() || buildRubricExplanation(skills),
    createdAt: new Date().toLocaleDateString("ru-RU"),
    updatedAt: new Date().toLocaleDateString("ru-RU"),
  };
}

export function buildSubmissionFromRun(
  run: RunAssessment,
  pkg: AssessmentPackage,
  candidateId: string
): AssessmentSubmission | null {
  const result = run.result;
  if (
    !result ||
    (result.status !== "submitted" && result.status !== "graded")
  ) {
    return null;
  }

  const scoreByCategory = (result.skillBreakdown ?? []).map((item) => ({
    skill: item.skill,
    score: item.score,
    level:
      (item.level as AssessmentLevel) || levelFromScore(item.score),
  }));

  return {
    id: result.id,
    candidateId,
    assessmentPackageId: pkg.id,
    verificationRunId: run.verificationRunId,
    status: "submitted",
    testAnswers: [],
    caseAnswer: "",
    proctoringAccepted: false,
    scoreOverall: result.score ?? 0,
    scoreByCategory,
    submittedAt:
      result.submittedAt ?? new Date().toLocaleDateString("ru-RU"),
  };
}

async function fetchProfilePackage(
  candidateId: string
): Promise<AssessmentPackage | null> {
  const run = await getMyProfileAssessment();
  return mapRunAssessmentToPackage(run, candidateId);
}

export async function getAssessmentPackages(): Promise<AssessmentPackage[]> {
  return [];
}

export async function getAssessmentPackageByVerificationRunId(
  verificationRunId: string
): Promise<AssessmentPackage | null> {
  const run = await getMyProfileAssessment();
  if (!run || run.verificationRunId !== verificationRunId) return null;
  return mapRunAssessmentToPackage(run, "");
}

export async function getAssessmentPackageById(
  packageId: string
): Promise<AssessmentPackage | null> {
  const run = await getMyProfileAssessment();
  const pkg = mapRunAssessmentToPackage(run, "");
  return pkg?.id === packageId ? pkg : null;
}

export async function getActiveAssessmentPackageByCandidateId(
  candidateId: string
): Promise<AssessmentPackage | null> {
  const pkg = await fetchProfilePackage(candidateId);
  if (!pkg) return null;
  if (pkg.status === "pending" || pkg.status === "in_progress") {
    return pkg;
  }
  return null;
}

export async function getAssessmentPackagesByCandidateId(
  candidateId: string
): Promise<AssessmentPackage[]> {
  const pkg = await fetchProfilePackage(candidateId);
  return pkg ? [pkg] : [];
}

export async function saveAssessmentPackage(
  input: SaveAssessmentPackageInput
): Promise<AssessmentPackage> {
  return {
    ...input,
    createdAt: input.createdAt ?? new Date().toLocaleDateString("ru-RU"),
    updatedAt: new Date().toLocaleDateString("ru-RU"),
  };
}

export async function autoGenerateForCandidate(
  candidate: Candidate
): Promise<AssessmentPackage | null> {
  return fetchProfilePackage(candidate.id);
}

export function buildDefaultAssessmentQuestions() {
  return [];
}

export function buildDefaultCaseText() {
  return "";
}

export function buildDefaultQuestionsForCandidate() {
  return [];
}
