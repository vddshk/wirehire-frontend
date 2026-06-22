import {
  AssessmentPackage,
  AssessmentPackageQuestion,
} from "@/types/assessment";
import { AssessmentTemplate } from "@/types/admin";
import { Candidate } from "@/types/candidate";
import { Vacancy } from "@/types/vacancy";
import { mockAssessmentTemplates } from "@/data/mockAdmin";
import { getStoredArray, setStoredArray } from "./storage";

const ASSESSMENT_PACKAGES_STORAGE_KEY = "wirehire-assessment-packages";
const TEMPLATES_STORAGE_KEY = "wirehire-admin-templates";
const templateQuestionsKey = (templateId: string) =>
  `wirehire-template-questions-${templateId}`;

// Канонiчные тексты пакета. Перезаписывают все, что лежит в localStorage,
// чтобы старые сохранения с устаревшей формулировкой подтягивались
// автоматически (без ручной очистки кэша в браузере пользователя).
const CANONICAL_INSTRUCTIONS =
  "Серия коротких вопросов по основным заявленным навыкам. Отвечай развернуто и опирайся на реальный опыт. Результат сохранится в профиле и будет виден работодателям как подтверждение";
const CANONICAL_TITLE = "Общая AI-оценка навыков";

// Подменяем поля, у которых нет смысла хранить per-кандидата — это статика
// или генерируется из questions[]. Старые кэши со «съехавшим» текстом
// (точки на конце, опечатки) автоматически чинятся при следующей загрузке.
function withCanonicalCopy(pkg: AssessmentPackage): AssessmentPackage {
  const skillsFromQuestions = Array.from(
    new Set(pkg.questions.map((q) => q.skill))
  );
  return {
    ...pkg,
    title: CANONICAL_TITLE,
    instructions: CANONICAL_INSTRUCTIONS,
    rubricExplanation:
      skillsFromQuestions.length > 0
        ? buildRubricExplanation(skillsFromQuestions)
        : pkg.rubricExplanation,
  };
}

type StoredTemplateQuestion = {
  id: string;
  text: string;
  type: "text" | "single_choice" | "case";
  expectedMinutes: number;
  rubric: string;
};

const QUESTIONS_PER_SKILL = 4;
const MINUTES_PER_QUESTION = 1.5;

function getStoredTemplates(): AssessmentTemplate[] {
  if (typeof window === "undefined") return mockAssessmentTemplates;
  const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
  if (!raw) return mockAssessmentTemplates;
  try {
    const parsed = JSON.parse(raw) as AssessmentTemplate[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : mockAssessmentTemplates;
  } catch {
    return mockAssessmentTemplates;
  }
}

function getTemplateQuestionsForSkill(
  skillName: string
): StoredTemplateQuestion[] {
  if (typeof window === "undefined") return [];
  const normalized = skillName.trim().toLowerCase();
  if (!normalized) return [];
  const matching = getStoredTemplates().filter(
    (t) =>
      t.skillName.trim().toLowerCase() === normalized &&
      t.status !== "deprecated"
  );
  if (matching.length === 0) return [];
  const template =
    matching.find((t) => t.status === "published") ?? matching[0];
  const raw = localStorage.getItem(templateQuestionsKey(template.id));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredTemplateQuestion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type SaveAssessmentPackageInput = Omit<
  AssessmentPackage,
  "createdAt" | "updatedAt"
> & {
  createdAt?: string;
};

export async function getAssessmentPackages(): Promise<AssessmentPackage[]> {
  return getStoredArray<AssessmentPackage>(
    ASSESSMENT_PACKAGES_STORAGE_KEY
  ).map(withCanonicalCopy);
}

export async function getAssessmentPackageByVerificationRunId(
  verificationRunId: string
): Promise<AssessmentPackage | null> {
  const packages = await getAssessmentPackages();

  return (
    packages.find((item) => item.verificationRunId === verificationRunId) ??
    null
  );
}

export async function getAssessmentPackageById(
  packageId: string
): Promise<AssessmentPackage | null> {
  const packages = await getAssessmentPackages();
  return packages.find((item) => item.id === packageId) ?? null;
}

export async function getActiveAssessmentPackageByCandidateId(
  candidateId: string
): Promise<AssessmentPackage | null> {
  const packages = await getAssessmentPackages();
  return (
    packages.find(
      (item) =>
        item.candidateId === candidateId &&
        !item.vacancyId &&
        (item.status === "pending" || item.status === "in_progress")
    ) ?? null
  );
}

export async function getAssessmentPackagesByCandidateId(
  candidateId: string
): Promise<AssessmentPackage[]> {
  const packages = await getAssessmentPackages();
  return packages.filter(
    (item) => item.candidateId === candidateId && !item.vacancyId
  );
}

export async function saveAssessmentPackage(
  input: SaveAssessmentPackageInput
): Promise<AssessmentPackage> {
  const packages = await getAssessmentPackages();

  const now = new Date().toLocaleDateString("ru-RU");

  const savedPackage: AssessmentPackage = {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  const packagesWithoutCurrent = packages.filter(
    (item) => item.id !== savedPackage.id
  );

  setStoredArray<AssessmentPackage>(ASSESSMENT_PACKAGES_STORAGE_KEY, [
    ...packagesWithoutCurrent,
    savedPackage,
  ]);

  return savedPackage;
}

export function buildDefaultAssessmentQuestions(
  vacancy: Vacancy
): AssessmentPackageQuestion[] {
  return vacancy.skills.slice(0, 5).map((skill, index) => {
    const fromTemplate = getTemplateQuestionsForSkill(skill);
    if (fromTemplate.length > 0) {
      return {
        id: `question-${index + 1}`,
        skill,
        text: fromTemplate[0].text,
        isEnabled: true,
      };
    }
    return {
      id: `question-${index + 1}`,
      skill,
      text: `Опишите практический опыт с ${skill}. Какие задачи вы решал, какие решения принимал и какой был результат?`,
      isEnabled: true,
    };
  });
}

export function buildDefaultCaseText(vacancy: Vacancy) {
  return `Представь, что вы уже работаешь на позиции "${vacancy.title}". Опишите, как бы вы спроектировал небольшой модуль продукта: какие шаги сделал бы сначала, какие риски проверил бы, какие данные запросил бы у команды и как понял бы, что решение работает правильно`;
}

function getCandidateAssessmentSkills(candidate: Candidate): string[] {
  const structured = (candidate.structuredSkills ?? [])
    .map((skill) => skill.name.trim())
    .filter((name) => name.length > 0);
  const legacy = candidate.skills.map((s) => s.trim()).filter(Boolean);
  const merged: string[] = [];
  for (const name of [...structured, ...legacy]) {
    if (!merged.some((s) => s.toLowerCase() === name.toLowerCase())) {
      merged.push(name);
    }
  }
  return merged.slice(0, 5);
}

export function buildDefaultQuestionsForCandidate(
  candidate: Candidate
): AssessmentPackageQuestion[] {
  const skills = getCandidateAssessmentSkills(candidate);
  const questions: AssessmentPackageQuestion[] = [];
  skills.forEach((skill, skillIndex) => {
    const fromTemplate = getTemplateQuestionsForSkill(skill);
    if (fromTemplate.length > 0) {
      fromTemplate.slice(0, QUESTIONS_PER_SKILL).forEach((q, i) => {
        questions.push({
          id: `q-${skillIndex + 1}-${i + 1}`,
          skill,
          text: q.text,
          isEnabled: true,
        });
      });
      return;
    }
    for (let i = 0; i < QUESTIONS_PER_SKILL; i += 1) {
      questions.push({
        id: `q-${skillIndex + 1}-${i + 1}`,
        skill,
        text: `Вопрос ${i + 1} по ${skill}. Опишите, как вы решил бы конкретную задачу, и какой результат считал бы правильным`,
        isEnabled: true,
      });
    }
  });
  return questions;
}

function buildRubricExplanation(skills: string[]): string {
  if (skills.length === 0) return "";
  const list = skills.join(", ");
  return `Покрытие сформировано из заявленных вами навыков: ${list}. Категории, для которых нет шаблона, останутся в статусе «заявлено» и не повлияют на итоговый средний результат`;
}

export async function autoGenerateForCandidate(
  candidate: Candidate
): Promise<AssessmentPackage | null> {
  const hasWorkExperience = candidate.experience.some(
    (exp) => exp.type !== "education"
  );
  const skills = getCandidateAssessmentSkills(candidate);
  if (!hasWorkExperience || skills.length === 0) return null;

  const existing = await getAssessmentPackagesByCandidateId(candidate.id);
  const active = existing.find(
    (p) => p.status === "pending" || p.status === "in_progress"
  );
  if (active) return active;
  const completed = existing.find((p) => p.status === "completed");
  if (completed) return completed;

  const questions = buildDefaultQuestionsForCandidate(candidate);
  const durationMinutes = Math.max(
    20,
    Math.round(questions.length * MINUTES_PER_QUESTION)
  );

  const pkg: AssessmentPackage = {
    id: `pkg-${candidate.id}-${Date.now()}`,
    candidateId: candidate.id,
    status: "pending",
    title: CANONICAL_TITLE,
    instructions: CANONICAL_INSTRUCTIONS,
    durationMinutes,
    questions,
    caseTitle: "",
    caseText: "",
    evaluationRubric: "",
    proctoringEnabled: false,
    rubricExplanation: buildRubricExplanation(skills),
    createdAt: new Date().toLocaleDateString("ru-RU"),
    updatedAt: new Date().toLocaleDateString("ru-RU"),
  };

  const all = await getAssessmentPackages();
  setStoredArray<AssessmentPackage>(ASSESSMENT_PACKAGES_STORAGE_KEY, [
    ...all,
    pkg,
  ]);
  return pkg;
}
