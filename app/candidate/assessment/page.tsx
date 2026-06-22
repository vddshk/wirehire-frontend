"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AssessmentSessionShell } from "@/components/assessment/AssessmentSessionShell";
import { ProctoringHud } from "@/components/ProctoringHud";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { addAuditEvent } from "@/lib/api/audit";
import { saveAssessmentSubmission } from "@/lib/api/assessments";
import { saveAssessmentPackage } from "@/lib/api/assessmentPackages";
import { USE_REMOTE_API } from "@/lib/api/config";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { loadProfileAssessmentState } from "@/lib/assessment/profileAssessment";
import { getMyProfileAssessment, startTest, submitTest } from "@/lib/api/runAssessment";
import { buildSubmissionFromRun } from "@/lib/api/assessmentPackages";
import { getCandidateById, updateCandidate } from "@/lib/api/candidates";
import { getCurrentUser } from "@/lib/api/session";
import {
  AssessmentAnswer,
  AssessmentCategoryScore,
  AssessmentLevel,
  AssessmentPackage,
  AssessmentProctoringMode,
  AssessmentSubmission,
} from "@/types/assessment";
import { Candidate } from "@/types/candidate";
import { Skill, SkillStatus } from "@/types/skill";
import { CurrentUser } from "@/types/user";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Status,
  type StatusTone,
} from "@/components/ui/editorial";
import {
  requestProctoringPermissions,
  stopMediaStream,
} from "@/lib/proctoring/media";
import { useProctoringMonitor } from "@/lib/proctoring/useProctoringMonitor";
import type { ProctoringMediaStatus } from "@/types/proctoring";
import {
  finishProctoringSession,
  startProctoringSession,
} from "@/lib/api/proctoring";
import { formatDate } from "@/lib/utils/date";

type Stage = "intro" | "precheck" | "running" | "case" | "done";

type RubricRow = {
  skill: string;
  questionsCount: number;
  estimatedMinutes: number;
};

function groupQuestionsBySkill(pkg: AssessmentPackage): RubricRow[] {
  const counts = new Map<string, number>();
  for (const question of pkg.questions) {
    if (!question.isEnabled) continue;
    counts.set(question.skill, (counts.get(question.skill) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([skill, count]) => ({
    skill,
    questionsCount: count,
    estimatedMinutes: Math.max(5, Math.round(count * 1.5)),
  }));
}

function levelFromScore(score: number): AssessmentLevel {
  if (score >= 90) return "expert";
  if (score >= 80) return "advanced";
  return "intermediate";
}

// Тексты вопросов из mock-генератора начинаются с «Вопрос N по {skill}.» —
// в самом теле вопроса этот префикс нам не нужен, потому что мы выводим его
// отдельной строкой капсами над h2. Срезаем его если он там есть.
function stripQuestionPrefix(text: string): string {
  return text.replace(/^Вопрос\s*№?\s*\d+\s+по\s+[^.]+\.\s*/i, "").trim();
}

function mockScoreForSkill(
  skill: string,
  candidateId: string,
  answersForSkill: string[]
): number {
  const input = `${candidateId}:${skill}`;
  let seed = 0;
  for (let i = 0; i < input.length; i += 1) {
    seed = (seed * 31 + input.charCodeAt(i)) >>> 0;
  }
  const baseline = 75 + (seed % 11);
  const meaningful = answersForSkill.filter((a) => a.trim().length > 0);
  if (meaningful.length === 0) return Math.max(50, baseline - 30);
  const avgLength =
    meaningful.reduce((sum, a) => sum + a.trim().length, 0) /
    meaningful.length;
  const depthBonus = Math.min(12, Math.round(avgLength / 40));
  const coverageBonus = Math.round(
    (meaningful.length / answersForSkill.length) * 4
  );
  return Math.min(100, baseline + depthBonus + coverageBonus);
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function levelLabelRu(level: AssessmentLevel): string {
  if (level === "expert") return "Эксперт";
  if (level === "advanced") return "Продвинутый";
  return "Средний";
}

function skillConfirmMeta(score: number): { label: string; tone: StatusTone } {
  if (score >= 80) return { label: "Подтвержден", tone: "good" };
  if (score >= 60) return { label: "Частично", tone: "warn" };
  return { label: "Требует проверки", tone: "risk" };
}

function riskMeta(
  level: AssessmentSubmission["proctoringRiskLevel"]
): { label: string; tone: StatusTone } {
  if (level === "low") return { label: "Низкий риск", tone: "good" };
  if (level === "medium") return { label: "Средний риск", tone: "warn" };
  if (level === "high") return { label: "Высокий риск", tone: "risk" };
  return { label: "Требует review", tone: "risk" };
}

function pluralSkills(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "навыков";
  if (mod10 === 1) return "навык";
  if (mod10 >= 2 && mod10 <= 4) return "навыка";
  return "навыков";
}

function skillStatusFromScore(score: number): SkillStatus {
  if (score >= 80) return "confirmed";
  if (score >= 60) return "partially_confirmed";
  return "questionable";
}

function buildSubmissionScore(
  pkg: AssessmentPackage,
  candidateId: string,
  answers: Record<string, string>
): { scoreOverall: number; scoreByCategory: AssessmentCategoryScore[] } {
  const rubric = groupQuestionsBySkill(pkg);
  const scoreByCategory = rubric.map((row) => {
    const answersForSkill = pkg.questions
      .filter((q) => q.isEnabled && q.skill === row.skill)
      .map((q) => answers[q.id] ?? "");
    const score = mockScoreForSkill(row.skill, candidateId, answersForSkill);
    return { skill: row.skill, score, level: levelFromScore(score) };
  });
  const total = scoreByCategory.reduce((sum, item) => sum + item.score, 0);
  const scoreOverall = scoreByCategory.length
    ? Math.round(total / scoreByCategory.length)
    : 0;
  return { scoreOverall, scoreByCategory };
}

function applyAssessmentScoresToSkills(
  candidate: Candidate,
  scoreByCategory: AssessmentCategoryScore[]
): Candidate {
  const structured = candidate.structuredSkills ?? [];
  const updatedAt = new Date().toLocaleDateString("ru-RU");
  const next: Skill[] = structured.map((skill) => {
    const match = scoreByCategory.find(
      (entry) => entry.skill.toLowerCase() === skill.name.toLowerCase()
    );
    if (!match) return skill;
    return {
      ...skill,
      status: skillStatusFromScore(match.score),
      assessmentScore: match.score,
      updatedAt,
    };
  });
  return { ...candidate, structuredSkills: next };
}

export default function CandidateAssessmentPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [pkg, setPkg] = useState<AssessmentPackage | null>(null);
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(
    null
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [stage, setStage] = useState<Stage>("intro");
  const [serverSessionStarted, setServerSessionStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [proctoringMode, setProctoringMode] =
    useState<AssessmentProctoringMode>("disabled");
  const [proctoringConsent, setProctoringConsent] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<ProctoringMediaStatus>({
    camera: false,
    microphone: false,
    screen: false,
  });
  const [cameraPreviewStream, setCameraPreviewStream] =
    useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caseAnswer, setCaseAnswer] = useState("");
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const [backendProctoringSessionId, setBackendProctoringSessionId] =
    useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const proctoringSessionId =
    backendProctoringSessionId ??
    (pkg ? `proctoring-${pkg.id}` : "proctoring-local");

  const proctoringActive =
    (stage === "running" || stage === "case") &&
    proctoringMode === "enabled" &&
    proctoringConsent &&
    permissionsGranted;

  const { counts, totalViolations, recordZoneLeave, resetCounts } =
    useProctoringMonitor({
      active: proctoringActive,
      sessionId: proctoringSessionId,
      packageId: pkg?.id,
    });

  const proctoringRiskLevel: "low" | "medium" | "high" | "review" =
    totalViolations === 0
      ? "low"
      : totalViolations <= 3
        ? "medium"
        : totalViolations <= 6
          ? "high"
          : "review";
  const proctoringRiskLabel: Record<typeof proctoringRiskLevel, string> = {
    low: "низкий риск",
    medium: "средний риск",
    high: "высокий риск",
    review: "требует review",
  };
  const proctoringRiskTone: Record<
    typeof proctoringRiskLevel,
    "good" | "warn" | "risk" | "muted"
  > = { low: "good", medium: "warn", high: "risk", review: "risk" };
  const proctoringScoreByRisk: Record<typeof proctoringRiskLevel, number> = {
    low: 100,
    medium: 70,
    high: 40,
    review: 0,
  };

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) return;
    video.srcObject = cameraPreviewStream;
  }, [cameraPreviewStream]);

  useEffect(() => {
    return () => {
      stopMediaStream(cameraStreamRef.current);
      stopMediaStream(screenStreamRef.current);
    };
  }, []);

  async function handleRequestPermissions() {
    setIsRequestingPermissions(true);
    setPermissionError("");
    stopMediaStream(cameraStreamRef.current);
    stopMediaStream(screenStreamRef.current);
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    setCameraPreviewStream(null);

    const result = await requestProctoringPermissions();
    cameraStreamRef.current = result.cameraStream;
    screenStreamRef.current = result.screenStream;
    setCameraPreviewStream(result.cameraStream);
    setMediaStatus(result.status);
    setPermissionsGranted(result.granted);

    if (!result.granted) {
      const failed = [
        !result.status.camera ? "камера" : null,
        !result.status.microphone ? "микрофон" : null,
        !result.status.screen ? "экран" : null,
      ].filter(Boolean);
      setPermissionError(
        `Не удалось получить: ${failed.join(", ")}. Разрешите доступ в браузере и попробуйте снова.`
      );
    }

    setIsRequestingPermissions(false);
  }

  function releaseProctoringMedia() {
    stopMediaStream(cameraStreamRef.current);
    stopMediaStream(screenStreamRef.current);
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    setCameraPreviewStream(null);
    setMediaStatus({ camera: false, microphone: false, screen: false });
    setPermissionsGranted(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError("");
      const user = getCurrentUser();
      if (!cancelled) setCurrentUser(user);
      if (!user || user.role !== "candidate") {
        if (!cancelled) setIsLoaded(true);
        return;
      }

      try {
        const candidateId = user.candidateId ?? `candidate-${user.id}`;
        const cand = await getCandidateById(candidateId);
        if (cancelled) return;
        setCandidate(cand);
        if (!cand) return;

        const state = await loadProfileAssessmentState(cand);
        if (cancelled) return;

        if (state.pkg) {
          setPkg(state.pkg);
          setProctoringMode(
            state.pkg.proctoringEnabled ? "enabled" : "disabled"
          );
          setServerSessionStarted(state.serverSessionStarted);
          if (state.submission) {
            setSubmission(state.submission);
          }
          if (state.initialStage === "running") {
            setStage("running");
            setTimeLeftSec(state.pkg.durationMinutes * 60);
          } else {
            setStage(state.initialStage);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            getErrorText(
              err,
              "Не удалось загрузить пакет оценки. Проверьте соединение и попробуйте снова."
            )
          );
        }
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    setIsLoaded(false);
    load();

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (stage !== "running" || !pkg) return;
    const ticker = setInterval(() => {
      setTimeLeftSec((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(ticker);
  }, [stage, pkg]);

  const enabledQuestions = useMemo(
    () => pkg?.questions.filter((question) => question.isEnabled) ?? [],
    [pkg]
  );
  const rubric = useMemo(() => (pkg ? groupQuestionsBySkill(pkg) : []), [pkg]);
  const totalEstimatedMinutes = rubric.reduce(
    (sum, row) => sum + row.estimatedMinutes,
    0
  );

  if (!isLoaded) {
    return <PageSkeleton variant="compact" />;
  }

  if (loadError) {
    return (
      <PageHeader
        eyebrow="Ошибка"
        title="Не удалось загрузить оценку"
        lead={loadError}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setLoadAttempt((value) => value + 1)}
          >
            Повторить →
          </button>
        }
      />
    );
  }

  if (currentUser && currentUser.role !== "candidate") {
    return (
      <PageHeader
        eyebrow="Доступ"
        title="Это страница кандидата"
        lead="Общую AI-оценку проходит кандидат. Компания видит только результат на странице кандидата"
        actions={
          <Link href="/dashboard" className="btn btn-primary">
            В кабинет →
          </Link>
        }
      />
    );
  }

  if (!candidate) {
    return (
      <PageHeader
        eyebrow="Профиль"
        title="Профиль не найден"
        lead="Кандидат не найден в системе. Пожалуйста, заполните профиль, чтобы пройти AI-оценку"
      />
    );
  }

  if (!pkg) {
    return (
      <>
        <PageHeader
          eyebrow="AI-оценка"
          title={
            <>
              Пакет
              <br />
              еще не сформирован.
            </>
          }
          lead="Общая AI-оценка генерируется автоматически после того, как вы добавите хотя бы один опыт работы и навыки. Заполните профиль — система соберет пакет под ваши навыки"
          actions={
            <Link href="/candidate/profile" className="btn btn-primary">
              К профилю →
            </Link>
          }
        />
      </>
    );
  }

  const currentQuestion = enabledQuestions[questionIndex] ?? null;
  const totalQuestions = enabledQuestions.length;
  const progressFraction = totalQuestions
    ? (questionIndex + 1) / totalQuestions
    : 0;
  const sessionLabel = `Сессия #${pkg.id.slice(-4).toUpperCase()}`;

  async function startSession() {
    if (!pkg || !candidate) return;
    if (proctoringMode === "enabled") {
      setStage("precheck");
      return;
    }
    await beginRunning();
  }

  async function beginRunning() {
    if (!pkg || !candidate || isStarting) return;

    setIsStarting(true);
    setSessionError("");

    const updated: AssessmentPackage = {
      ...pkg,
      status: "in_progress",
      proctoringEnabled: proctoringMode === "enabled",
    };

    try {
      if (USE_REMOTE_API) {
        await startTest(pkg.id);
        setServerSessionStarted(true);
        if (proctoringMode === "enabled") {
          const session = await startProctoringSession(
            pkg.id,
            permissionsGranted
          );
          setBackendProctoringSessionId(session.id);
        }
      } else {
        await saveAssessmentPackage(updated);
        setServerSessionStarted(true);
      }
    } catch (err) {
      setSessionError(
        getErrorText(err, "Не удалось начать тест. Попробуйте позже.")
      );
      return;
    } finally {
      setIsStarting(false);
    }

    setPkg(updated);
    resetCounts();
    setStage("running");
    setQuestionIndex(0);
    setTimeLeftSec(pkg.durationMinutes * 60);
  }

  function handleChangeAnswer(value: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  function goPrev() {
    if (questionIndex > 0) setQuestionIndex(questionIndex - 1);
  }

  function validateQuestionAnswers(): string | null {
    const missing = enabledQuestions.filter(
      (question) => !(answers[question.id] ?? "").trim()
    );
    if (missing.length === 0) return null;
    if (missing.length === 1) {
      return "Ответьте на все вопросы — остался один без ответа.";
    }
    return `Ответьте на все вопросы — без ответа: ${missing.length}.`;
  }

  async function goNext() {
    if (!pkg || !candidate || !currentQuestion) return;
    setSessionError("");

    if (!(answers[currentQuestion.id] ?? "").trim()) {
      setSessionError("Введите ответ на текущий вопрос, прежде чем идти дальше.");
      return;
    }

    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }

    const validationError = validateQuestionAnswers();
    if (validationError) {
      setSessionError(validationError);
      return;
    }

    if (pkg.caseText.trim()) {
      setStage("case");
      return;
    }

    await finishSession();
  }

  async function finishSession() {
    if (!pkg || !candidate || isSubmitting) return;

    const validationError = validateQuestionAnswers();
    if (validationError) {
      setSessionError(validationError);
      return;
    }

    if (pkg.caseText.trim() && !caseAnswer.trim()) {
      setSessionError("Добавьте решение практического кейса.");
      return;
    }

    const testAnswers: AssessmentAnswer[] = enabledQuestions.map((question) => ({
      questionId: question.id,
      question: question.text,
      answer: (answers[question.id] ?? "").trim(),
    }));

    setIsSubmitting(true);
    setSessionError("");

    if (USE_REMOTE_API) {
      try {
        if (!serverSessionStarted) {
          await startTest(pkg.id);
          setServerSessionStarted(true);
          if (proctoringMode === "enabled" && !backendProctoringSessionId) {
            const session = await startProctoringSession(
              pkg.id,
              permissionsGranted
            );
            setBackendProctoringSessionId(session.id);
          }
        }
        if (backendProctoringSessionId) {
          await finishProctoringSession(backendProctoringSessionId);
        }
        await submitTest(pkg.id, {
          answers: testAnswers.map((item) => ({
            questionId: item.questionId,
            answer: item.answer,
          })),
          caseAnswer: caseAnswer.trim() || undefined,
        });
        const run = await getMyProfileAssessment();
        const completedPackage: AssessmentPackage = {
          ...pkg,
          status: "completed",
        };
        const remoteSubmission =
          run && buildSubmissionFromRun(run, completedPackage, candidate.id);
        releaseProctoringMedia();
        setPkg(completedPackage);
        if (remoteSubmission) {
          setSubmission(remoteSubmission);
        }
        setStage("done");
      } catch (err) {
        const message = getErrorText(
          err,
          "Не удалось отправить ответы. Попробуйте снова."
        );
        if (message.includes("Start the test before submitting")) {
          setSessionError(
            "Сессия не была начата на сервере. Вернитесь в начало и нажмите «Начать сессию» снова."
          );
        } else if (
          message.includes("session_closed") ||
          message.includes("attempt_exhausted") ||
          message.includes("Сессия теста завершена")
        ) {
          setSessionError(
            "Сессия уже закрыта на сервере — ответы, скорее всего, были приняты при прошлой попытке, но экран результата не показался из‑за ошибки. Обновите страницу; если итог не появился, попросите поддержку сбросить попытку теста."
          );
        } else {
          setSessionError(message);
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const { scoreOverall: rawScore, scoreByCategory } = buildSubmissionScore(
      pkg,
      candidate.id,
      answers
    );

    const proctoringActiveAtSubmit =
      proctoringMode === "enabled" && proctoringConsent && permissionsGranted;
    const proctoringScore = proctoringActiveAtSubmit
      ? proctoringScoreByRisk[proctoringRiskLevel]
      : 100;
    const scoreOverall = proctoringActiveAtSubmit
      ? Math.round(rawScore * 0.7 + proctoringScore * 0.3)
      : rawScore;

    const newSubmission: AssessmentSubmission = {
      id: `submission-${Date.now()}`,
      candidateId: candidate.id,
      assessmentPackageId: pkg.id,
      status: "submitted",
      testAnswers,
      caseAnswer: "",
      proctoringAccepted: proctoringActiveAtSubmit,
      proctoringMode,
      scoreOverall,
      scoreByCategory,
      rawSkillsScore: rawScore,
      proctoringScore: proctoringActiveAtSubmit ? proctoringScore : undefined,
      proctoringViolations: proctoringActiveAtSubmit
        ? totalViolations
        : undefined,
      proctoringViolationBreakdown: proctoringActiveAtSubmit
        ? counts
        : undefined,
      proctoringRiskLevel: proctoringActiveAtSubmit
        ? proctoringRiskLevel
        : undefined,
      submittedAt: new Date().toLocaleDateString("ru-RU"),
    };
    const savedSubmission = await saveAssessmentSubmission(newSubmission);

    const completedPackage: AssessmentPackage = {
      ...pkg,
      status: "completed",
      proctoringEnabled: proctoringMode === "enabled",
    };
    await saveAssessmentPackage(completedPackage);

    const candidateWithUpdatedSkills = applyAssessmentScoresToSkills(
      candidate,
      scoreByCategory
    );
    const persistedCandidate = await updateCandidate(candidateWithUpdatedSkills);

    addAuditEvent({
      type: "assessment_submitted",
      title: "Кандидат прошел общую AI-оценку",
      description: `${candidate.fullName} прошел общую AI-оценку навыков. Средний результат ${scoreOverall}/100.`,
      actorRole: "Candidate",
      candidateId: candidate.id,
      candidateName: candidate.fullName,
    });

    releaseProctoringMedia();
    setPkg(completedPackage);
    setSubmission(savedSubmission);
    setCandidate(persistedCandidate);
    setStage("done");
    setIsSubmitting(false);
  }

  return (
    <div data-screen-label="Кандидат · AI-оценка">
      {stage === "intro" && (
        <>
          <PageHeader
            eyebrow="Проверка навыков"
            title="AI-оценка"
            lead={pkg.instructions}
            actions={
              <button
                className="btn btn-primary btn-lg"
                onClick={startSession}
                disabled={
                  totalQuestions === 0 ||
                  pkg.status === "completed" ||
                  isStarting
                }
              >
                {isStarting ? "Запуск…" : "Начать сессию →"}
              </button>
            }
          />

          <div className="sec">
            <div className="label">
              <span className="num">01</span>Что внутри
            </div>
            <div className="body">
              <div className="rows">
                {rubric.map((row) => (
                  <div className="r" key={row.skill}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        letterSpacing: "-0.012em",
                      }}
                    >
                      {row.skill}
                    </div>
                    <div className="muted">{row.questionsCount} вопросов</div>
                    <div
                      className="muted mono"
                      style={{ fontSize: 12 }}
                    >{`~${row.estimatedMinutes} мин`}</div>
                    <Status tone="good">в плане</Status>
                  </div>
                ))}
              </div>
              {pkg.rubricExplanation && (
                <div
                  className="lead"
                  style={{ marginTop: 32, fontSize: 15, maxWidth: "none" }}
                >
                  {pkg.rubricExplanation}
                </div>
              )}
              <div
                className="caption"
                style={{
                  marginTop: 20,
                  textTransform: "none",
                  fontSize: 13,
                  maxWidth: "none",
                }}
              >
                Оценочное время сессии — ~{totalEstimatedMinutes} минут. Длительность
                в пакете: {pkg.durationMinutes} минут
              </div>
            </div>
          </div>

          <div className="sec">
            <div className="label">
              <span className="num">02</span>Прокторинг
            </div>
            <div className="body" style={{ maxWidth: 820 }}>
              <div
                className="proctoring-picker"
                role="radiogroup"
                aria-label="Режим прокторинга"
              >
                <p className="proctoring-picker__lead">
                  Запись сессии повышает доверие HR к результату. Режим можно
                  сменить до старта
                </p>

                <div className="proctoring-picker__grid">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={proctoringMode === "enabled"}
                    className={`proctoring-picker__card${proctoringMode === "enabled" ? " is-selected" : ""}`}
                    onClick={() => setProctoringMode("enabled")}
                  >
                    <span className="proctoring-picker__badge">Рекомендуем</span>
                    <span className="proctoring-picker__mark" aria-hidden="true" />
                    <span className="proctoring-picker__title">С прокторингом</span>
                    <span className="proctoring-picker__subtitle">
                      Камера, микрофон и экран
                    </span>
                    <ul className="proctoring-picker__points">
                      <li>HR видит подтвержденную сессию</li>
                      <li>Подходит для senior-ролей</li>
                      <li>Отдельное согласие перед стартом</li>
                    </ul>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={proctoringMode === "disabled"}
                    className={`proctoring-picker__card${proctoringMode === "disabled" ? " is-selected" : ""}`}
                    onClick={() => setProctoringMode("disabled")}
                  >
                    <span className="proctoring-picker__mark" aria-hidden="true" />
                    <span className="proctoring-picker__title">Без прокторинга</span>
                    <span className="proctoring-picker__subtitle">
                      Без записи и разрешений
                    </span>
                    <ul className="proctoring-picker__points">
                      <li>Быстрый старт без pre-check</li>
                      <li>Только оценка навыков</li>
                      <li>Для самопроверки уровня</li>
                    </ul>
                  </button>
                </div>

                <p className="proctoring-picker__note">
                  При включенном прокторинге события сессии сохраняются 90 дней.
                  Это отдельное согласие — не связано с общими согласиями в кабинете
                </p>
              </div>
            </div>
          </div>

          {sessionError && (
            <div
              className="placeholder"
              style={{
                marginTop: 32,
                borderColor: "var(--risk)",
                color: "var(--risk)",
              }}
              role="alert"
            >
              {sessionError}
            </div>
          )}
        </>
      )}

      {stage === "precheck" && (
        <>
          <div className="page-h" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">Прокторинг · pre-check</div>
              <h1 className="display">
                Проверим
                <br />
                камеру и микрофон
              </h1>
              <div className="lead">
                Перед стартом нужно отдельное согласие и технические разрешения.
                Без них прокторинг-сессия не стартует
              </div>
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setStage("intro")}>
                Назад
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={beginRunning}
                disabled={
                  !proctoringConsent || !permissionsGranted || isStarting
                }
              >
                {isStarting ? "Запуск…" : "Начать сессию →"}
              </button>
            </div>
          </div>

          <div className="sec">
            <div className="label">
              <span className="num">01</span>Разрешения
            </div>
            <div className="body" style={{ maxWidth: 720 }}>
              <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
                Браузер запросит доступ к камере, микрофону и записи экрана.
                Без всех трех разрешений сессия с прокторингом не начнется
              </div>
              <div
                className="rows"
                style={{ marginBottom: 24, borderTop: "1px solid var(--ink)" }}
              >
                {(
                  [
                    ["Камера", "запись лица во время сессии", mediaStatus.camera],
                    [
                      "Микрофон",
                      "фиксация устной активности",
                      mediaStatus.microphone,
                    ],
                    ["Экран", "запись окна с заданием", mediaStatus.screen],
                  ] as const
                ).map(([title, desc, granted]) => (
                  <div className="r" key={title}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        letterSpacing: "-0.012em",
                      }}
                    >
                      {title}
                    </div>
                    <div className="muted">{desc}</div>
                    <Status tone={granted ? "good" : "muted"}>
                      {granted ? "выдано" : "ожидает"}
                    </Status>
                  </div>
                ))}
              </div>
              {cameraPreviewStream && (
                <video
                  ref={previewVideoRef}
                  className="proctoring-precheck__preview"
                  autoPlay
                  muted
                  playsInline
                  style={{ marginBottom: 24 }}
                />
              )}
              {permissionError && (
                <div
                  className="placeholder"
                  style={{
                    borderColor: "var(--risk)",
                    color: "var(--risk)",
                    marginBottom: 24,
                  }}
                >
                  {permissionError}
                </div>
              )}
              <button
                type="button"
                className={`btn ${permissionsGranted ? "" : "btn-primary"}`}
                onClick={handleRequestPermissions}
                disabled={permissionsGranted || isRequestingPermissions}
              >
                {isRequestingPermissions
                  ? "Запрашиваем доступ…"
                  : permissionsGranted
                    ? "Разрешения получены ✓"
                    : "Дать разрешение →"}
              </button>
            </div>
          </div>

          <div className="sec">
            <div className="label">
              <span className="num">02</span>Согласие на запись
            </div>
            <div className="body" style={{ maxWidth: 720 }}>
              <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
                Это отдельное согласие на прокторинг — независимо от твоего
                общего согласия в кабинете. Без него сессия не стартует
              </div>
              <button
                type="button"
                className={`proctoring-picker__card proctoring-picker__card--full${proctoringConsent ? " is-selected" : ""}`}
                onClick={() => setProctoringConsent(!proctoringConsent)}
                aria-pressed={proctoringConsent}
              >
                <span className="proctoring-picker__mark" aria-hidden="true" />
                <span className="proctoring-picker__title">
                  Я даю согласие на запись сессии
                </span>
                <span className="proctoring-picker__subtitle">
                  Прохожу тест самостоятельно
                </span>
                <p className="proctoring-picker__legal">
                  Фиксируются фокус окна, подключение устройств и попытки
                  переключения. Данные хранятся 90 дней
                </p>
              </button>
            </div>
          </div>
        </>
      )}

      {stage === "running" && currentQuestion && (
        <AssessmentSessionShell
          proctored={proctoringActive}
          backdrop={
            proctoringActive ? (
              <div className="proctoring-zone__backdrop" aria-hidden="true" />
            ) : undefined
          }
          hud={
            proctoringActive ? (
              <ProctoringHud
                counts={counts}
                totalViolations={totalViolations}
                riskLabel={proctoringRiskLabel[proctoringRiskLevel]}
                riskTone={proctoringRiskTone[proctoringRiskLevel]}
                mediaStatus={mediaStatus}
              />
            ) : undefined
          }
          onMouseLeave={proctoringActive ? recordZoneLeave : undefined}
          metaLeft={`${sessionLabel} · ${currentQuestion.skill}`}
          metaRight={`${questionIndex + 1} / ${totalQuestions} · ${formatTime(timeLeftSec)} осталось`}
          sectionNum={`№${questionIndex + 1}`}
          sectionLabel={`Вопрос по ${currentQuestion.skill}`}
          title={stripQuestionPrefix(currentQuestion.text)}
          progress={progressFraction * 100}
          error={sessionError}
          footer={
            <>
              <button
                className="btn btn-ghost"
                onClick={goPrev}
                disabled={questionIndex === 0 || isSubmitting}
              >
                ← назад
              </button>
              <button
                className="btn btn-primary"
                onClick={goNext}
                disabled={isSubmitting}
              >
                {questionIndex === totalQuestions - 1
                  ? pkg.caseText.trim()
                    ? "к кейсу →"
                    : isSubmitting
                      ? "Отправка…"
                      : "завершить →"
                  : "далее →"}
              </button>
            </>
          }
        >
          <textarea
            className="textarea"
            rows={10}
            value={answers[currentQuestion.id] ?? ""}
            onChange={(event) => handleChangeAnswer(event.target.value)}
            placeholder="Опишите решение, шаги, риски, проверку результата…"
          />
        </AssessmentSessionShell>
      )}

      {stage === "case" && pkg && (
        <AssessmentSessionShell
          proctored={proctoringActive}
          backdrop={
            proctoringActive ? (
              <div className="proctoring-zone__backdrop" aria-hidden="true" />
            ) : undefined
          }
          hud={
            proctoringActive ? (
              <ProctoringHud
                counts={counts}
                totalViolations={totalViolations}
                riskLabel={proctoringRiskLabel[proctoringRiskLevel]}
                riskTone={proctoringRiskTone[proctoringRiskLevel]}
                mediaStatus={mediaStatus}
              />
            ) : undefined
          }
          onMouseLeave={proctoringActive ? recordZoneLeave : undefined}
          metaLeft="Практический кейс"
          metaRight={sessionLabel}
          sectionNum="05"
          sectionLabel={pkg.caseTitle || "Кейс"}
          title="Решение кейса"
          error={sessionError}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSessionError("");
                  setStage("running");
                  setQuestionIndex(totalQuestions - 1);
                }}
                disabled={isSubmitting}
              >
                ← к вопросам
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void finishSession()}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Отправка…" : "Отправить ответы →"}
              </button>
            </>
          }
        >
          <p className="assessment-session__prompt">{pkg.caseText}</p>
          <textarea
            className="textarea"
            rows={12}
            value={caseAnswer}
            onChange={(event) => setCaseAnswer(event.target.value)}
            placeholder="Опишите решение, шаги, риски и как проверите результат…"
          />
        </AssessmentSessionShell>
      )}

      {stage === "done" && submission && (
        <>
          {(() => {
            const skillRows = submission.scoreByCategory ?? [];
            const overallScore = submission.scoreOverall ?? 0;
            const hasProctoringBreakdown =
              submission.proctoringAccepted &&
              submission.proctoringScore !== undefined;
            const risk = riskMeta(submission.proctoringRiskLevel);

            return (
              <>
                <PageHeader
                  eyebrow="Сессия завершена"
                  title="Готово"
                  lead="Результат сохранен в профиле и доступен работодателям. Статусы навыков обновлены."
                  actions={
                    <Link href="/candidate/profile" className="btn btn-primary">
                      К профилю →
                    </Link>
                  }
                />

                <section className="assessment-result">
                  <div className="assessment-result__hero">
                    <div
                      className="assessment-result__ring"
                      style={
                        {
                          "--score-pct": `${Math.min(100, Math.max(0, overallScore))}%`,
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    >
                      <span className="assessment-result__ring-value">
                        {overallScore}
                      </span>
                    </div>

                    <div className="assessment-result__hero-copy">
                      <p className="assessment-result__hero-title">
                        Итоговый балл из 100
                      </p>
                      <p className="assessment-result__hero-desc">
                        Оценка сформирована AI по вашим ответам. Проверено{" "}
                        {skillRows.length} {pluralSkills(skillRows.length)}.
                      </p>
                      <div className="assessment-result__meta">
                        <span className="assessment-result__pill">
                          Отправлено {formatDate(submission.submittedAt)}
                        </span>
                        {submission.proctoringMode === "enabled" &&
                          submission.proctoringAccepted && (
                            <span className="assessment-result__pill assessment-result__pill--accent">
                              С прокторингом
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  {hasProctoringBreakdown && (
                    <div className="assessment-result__breakdown">
                      <StatGrid cols={4}>
                        <Stat
                          value={
                            <>
                              {submission.rawSkillsScore ?? 0}
                              <span className="assessment-result__stat-suffix">
                                /100
                              </span>
                            </>
                          }
                          label="Навыки · вес 70%"
                        />
                        <Stat
                          value={
                            <>
                              {submission.proctoringScore}
                              <span className="assessment-result__stat-suffix">
                                /100
                              </span>
                            </>
                          }
                          label="Прокторинг · вес 30%"
                        />
                        <Stat
                          value={submission.proctoringViolations ?? 0}
                          label="Нарушений зоны"
                        />
                        <Stat
                          value={
                            <Status tone={risk.tone} dot>
                              {risk.label}
                            </Status>
                          }
                          label="Итоговый риск"
                        />
                      </StatGrid>
                      <p className="assessment-result__formula">
                        Итог = навыки × 0,7 + прокторинг × 0,3
                      </p>
                    </div>
                  )}
                </section>

                <Section num="01" label="Результаты по навыкам">
                  {skillRows.length === 0 ? (
                    <p className="assessment-result__empty">
                      Детализация по навыкам пока недоступна.
                    </p>
                  ) : (
                    <ul className="assessment-result__skills">
                      {skillRows.map((row) => {
                        const confirm = skillConfirmMeta(row.score);
                        return (
                          <li className="assessment-skill-row" key={row.skill}>
                            <div className="assessment-skill-row__head">
                              <div className="assessment-skill-row__main">
                                <span className="assessment-skill-row__name">
                                  {row.skill}
                                </span>
                                <span className="assessment-skill-row__level">
                                  {levelLabelRu(row.level)}
                                </span>
                              </div>
                              <div className="assessment-skill-row__aside">
                                <Status tone={confirm.tone}>
                                  {confirm.label}
                                </Status>
                                <div className="assessment-skill-row__score">
                                  <span className="assessment-skill-row__score-value">
                                    {row.score}
                                  </span>
                                  <span className="assessment-skill-row__score-max">
                                    /100
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div
                              className="assessment-skill-row__bar"
                              role="presentation"
                            >
                              <div
                                className="assessment-skill-row__bar-fill"
                                style={{ width: `${row.score}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Section>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
