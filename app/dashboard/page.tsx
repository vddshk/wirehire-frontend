"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CompanyModerationNotice } from "@/components/CompanyModerationNotice";
import { EmptyState, PageHeader, Status } from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getMyVacancies } from "@/lib/api/vacancies";
import { getApplicationsForVacancy } from "@/lib/api/applications";
import { getVerificationRunsForVacancy } from "@/lib/api/verification";
import { getCandidates } from "@/lib/api/candidates";
import {
  APPLICATION_STATUS_LABEL,
  Application,
  ApplicationStatus,
} from "@/types/application";
import { Vacancy } from "@/types/vacancy";
import { VerificationRun } from "@/types/verification";
import { formatDate } from "@/lib/utils/date";
import {
  VERIFICATION_SCOPE_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@/lib/utils/verification";

const CLOSED_APPLICATION_STATUSES: ApplicationStatus[] = [
  "hired",
  "rejected",
  "withdrawn",
  "archived",
];

export default function DashboardPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [verificationRuns, setVerificationRuns] = useState<VerificationRun[]>(
    []
  );
  const [candidatesCount, setCandidatesCount] = useState(0);
  const [todayLabel, setTodayLabel] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setTodayLabel(new Date().toLocaleDateString("ru-RU"));

      try {
        const myVacancies = await getMyVacancies();
        if (cancelled) return;
        setVacancies(myVacancies);
        const [appsByVacancy, runsByVacancy] = await Promise.all([
          Promise.all(
            myVacancies.map((v) =>
              getApplicationsForVacancy(v.id).catch(() => [])
            )
          ),
          Promise.all(
            myVacancies.map((v) =>
              getVerificationRunsForVacancy(v.id).catch(() => [])
            )
          ),
        ]);
        if (cancelled) return;
        setApplications(appsByVacancy.flat());
        setVerificationRuns(runsByVacancy.flat());
      } catch {
        // оставляем пусто
      }

      try {
        const cands = await getCandidates();
        if (!cancelled) setCandidatesCount(cands.length);
      } catch {
        // не критично
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedVacancies = useMemo(
    () => vacancies.filter((vacancy) => vacancy.status === "published"),
    [vacancies]
  );

  const activeApplications = useMemo(
    () =>
      applications.filter(
        (application) =>
          !CLOSED_APPLICATION_STATUSES.includes(application.status)
      ),
    [applications]
  );

  const activeVerificationRuns = verificationRuns.filter(
    (run) => run.status === "active"
  ).length;

  const waitingConsentRuns = verificationRuns.filter(
    (run) => run.status === "waiting_consent"
  ).length;

  const completedVerificationRuns = verificationRuns.filter(
    (run) => run.status === "completed"
  ).length;

  const latestApplications = useMemo(
    () =>
      [...activeApplications]
        .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1))
        .slice(0, 5),
    [activeApplications]
  );

  const latestVerificationRuns = verificationRuns.slice(-5).reverse();

  const applicationsByVacancy = useMemo(() => {
    const counts = new Map<string, number>();
    for (const application of activeApplications) {
      counts.set(
        application.vacancyId,
        (counts.get(application.vacancyId) ?? 0) + 1
      );
    }
    return counts;
  }, [activeApplications]);

  function getVacancyTitle(vacancyId: string) {
    return (
      vacancies.find((vacancy) => vacancy.id === vacancyId)?.title ??
      "Вакансия"
    );
  }

  function runCandidateName(run: VerificationRun): string {
    return run.candidateName || "Кандидат";
  }

  if (!isLoaded) {
    return (
      <div className="hr-dashboard">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="hr-dashboard" data-screen-label="HR · Dashboard">
      <PageHeader
        eyebrow={todayLabel}
        title="Рабочая панель"
        lead={`${publishedVacancies.length} вакансий · ${activeApplications.length} в воронке · ${verificationRuns.length} проверок`}
        actions={
          <>
            <Link href="/candidates" className="btn">
              Кандидаты
            </Link>
            <Link href="/vacancies" className="btn btn-primary">
              Создать вакансию →
            </Link>
          </>
        }
      />

      <CompanyModerationNotice />

      <div className="hr-dashboard__shortcuts">
        <Link href="/applications" className="hr-dashboard-shortcut">
          <span className="hr-dashboard-shortcut__val">
            {activeApplications.length}
          </span>
          <span className="hr-dashboard-shortcut__label">Воронка</span>
          <span className="hr-dashboard-shortcut__hint">отклики в работе</span>
        </Link>
        <Link href="/candidates" className="hr-dashboard-shortcut">
          <span className="hr-dashboard-shortcut__val">{candidatesCount}</span>
          <span className="hr-dashboard-shortcut__label">Кандидаты</span>
          <span className="hr-dashboard-shortcut__hint">в базе</span>
        </Link>
        <Link href="/vacancies" className="hr-dashboard-shortcut">
          <span className="hr-dashboard-shortcut__val">
            {publishedVacancies.length}
          </span>
          <span className="hr-dashboard-shortcut__label">Вакансии</span>
          <span className="hr-dashboard-shortcut__hint">опубликовано</span>
        </Link>
        <Link href="/verification" className="hr-dashboard-shortcut">
          <span className="hr-dashboard-shortcut__val">
            {activeVerificationRuns}
          </span>
          <span className="hr-dashboard-shortcut__label">Проверки</span>
          <span className="hr-dashboard-shortcut__hint">в процессе</span>
        </Link>
      </div>

      <div className="hr-dashboard__grid">
        <section className="hr-dashboard-panel">
          <header className="hr-dashboard-panel__head">
            <h2 className="hr-dashboard-panel__title">Последние отклики</h2>
            <Link href="/applications" className="btn-link mono">
              воронка →
            </Link>
          </header>
          {latestApplications.length === 0 ? (
            <EmptyState
              title="Пока нет активных откликов"
              description="Пригласите кандидата из базы или дождитесь отклика на опубликованную вакансию."
              action={
                <>
                  <Link href="/candidates" className="btn btn-primary">
                    Кандидаты →
                  </Link>
                  <Link href="/vacancies" className="btn">
                    Вакансии
                  </Link>
                </>
              }
            />
          ) : (
            <ul className="hr-dashboard-feed">
              {latestApplications.map((application) => (
                <li key={application.id} className="hr-dashboard-feed__item">
                  <Link
                    href={`/candidates/${application.candidateId}`}
                    className="hr-dashboard-feed__title"
                  >
                    {application.candidateName ??
                      `Кандидат ${application.candidateId}`}
                  </Link>
                  <span className="hr-dashboard-feed__meta">
                    {getVacancyTitle(application.vacancyId)} ·{" "}
                    {APPLICATION_STATUS_LABEL[application.status]}
                  </span>
                  <span className="hr-dashboard-feed__date">
                    {formatDate(application.appliedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hr-dashboard-panel">
          <header className="hr-dashboard-panel__head">
            <h2 className="hr-dashboard-panel__title">Вакансии</h2>
            <Link href="/vacancies" className="btn-link mono">
              все →
            </Link>
          </header>
          {publishedVacancies.length === 0 ? (
            <EmptyState
              title="Нет опубликованных вакансий"
              description="Создайте и опубликуйте первую вакансию — отклики появятся здесь и в воронке."
              action={
                <Link href="/vacancies" className="btn btn-primary">
                  Создать вакансию →
                </Link>
              }
            />
          ) : (
            <ul className="hr-dashboard-feed">
              {publishedVacancies.slice(0, 5).map((vacancy) => (
                <li key={vacancy.id} className="hr-dashboard-feed__item">
                  <Link
                    href={`/applications?vacancy=${vacancy.id}`}
                    className="hr-dashboard-feed__title"
                  >
                    {vacancy.title}
                  </Link>
                  <span className="hr-dashboard-feed__meta">
                    {vacancy.companyName}
                  </span>
                  <span className="hr-dashboard-feed__badge">
                    {applicationsByVacancy.get(vacancy.id) ?? 0} в воронке
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="hr-dashboard__bottom">
        <section className="hr-dashboard-panel">
          <header className="hr-dashboard-panel__head">
            <div>
              <h2 className="hr-dashboard-panel__title">Проверки</h2>
              {verificationRuns.length > 0 && (
                <p className="hr-dashboard-panel__sub">
                  {activeVerificationRuns} активных · {waitingConsentRuns} ждут
                  согласия · {completedVerificationRuns} завершено
                </p>
              )}
            </div>
            <Link href="/verification" className="btn-link mono">
              все →
            </Link>
          </header>
          {latestVerificationRuns.length === 0 ? (
            <p className="hr-dashboard-panel__empty">
              Запустите проверку из карточки кандидата или вакансии.
            </p>
          ) : (
            <ul className="hr-dashboard-feed">
              {latestVerificationRuns.map((run) => (
                <li key={run.id} className="hr-dashboard-feed__item">
                  <Link
                    href={`/verification/${run.id}`}
                    className="hr-dashboard-feed__title"
                  >
                    {runCandidateName(run)}
                  </Link>
                  <span className="hr-dashboard-feed__meta">
                    {run.vacancyId
                      ? getVacancyTitle(run.vacancyId)
                      : "—"}{" "}
                    · {VERIFICATION_SCOPE_LABELS[run.scope]}
                  </span>
                  <Status
                    tone={run.status === "active" ? "good" : "muted"}
                  >
                    {VERIFICATION_STATUS_LABELS[run.status]}
                  </Status>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hr-dashboard-panel">
          <header className="hr-dashboard-panel__head">
            <h2 className="hr-dashboard-panel__title">Отчет профиля</h2>
            <Link href="/candidates" className="btn-link mono">
              к кандидатам →
            </Link>
          </header>
          <p className="hr-dashboard-panel__empty">
            Отчет профиля открывается из карточки кандидата или воронки — после
            заполнения профиля, референсов и AI-оценки.
          </p>
        </section>
      </div>
    </div>
  );
}
