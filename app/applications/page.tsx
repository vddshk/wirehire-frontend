"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { addAuditEvent } from "@/lib/api/audit";
import {
  getApplications,
  getApplicationsForVacancy,
  updateApplicationStatus,
} from "@/lib/api/applications";
import { getCandidates } from "@/lib/api/candidates";
import { getMyVacancies, getVacancies } from "@/lib/api/vacancies";
import { getCurrentUser } from "@/lib/api/session";
import {
  APPLICATION_STATUS_LABEL,
  Application,
  ApplicationStatus,
  COLUMN_ENTRY_STATUS,
  PIPELINE_COLUMNS,
  PIPELINE_COLUMN_BY_STATUS,
  PIPELINE_COLUMN_LABEL,
  PipelineColumn,
} from "@/types/application";
import { Candidate } from "@/types/candidate";
import { CurrentUser } from "@/types/user";
import { Vacancy } from "@/types/vacancy";
import { formatVacancyLocation } from "@/lib/utils/vacancy";
import { PageHeader, Status } from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const CLOSED_STATUSES: ApplicationStatus[] = [
  "hired",
  "rejected",
  "withdrawn",
  "archived",
];

const SOURCE_LABELS: Record<Application["source"], string> = {
  job_apply: "отклик",
  invited: "приглашение",
  manual: "вручную",
};

function trustScoreFor(candidate: Candidate | undefined): number {
  if (!candidate) return 0;
  const verifiedExperience = candidate.experience.filter(
    (exp) => exp.status === "verified" || exp.status === "partially_verified"
  ).length;
  const base = (() => {
    switch (candidate.verificationStatus) {
      case "verified":
        return 88;
      case "pending":
        return 70;
      case "questionable":
        return 55;
      default:
        return 60;
    }
  })();
  return Math.min(100, base + verifiedExperience * 2);
}

function isVerificationInProgress(candidate: Candidate | undefined): boolean {
  if (!candidate) return false;
  return candidate.profileStatus !== "admitted";
}

function displayCandidateName(
  application: Application,
  candidate: Candidate | undefined
): string {
  return (
    candidate?.fullName ??
    application.candidateName ??
    `Кандидат ${application.candidateId}`
  );
}

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const vacancyFromUrl = searchParams.get("vacancy");

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(
    null
  );
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<PipelineColumn | null>(null);

  useEffect(() => {
    async function load() {
      const user = getCurrentUser();
      setCurrentUser(user);

      const isCompany =
        user?.role === "hr" ||
        user?.role === "hiring_manager" ||
        user?.role === "admin";

      if (isCompany) {
        try {
          const myVacancies = await getMyVacancies();
          const perVacancy = await Promise.all(
            myVacancies.map((v) =>
              getApplicationsForVacancy(v.id).catch(() => [])
            )
          );
          const allApps = perVacancy.flat();
          const loadedCandidates = await getCandidates().catch(() => []);
          setApplications(allApps);
          setVacancies(myVacancies);
          setCandidates(loadedCandidates);
          setIsLoaded(true);
          return;
        } catch {
          // fallback ниже
        }
      }

      const [loadedApps, loadedCandidates, loadedVacancies] = await Promise.all(
        [getApplications(), getCandidates(), getVacancies()]
      );
      setApplications(loadedApps);
      setCandidates(loadedCandidates);
      setVacancies(loadedVacancies);
      setIsLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!vacancyFromUrl || !isLoaded) return;
    const exists = vacancies.some(
      (vacancy) =>
        vacancy.id === vacancyFromUrl && vacancy.status === "published"
    );
    if (exists) setSelectedVacancyId(vacancyFromUrl);
  }, [vacancyFromUrl, vacancies, isLoaded]);

  const publishedVacancies = useMemo(
    () => vacancies.filter((vacancy) => vacancy.status === "published"),
    [vacancies]
  );

  const selectedVacancy = useMemo(
    () =>
      selectedVacancyId
        ? vacancies.find((vacancy) => vacancy.id === selectedVacancyId) ?? null
        : null,
    [selectedVacancyId, vacancies]
  );

  const filteredApplications = useMemo(() => {
    if (!selectedVacancyId) return [];
    return applications.filter((app) => app.vacancyId === selectedVacancyId);
  }, [applications, selectedVacancyId]);

  const applicationsByColumn = useMemo(() => {
    const grouped: Record<PipelineColumn, Application[]> = {
      new: [],
      screening: [],
      interview: [],
      case: [],
      offer: [],
    };
    for (const app of filteredApplications) {
      if (CLOSED_STATUSES.includes(app.status)) continue;
      const column = PIPELINE_COLUMN_BY_STATUS[app.status];
      if (column === "closed") continue;
      grouped[column].push(app);
    }
    return grouped;
  }, [filteredApplications]);

  const closedApplications = useMemo(
    () =>
      filteredApplications.filter((app) =>
        CLOSED_STATUSES.includes(app.status)
      ),
    [filteredApplications]
  );

  const activeCount = PIPELINE_COLUMNS.reduce(
    (sum, column) => sum + applicationsByColumn[column].length,
    0
  );

  const vacancyPipelineCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vacancy of publishedVacancies) {
      const count = applications.filter(
        (app) =>
          app.vacancyId === vacancy.id &&
          !CLOSED_STATUSES.includes(app.status)
      ).length;
      counts.set(vacancy.id, count);
    }
    return counts;
  }, [applications, publishedVacancies]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (
    currentUser &&
    currentUser.role !== "hr" &&
    currentUser.role !== "hiring_manager" &&
    currentUser.role !== "admin"
  ) {
    return (
      <PageHeader
        eyebrow="Доступ"
        title="Воронка доступна работодателю"
        lead="Страница доступна только компании"
        actions={
          <Link href="/dashboard" className="btn btn-primary">
            К дашборду →
          </Link>
        }
      />
    );
  }

  function getCandidate(application: Application): Candidate | undefined {
    return candidates.find((c) => c.id === application.candidateId);
  }

  async function moveApplicationToColumn(
    application: Application,
    column: PipelineColumn
  ) {
    const currentColumn = PIPELINE_COLUMN_BY_STATUS[application.status];
    if (currentColumn === column) return;

    const targetStatus = COLUMN_ENTRY_STATUS[column];
    const updated = await updateApplicationStatus(
      application.id,
      targetStatus
    );
    if (!updated) return;
    setApplications((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    addAuditEvent({
      type: "application_moved",
      title: "Отклик переведен по пайплайну",
      description: `Кандидат ${displayCandidateName(application, getCandidate(application))} → ${PIPELINE_COLUMN_LABEL[column]}.`,
      actorRole: "HR",
      candidateId: application.candidateId,
      candidateName: getCandidate(application)?.fullName,
      vacancyId: application.vacancyId,
      vacancyTitle: selectedVacancy?.title,
    });
  }

  async function rejectApplication(application: Application) {
    const updated = await updateApplicationStatus(application.id, "rejected");
    if (!updated) return;
    setApplications((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    addAuditEvent({
      type: "application_rejected",
      title: "Отклик отклонен",
      description: `Кандидат ${displayCandidateName(application, getCandidate(application))} отклонен.`,
      actorRole: "HR",
      candidateId: application.candidateId,
      candidateName: getCandidate(application)?.fullName,
      vacancyId: application.vacancyId,
      vacancyTitle: selectedVacancy?.title,
    });
  }

  async function restoreApplication(application: Application) {
    const updated = await updateApplicationStatus(application.id, "reviewed");
    if (!updated) return;
    setApplications((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    addAuditEvent({
      type: "application_moved",
      title: "Отклик возвращен в пайплайн",
      description: `Кандидат ${displayCandidateName(application, getCandidate(application))} возвращен в «Новые».`,
      actorRole: "HR",
      candidateId: application.candidateId,
      candidateName: getCandidate(application)?.fullName,
      vacancyId: application.vacancyId,
      vacancyTitle: selectedVacancy?.title,
    });
    if (closedApplications.length <= 1) {
      setIsClosedModalOpen(false);
    }
  }

  function handleDragStart(event: React.DragEvent, applicationId: string) {
    event.dataTransfer.setData("application/id", applicationId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(applicationId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropColumn(null);
  }

  function handleDragOver(event: React.DragEvent, column: PipelineColumn) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropColumn(column);
  }

  function handleDrop(event: React.DragEvent, column: PipelineColumn) {
    event.preventDefault();
    const applicationId = event.dataTransfer.getData("application/id");
    const application = applications.find((app) => app.id === applicationId);
    if (application) {
      void moveApplicationToColumn(application, column);
    }
    setDraggingId(null);
    setDropColumn(null);
  }

  return (
    <div data-screen-label="HR · Воронка">
      <PageHeader
        eyebrow="Воронка вакансий"
        title={selectedVacancy ? selectedVacancy.title : "Воронка"}
        lead={
          selectedVacancy
            ? `${activeCount} кандидатов в работе · ${closedApplications.length} закрытых · ${formatVacancyLocation(selectedVacancy)}`
            : "Выберите вакансию — откроется пайплайн с приглашенными и откликнувшимися кандидатами"
        }
        actions={
          <>
            {selectedVacancy ? (
              <button
                type="button"
                className="btn"
                onClick={() => setSelectedVacancyId(null)}
              >
                ← Все вакансии
              </button>
            ) : (
              <Link href="/candidates" className="btn">
                Пригласить из базы
              </Link>
            )}
            {selectedVacancy && (
              <Link
                href={`/vacancies/${selectedVacancy.id}`}
                className="btn btn-primary"
              >
                Карточка вакансии →
              </Link>
            )}
          </>
        }
      />

      {!selectedVacancy ? (
        <div className="pipeline-vacancies">
          {publishedVacancies.length === 0 ? (
            <div className="pipeline-vacancies__empty">
              <p className="pipeline-vacancies__empty-title">
                Нет опубликованных вакансий
              </p>
              <p className="pipeline-vacancies__empty-desc">
                Опубликуйте вакансию — затем сюда попадут приглашенные и
                откликнувшиеся кандидаты.
              </p>
              <Link href="/vacancies" className="btn btn-primary">
                К вакансиям →
              </Link>
            </div>
          ) : (
            publishedVacancies.map((vacancy) => {
              const count = vacancyPipelineCounts.get(vacancy.id) ?? 0;
              return (
                <button
                  key={vacancy.id}
                  type="button"
                  className="pipeline-vacancy-card"
                  onClick={() => setSelectedVacancyId(vacancy.id)}
                >
                  <div className="pipeline-vacancy-card__head">
                    <h3 className="pipeline-vacancy-card__title">
                      {vacancy.title}
                    </h3>
                    <span className="pipeline-vacancy-card__count">
                      {count}
                    </span>
                  </div>
                  <p className="pipeline-vacancy-card__meta">
                    {vacancy.companyName} · {formatVacancyLocation(vacancy)}
                  </p>
                  <p className="pipeline-vacancy-card__hint">
                    {count === 0
                      ? "Пока никого — пригласите из базы"
                      : `${count} в пайплайне`}
                  </p>
                </button>
              );
            })
          )}
        </div>
      ) : (
        <>
          <p className="pipeline-board-hint">
            Перетащите карточку в нужную колонку — статус обновится
            автоматически.
          </p>

          <div className="pipeline-board">
            {PIPELINE_COLUMNS.map((column) => {
              const apps = applicationsByColumn[column];
              const isDropTarget = dropColumn === column;

              return (
                <div
                  key={column}
                  className={`pipeline-col${isDropTarget ? " is-drop-target" : ""}`}
                  onDragOver={(event) => handleDragOver(event, column)}
                  onDragLeave={() => setDropColumn(null)}
                  onDrop={(event) => handleDrop(event, column)}
                >
                  <header className="pipeline-col__head">
                    <span className="pipeline-col__label">
                      {PIPELINE_COLUMN_LABEL[column]}
                    </span>
                    <span className="pipeline-col__count">{apps.length}</span>
                  </header>

                  <div className="pipeline-col__body">
                    {apps.length === 0 ? (
                      <div className="pipeline-col__empty">
                        Перетащите сюда
                      </div>
                    ) : (
                      apps.map((application) => {
                        const candidate = getCandidate(application);
                        const trust = trustScoreFor(candidate);
                        const reportReady =
                          application.hasProfileReport ??
                          candidate?.hasProfileReport;
                        const inVerification =
                          isVerificationInProgress(candidate);
                        const isDragging = draggingId === application.id;

                        const experienceVerified =
                          candidate?.verificationStatus === "verified";

                        return (
                          <article
                            key={application.id}
                            className={`pipeline-card${isDragging ? " is-dragging" : ""}`}
                            draggable
                            onDragStart={(event) =>
                              handleDragStart(event, application.id)
                            }
                            onDragEnd={handleDragEnd}
                          >
                            <span
                              className={`pipeline-card__eyebrow pipeline-card__eyebrow--${application.source}`}
                            >
                              {SOURCE_LABELS[application.source]}
                            </span>

                            <Link
                              href={`/candidates/${application.candidateId}`}
                              className="pipeline-card__name"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {displayCandidateName(application, candidate)}
                            </Link>

                            {candidate?.headline && (
                              <p className="pipeline-card__headline">
                                {candidate.headline}
                              </p>
                            )}

                            <div className="pipeline-card__signals">
                              <span className="pipeline-card__signal">
                                <strong>{trust}</strong>
                                <span>доверие</span>
                              </span>
                              <span className="pipeline-card__signal">
                                <strong>
                                  {experienceVerified ? "✓" : "—"}
                                </strong>
                                <span>опыт</span>
                              </span>
                            </div>

                            {inVerification && (
                              <div className="pipeline-card__flag">
                                <Status tone="warn" dot>
                                  верификация
                                </Status>
                              </div>
                            )}

                            <div className="pipeline-card__foot">
                              <Link
                                href={`/candidates/${application.candidateId}`}
                                className="pipeline-card__open"
                                onClick={(event) => event.stopPropagation()}
                              >
                                открыть →
                              </Link>
                              {(reportReady === undefined || reportReady) && (
                                <Link
                                  href={`/candidates/${application.candidateId}/report`}
                                  className={`pipeline-card__open${reportReady ? "" : " pipeline-card__open--muted"}`}
                                  onClick={(event) => event.stopPropagation()}
                                  title={
                                    reportReady
                                      ? "Отчет профиля готов"
                                      : "Отчет еще формируется"
                                  }
                                >
                                  {reportReady ? "отчет →" : "отчет…"}
                                </Link>
                              )}
                              <button
                                type="button"
                                className="pipeline-card__reject"
                                onMouseDown={(event) =>
                                  event.stopPropagation()
                                }
                                onClick={() => rejectApplication(application)}
                                title="Отклонить кандидата"
                              >
                                отклонить
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {closedApplications.length > 0 && (
            <div className="pipeline-closed-link">
              <button
                type="button"
                className="btn-link mono"
                onClick={() => setIsClosedModalOpen(true)}
                style={{ fontSize: 12 }}
              >
                закрытые ({closedApplications.length}) →
              </button>
            </div>
          )}
        </>
      )}

      {isClosedModalOpen && closedApplications.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsClosedModalOpen(false);
            }
          }}
        >
          <div
            className="overlay-sheet"
            style={{
              width: "100%",
              maxWidth: 920,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 48,
            }}
          >
            <div
              className="between"
              style={{
                marginBottom: 24,
                paddingBottom: 20,
                borderBottom: "1px solid var(--ink)",
              }}
            >
              <div>
                <div className="eyebrow">Закрытые отклики</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: "-0.018em",
                    marginTop: 6,
                  }}
                >
                  {closedApplications.length} закрытых
                  {selectedVacancy ? ` · ${selectedVacancy.title}` : ""}
                </div>
              </div>
              <button
                type="button"
                className="btn-link mono"
                onClick={() => setIsClosedModalOpen(false)}
                style={{ fontSize: 12 }}
              >
                закрыть ×
              </button>
            </div>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Кандидат</th>
                    <th>Источник</th>
                    <th>Статус</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {closedApplications.map((application) => {
                    const candidate = getCandidate(application);
                    const tone: "good" | "warn" | "muted" | "risk" =
                      application.status === "hired"
                        ? "good"
                        : application.status === "rejected"
                          ? "risk"
                          : "muted";
                    return (
                      <tr key={application.id}>
                        <td data-label="Кандидат">
                          <Link
                            href={`/candidates/${application.candidateId}`}
                          >
                            {displayCandidateName(application, candidate)}
                          </Link>
                        </td>
                        <td data-label="Источник" className="mobile-hide">
                          {SOURCE_LABELS[application.source]}
                        </td>
                        <td data-label="Статус" className="status-cell">
                          <Status tone={tone}>
                            {APPLICATION_STATUS_LABEL[application.status]}
                          </Status>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-link mono"
                            onClick={() => restoreApplication(application)}
                            style={{ fontSize: 12 }}
                          >
                            вернуть →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
