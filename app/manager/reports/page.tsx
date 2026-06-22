"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addAuditEvent } from "@/lib/api/audit";
import { getCandidates } from "@/lib/api/candidates";
import {
  getManagerDecisions,
  saveManagerDecision,
} from "@/lib/api/managerDecisions";
import { getMyVacancies } from "@/lib/api/vacancies";
import { getCurrentUser } from "@/lib/api/session";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { Candidate } from "@/types/candidate";
import {
  ManagerDecision,
  ManagerDecisionStatus,
} from "@/types/managerDecision";
import { CurrentUser } from "@/types/user";
import { Vacancy } from "@/types/vacancy";
import { formatDate } from "@/lib/utils/date";
import {
  ConfidenceLevel,
  ReportOverallStatus,
  VerificationReport,
} from "@/types/report";
import { FormDropdown } from "@/components/FormDropdown";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Status,
  Placeholder,
} from "@/components/ui/editorial";

const statusLabels: Record<ReportOverallStatus, string> = {
  verified: "подтвержден",
  partially_verified: "частично",
  questionable: "под вопросом",
  insufficient_data: "нет данных",
};

const statusTones: Record<
  ReportOverallStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  verified: "good",
  partially_verified: "good",
  questionable: "warn",
  insufficient_data: "muted",
};

const confidenceLabels: Record<ConfidenceLevel, string> = {
  high: "высокая",
  medium: "средняя",
  low: "низкая",
};

const decisionLabels: Record<ManagerDecisionStatus, string> = {
  continue: "продолжить",
  needs_review: "доп. проверка",
  reject: "отклонить",
};

const decisionTones: Record<
  ManagerDecisionStatus,
  "good" | "warn" | "risk"
> = {
  continue: "good",
  needs_review: "warn",
  reject: "risk",
};

type DecisionDraft = {
  status: ManagerDecisionStatus;
  comment: string;
};

function getReportsFromStorage(): VerificationReport[] {
  if (typeof window === "undefined") {
    return [];
  }
  const savedReportsRaw = localStorage.getItem("wirehire-reports");
  return savedReportsRaw ? JSON.parse(savedReportsRaw) : [];
}

function getAverageScore(report: VerificationReport) {
  const scores = [
    report.experienceScore,
    report.skillsScore,
    report.proctoringScore,
  ].filter((score): score is number => score !== null);

  if (scores.length === 0) {
    return 0;
  }

  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

export default function ManagerReportsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [reports, setReports] = useState<VerificationReport[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [decisions, setDecisions] = useState<ManagerDecision[]>([]);
  const [decisionDrafts, setDecisionDrafts] = useState<
    Record<string, DecisionDraft>
  >({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | ReportOverallStatus
  >("all");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadManagerReports() {
      const user = getCurrentUser();
      const loadedReports = getReportsFromStorage();

      try {
        let fetchError: string | null = null;

        const [loadedCandidates, loadedVacancies, loadedDecisions] =
          await Promise.all([
            getCandidates().catch((err) => {
              fetchError ??= getErrorText(
                err,
                "Не удалось загрузить кандидатов"
              );
              return [];
            }),
            getMyVacancies().catch((err) => {
              fetchError ??= getErrorText(err, "Не удалось загрузить вакансии");
              return [];
            }),
            getManagerDecisions(),
          ]);

        if (cancelled) return;

        setLoadError(fetchError);
        setCurrentUser(user);
        setReports(loadedReports);
        setCandidates(loadedCandidates);
        setVacancies(loadedVacancies);
        setDecisions(loadedDecisions);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          getErrorText(err, "Не удалось загрузить данные для решений")
        );
        setCurrentUser(user);
        setReports(loadedReports);
        setDecisions(await getManagerDecisions().catch(() => []));
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    loadManagerReports();
    return () => {
      cancelled = true;
    };
  }, []);

  function getCandidate(candidateId: string) {
    return candidates.find((candidate) => candidate.id === candidateId);
  }
  function getVacancy(vacancyId: string) {
    return vacancies.find((vacancy) => vacancy.id === vacancyId);
  }
  function getDecision(reportId: string) {
    return decisions.find((decision) => decision.reportId === reportId);
  }
  function getDecisionDraft(report: VerificationReport): DecisionDraft {
    const existingDecision = getDecision(report.id);
    return (
      decisionDrafts[report.id] ?? {
        status: existingDecision?.status ?? "continue",
        comment: existingDecision?.comment ?? "",
      }
    );
  }
  function updateDecisionStatus(
    reportId: string,
    status: ManagerDecisionStatus
  ) {
    setDecisionDrafts((current) => {
      const draft = current[reportId] ?? {
        status: "continue" as ManagerDecisionStatus,
        comment: "",
      };
      return { ...current, [reportId]: { ...draft, status } };
    });
  }
  function updateDecisionComment(reportId: string, comment: string) {
    setDecisionDrafts((current) => {
      const draft = current[reportId] ?? {
        status: "continue" as ManagerDecisionStatus,
        comment: "",
      };
      return { ...current, [reportId]: { ...draft, comment } };
    });
  }

  async function handleSaveDecision(report: VerificationReport) {
    const draft = getDecisionDraft(report);
    const existingDecision = getDecision(report.id);
    const candidate = getCandidate(report.candidateId);
    const vacancy = getVacancy(report.vacancyId);

    if (draft.status === "needs_review" && !draft.comment.trim()) {
      setDecisionError(
        "Для решения «доп. проверка» добавьте комментарий."
      );
      setDecisionMessage("");
      return;
    }

    const newDecision: ManagerDecision = {
      id: existingDecision?.id ?? `decision-${Date.now()}`,
      reportId: report.id,
      verificationRunId: report.verificationRunId,
      candidateId: report.candidateId,
      vacancyId: report.vacancyId,
      status: draft.status,
      comment: draft.comment.trim(),
      decidedBy: currentUser?.id ?? "manager-demo",
      decidedAt: new Date().toLocaleDateString("ru-RU"),
    };

    const savedDecision = await saveManagerDecision(newDecision);
    setDecisions((current) => [
      ...current.filter((d) => d.reportId !== savedDecision.reportId),
      savedDecision,
    ]);

    setDecisionError("");
    setDecisionMessage(
      `Решение сохранено: ${decisionLabels[savedDecision.status]}.`
    );

    addAuditEvent({
      type: "manager_decision_created",
      title: "Менеджер зафиксировал решение",
      description: `Решение по кандидату ${candidate?.fullName ?? report.candidateId} для вакансии ${vacancy?.title ?? report.vacancyId}: ${decisionLabels[savedDecision.status]}.`,
      actorRole: "HR",
      candidateId: report.candidateId,
      candidateName: candidate?.fullName,
      vacancyId: report.vacancyId,
      vacancyTitle: vacancy?.title,
      verificationRunId: report.verificationRunId,
      reportId: report.id,
    });
  }

  const filteredReports = reports.filter((report) => {
    const candidate = getCandidate(report.candidateId);
    const vacancy = getVacancy(report.vacancyId);
    const searchText = search.toLowerCase();

    const matchesSearch =
      !searchText ||
      candidate?.fullName.toLowerCase().includes(searchText) ||
      candidate?.headline.toLowerCase().includes(searchText) ||
      vacancy?.title.toLowerCase().includes(searchText) ||
      vacancy?.companyName.toLowerCase().includes(searchText) ||
      statusLabels[report.overallStatus].toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "all" || report.overallStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const readyReportsCount = reports.filter(
    (r) => r.overallStatus === "verified" || r.overallStatus === "partially_verified"
  ).length;
  const riskyReportsCount = reports.filter(
    (r) => r.overallStatus === "questionable" || r.overallStatus === "insufficient_data"
  ).length;
  const averageScore =
    reports.length === 0
      ? 0
      : Math.round(
          reports.reduce((s, r) => s + getAverageScore(r), 0) / reports.length
        );

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем отчеты" />;
  }

  if (
    currentUser &&
    currentUser.role !== "hiring_manager" &&
    currentUser.role !== "hr" &&
    currentUser.role !== "admin"
  ) {
    return (
      <PageHeader
        eyebrow="Доступ"
        title="Это страница менеджера по найму"
        lead="Отчеты доступны компании"
        actions={
          <Link href="/candidate/dashboard" className="btn btn-primary">
            В кабинет кандидата →
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        wideTitle
        eyebrow="Менеджер"
        title="Решения менеджера"
        lead={`${reports.length} отчетов · ${decisions.length} решений принято · средняя оценка ${averageScore}/100`}
      />

      {loadError && (
        <div
          className="placeholder"
          style={{
            borderColor: "var(--risk)",
            color: "var(--risk)",
            marginBottom: 32,
          }}
        >
          {loadError}
        </div>
      )}

      <StatGrid>
        <Stat value={reports.length} label="Всего отчетов" />
        <Stat value={decisions.length} label="Решений" />
        <Stat value={readyReportsCount} label="Можно рассматривать" />
        <Stat value={riskyReportsCount} label="С рисками" />
      </StatGrid>

      {decisionMessage && (
        <div
          className="placeholder"
          style={{
            borderColor: "var(--ink)",
            color: "var(--ink)",
            marginBottom: 32,
          }}
        >
          {decisionMessage}
        </div>
      )}

      {decisionError && (
        <div
          className="placeholder"
          style={{
            borderColor: "var(--risk)",
            color: "var(--risk)",
            marginBottom: 32,
          }}
        >
          {decisionError}
        </div>
      )}

      <Section num="01" label="Фильтры">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="input search"
          placeholder="Кандидат, вакансия, статус…"
        />
        <div
          className="filters"
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span className="caption">Статус:</span>
          <FormDropdown
            value={statusFilter}
            onChange={(v) =>
              setStatusFilter(v as "all" | ReportOverallStatus)
            }
            options={[
              { value: "all", label: "Все" },
              { value: "verified", label: "Подтвержден" },
              { value: "partially_verified", label: "Частично" },
              { value: "questionable", label: "Под вопросом" },
              { value: "insufficient_data", label: "Нет данных" },
            ]}
            placeholder="Все"
            inactiveValue="all"
            hideClearOption
            className="form-dropdown--filter"
          />
        </div>
        <div className="caption" style={{ marginTop: 24 }}>
          Найдено · {filteredReports.length} из {reports.length}
        </div>
      </Section>

      <Section num="02" label="Отчеты для решения">
        {filteredReports.length === 0 ? (
          <Placeholder>
            Отчетов пока нет — они появятся после прохождения кандидатом проверки и генерации отчета
          </Placeholder>
        ) : (
          <div>
            {filteredReports.map((report) => {
              const candidate = getCandidate(report.candidateId);
              const vacancy = getVacancy(report.vacancyId);
              const score = getAverageScore(report);
              const existingDecision = getDecision(report.id);
              const draft = getDecisionDraft(report);

              return (
                <div className="entry" key={report.id}>
                  <div className="when">
                    {report.generatedAt.split(",")[0] ?? report.generatedAt}
                    <div
                      className="caption"
                      style={{ marginTop: 6, textTransform: "none", fontSize: 11 }}
                    >
                      v{report.version}
                    </div>
                  </div>
                  <div className="what">
                    <div className="role">
                      {candidate?.fullName ?? "Кандидат"}
                    </div>
                    <div className="co">
                      {vacancy?.title ?? "—"} · {vacancy?.companyName ?? ""}
                    </div>
                    <div className="scope">{report.summary}</div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        gap: 24,
                        flexWrap: "wrap",
                      }}
                    >
                      <div className="caption">
                        итог · <span className="mono">{score}/100</span>
                      </div>
                      <div className="caption">
                        опыт · <span className="mono">{report.experienceScore}</span>
                      </div>
                      <div className="caption">
                        навыки · <span className="mono">{report.skillsScore}</span>
                      </div>
                      <div className="caption">
                        прокторинг ·{" "}
                        <span className="mono">
                          {report.proctoringScore === null
                            ? "—"
                            : report.proctoringScore}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 24 }}>
                      <div className="caption" style={{ marginBottom: 12 }}>
                        Решение
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 14,
                        }}
                      >
                        {(["continue", "needs_review", "reject"] as const).map(
                          (status) => (
                            <button
                              key={status}
                              className={
                                draft.status === status
                                  ? "btn btn-primary btn-sm"
                                  : "btn btn-sm"
                              }
                              onClick={() =>
                                updateDecisionStatus(report.id, status)
                              }
                              type="button"
                            >
                              {decisionLabels[status]}
                            </button>
                          )
                        )}
                      </div>
                      <textarea
                        value={draft.comment}
                        onChange={(event) =>
                          updateDecisionComment(report.id, event.target.value)
                        }
                        rows={3}
                        className="textarea"
                        placeholder="Комментарий менеджера: почему такое решение, что проверить дальше, какие риски важны…"
                      />
                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSaveDecision(report)}
                        >
                          Сохранить решение →
                        </button>
                        {existingDecision && (
                          <span className="caption">
                            сохранено · {formatDate(existingDecision.decidedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Status tone={statusTones[report.overallStatus]}>
                      {statusLabels[report.overallStatus]}
                    </Status>
                    <div className="caption" style={{ marginTop: 8 }}>
                      confidence · {confidenceLabels[report.confidenceLevel]}
                    </div>
                    {existingDecision && (
                      <div style={{ marginTop: 16 }}>
                        <Status
                          tone={decisionTones[existingDecision.status]}
                        >
                          {decisionLabels[existingDecision.status]}
                        </Status>
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: 24,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        alignItems: "flex-end",
                      }}
                    >
                      <Link
                        href={`/candidates/${report.candidateId}/report`}
                        className="btn-link mono"
                        style={{ fontSize: 11 }}
                      >
                        отчет →
                      </Link>
                      <Link
                        href={`/assessment-results/${report.verificationRunId}`}
                        className="btn-link mono"
                        style={{ fontSize: 11 }}
                      >
                        ответы →
                      </Link>
                      <Link
                        href={`/verification/${report.verificationRunId}`}
                        className="btn-link mono"
                        style={{ fontSize: 11 }}
                      >
                        проверка →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
