"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getMyRunAssessment,
  startTest,
  submitTest,
} from "@/lib/api/runAssessment";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { getSkillVerificationsForRun } from "@/lib/api/skillVerifications";
import { SkillVerificationList } from "@/components/SkillVerificationList";
import { getReportSnapshotForRun } from "@/lib/api/reportSnapshots";
import { ReportSnapshotView } from "@/components/ReportSnapshotView";
import { RunAssessment, TestResult } from "@/types/runAssessment";
import type { SkillVerification } from "@/types/skillVerification";
import type { ReportSnapshot } from "@/types/reportSnapshot";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Status,
  Crumb,
  Placeholder,
} from "@/components/ui/editorial";

export default function AssessmentPage() {
  const params = useParams();
  const runId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [assessment, setAssessment] = useState<RunAssessment | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [caseAnswer, setCaseAnswer] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skillVerifications, setSkillVerifications] = useState<
    SkillVerification[]
  >([]);
  const [reportSnapshot, setReportSnapshot] = useState<ReportSnapshot | null>(
    null
  );

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    getMyRunAssessment(runId)
      .then((data) => {
        if (cancelled) return;
        setAssessment(data);
        setResult(data?.result ?? null);
        const st = data?.result?.status;
        if (st === "submitted" || st === "graded") {
          getSkillVerificationsForRun(runId)
            .then((sv) => {
              if (!cancelled) setSkillVerifications(sv);
            })
            .catch(() => {});
          getReportSnapshotForRun(runId)
            .then((rs) => {
              if (!cancelled) setReportSnapshot(rs);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(getErrorText(err, "Не удалось загрузить задание"));
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const test = assessment?.test ?? null;
  const caseItem = assessment?.case ?? null;
  const enabledQuestions = (test?.questions ?? []).filter((q) => q.isEnabled);

  const status = result?.status ?? "assigned";
  const isStarted = status === "in_progress";
  const isCompleted = status === "submitted" || status === "graded";

  async function handleStart() {
    if (!test) return;
    setStarting(true);
    setFormError("");
    try {
      const started = await startTest(test.id);
      setResult(started);
    } catch (err) {
      setFormError(getErrorText(err, "Не удалось начать тест"));
    } finally {
      setStarting(false);
    }
  }

  function handleChangeAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!test) return;
    const filledAnswers = enabledQuestions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id]?.trim() ?? "",
    }));
    if (filledAnswers.some((a) => !a.answer)) {
      setFormError("Ответьте на все вопросы по навыкам.");
      return;
    }
    if (caseItem && !caseAnswer.trim()) {
      setFormError("Добавьте решение практического кейса.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const submitted = await submitTest(test.id, {
        answers: filledAnswers,
        caseAnswer: caseAnswer.trim() || undefined,
      });
      setResult(submitted);
      setMessage(
        "Задание отправлено. Система оценивает ответы и формирует отчет."
      );
      if (runId) {
        getSkillVerificationsForRun(runId)
          .then(setSkillVerifications)
          .catch(() => {});
        getReportSnapshotForRun(runId).then(setReportSnapshot).catch(() => {});
      }
    } catch (err) {
      setFormError(getErrorText(err, "Не удалось отправить задание"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return <PageHeader title="Загрузка…" lead="Подгружаем задание." />;
  }

  if (loadError) {
    return (
      <>
        <Crumb>
          <Link href="/candidate/dashboard">← Главная</Link>
          {" · "}Задание
        </Crumb>
        <PageHeader eyebrow="Задание" title="Ошибка" lead={loadError} />
      </>
    );
  }

  if (!assessment || !test) {
    return (
      <>
        <Crumb>
          <Link href="/candidate/dashboard">← Главная</Link>
          {" · "}Задание
        </Crumb>
        <PageHeader
          eyebrow="Задание"
          title="Еще не назначено"
          lead="Задание появится здесь, как только будет создано для этой проверки."
          actions={
            <Link href="/candidate/dashboard" className="btn btn-primary">
              На главную →
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <Crumb>
        <Link href="/candidate/dashboard">← Главная</Link>
        {" · "}Задание
      </Crumb>

      <PageHeader
        eyebrow={
          <>
            Задание ·{" "}
            <Status tone={isCompleted ? "good" : isStarted ? "warn" : "muted"}>
              {isCompleted ? "отправлено" : isStarted ? "в процессе" : "не начато"}
            </Status>
          </>
        }
        title={test.title}
        lead={test.instructions}
        actions={
          !isCompleted && !isStarted ? (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={starting}
            >
              {starting ? "Запуск…" : "Начать тест →"}
            </button>
          ) : !isCompleted ? (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Отправка…" : "Отправить задание →"}
            </button>
          ) : (
            <Link href="/candidate/dashboard" className="btn btn-primary">
              На главную →
            </Link>
          )
        }
      />

      <StatGrid>
        <Stat
          value={
            isCompleted ? "отправлено" : isStarted ? "в процессе" : "не начато"
          }
          label="Статус"
        />
        <Stat value={`${test.durationMinutes} мин`} label="Длительность" />
        <Stat
          value={
            result?.score != null ? String(Math.round(result.score)) : "—"
          }
          label="Балл"
        />
      </StatGrid>

      {message && (
        <div
          className="placeholder"
          style={{ borderColor: "var(--ink)", color: "var(--ink)", marginBottom: 32 }}
        >
          {message}
        </div>
      )}

      {formError && (
        <div
          className="placeholder"
          style={{ borderColor: "var(--risk)", color: "var(--risk)", marginBottom: 32 }}
        >
          {formError}
        </div>
      )}

      {!isStarted && !isCompleted && (
        <Section num="00" label="Как проходить">
          <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
            Нажмите «Начать тест», затем ответьте на вопросы по навыкам и
            выполните практический кейс. Ответы опирайте на реальный опыт.
          </div>
        </Section>
      )}

      <Section num="01" label="Часть 1 — Вопросы по навыкам">
        <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
          Ответьте развернуто по каждому навыку.
        </div>
        <div>
          {enabledQuestions.map((question, index) => (
            <div className="entry" key={question.id}>
              <div className="when">
                Q{String(index + 1).padStart(2, "0")}
                <div
                  className="caption"
                  style={{ marginTop: 6, textTransform: "none", fontSize: 11 }}
                >
                  {question.skill}
                </div>
              </div>
              <div className="what">
                <div className="role">{question.text}</div>
                <textarea
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    handleChangeAnswer(question.id, event.target.value)
                  }
                  disabled={!isStarted}
                  rows={4}
                  placeholder={
                    isStarted
                      ? "Напишите развернутый ответ…"
                      : "Начните тест, чтобы отвечать"
                  }
                  className="textarea"
                  style={{ marginTop: 14 }}
                />
              </div>
              <div className="text-right">
                <Status tone={answers[question.id]?.trim() ? "good" : "muted"}>
                  {answers[question.id]?.trim() ? "заполнен" : "пустой"}
                </Status>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {caseItem && (
        <Section num="02" label="Часть 2 — Практический кейс">
          <div className="pull" style={{ marginBottom: 24 }}>
            {caseItem.title}
          </div>
          <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
            {caseItem.prompt}
          </div>

          {caseItem.criteria.length > 0 && (
            <>
              <div className="caption" style={{ marginBottom: 8 }}>
                Критерии оценки
              </div>
              <div
                className="placeholder"
                style={{ marginBottom: 24, fontSize: 14, color: "var(--ink-2)" }}
              >
                {caseItem.criteria.join(" · ")}
              </div>
            </>
          )}

          <div className="field">
            <span className="field-label">Ваше решение</span>
            <textarea
              value={caseAnswer}
              onChange={(event) => setCaseAnswer(event.target.value)}
              disabled={!isStarted}
              rows={10}
              placeholder="Опишите решение или вставьте ссылку на репозиторий, документ или прототип…"
              className="textarea"
            />
          </div>
        </Section>
      )}

      {skillVerifications.length > 0 ? (
        <Section num="03" label="Проверка навыков">
          <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
            Результаты по навыкам из вашего assessment.
          </div>
          <SkillVerificationList items={skillVerifications} />
        </Section>
      ) : (
        result?.skillBreakdown &&
        result.skillBreakdown.length > 0 && (
          <Section num="03" label="Оценка по навыкам">
            <div>
              {result.skillBreakdown.map((item) => (
                <div className="entry" key={item.skill}>
                  <div className="when">{item.skill}</div>
                  <div className="what">
                    <div className="role">{Math.round(item.score)} баллов</div>
                  </div>
                  <div className="text-right">
                    <Status tone="good">{item.level}</Status>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )
      )}

      {isStarted && (
        <Section num={caseItem ? "03" : "02"} label="Отправка">
          <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
            После отправки система оценит ответы и сформирует итоговый отчет.
            Для полной проверки решение проверит HR.
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Отправка…" : "Отправить задание →"}
          </button>
        </Section>
      )}

      {reportSnapshot && (
        <Section num="04" label="Итоговый отчет">
          <ReportSnapshotView snapshot={reportSnapshot} />
        </Section>
      )}

      {isCompleted && !reportSnapshot && (
        <Placeholder>
          Задание отправлено. Итоговый отчет формируется и скоро появится здесь.
        </Placeholder>
      )}
    </>
  );
}
