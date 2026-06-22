"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/session";
import { getCandidateById } from "@/lib/api/candidates";
import {
  createApplication,
  getApplicationsByCandidateId,
  withdrawMyApplication,
} from "@/lib/api/applications";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { getVacancyById } from "@/lib/api/vacancies";
import { addAuditEvent } from "@/lib/api/audit";
import { formatDate } from "@/lib/utils/date";
import { Application } from "@/types/application";
import { Candidate } from "@/types/candidate";
import { CurrentUser } from "@/types/user";
import { Vacancy } from "@/types/vacancy";
import { PageHeader, Placeholder } from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useToast } from "@/components/ui/Toast";
import {
  EMPLOYMENT_TYPE_LABELS as employmentTypeLabels,
  SENIORITY_LABELS as seniorityLabels,
  WORK_FORMAT_LABELS as workFormatLabels,
  formatVacancyLocation as getVacancyLocation,
} from "@/lib/utils/vacancy";

export default function JobDetailsPage() {
  const params = useParams();
  const vacancyId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [candidateApplications, setCandidateApplications] = useState<
    Application[]
  >([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applyConsent, setApplyConsent] = useState(false);
  const [applyError, setApplyError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    async function loadPageData() {
      if (!vacancyId) {
        setIsLoaded(true);
        return;
      }

      const user = getCurrentUser();
      const candidateId = user.candidateId ?? `candidate-${user.id}`;
      const userIsCandidate = user.role === "candidate";

      // applications грузим только для роли candidate — иначе бэк отдает 403.
      const [loadedCandidate, loadedVacancy, applications] = await Promise.all([
        userIsCandidate ? getCandidateById(candidateId) : Promise.resolve(null),
        getVacancyById(vacancyId),
        userIsCandidate
          ? getApplicationsByCandidateId(candidateId).catch(() => [])
          : Promise.resolve([]),
      ]);

      setCurrentUser(user);
      setCandidate(loadedCandidate);
      setVacancy(loadedVacancy);
      setCandidateApplications(applications);
      setIsLoaded(true);
    }

    loadPageData();
  }, [vacancyId]);

  if (!isLoaded) {
    return <PageSkeleton variant="compact" />;
  }

  if (!vacancy) {
    return (
      <>
        <PageHeader
          eyebrow="Не найдено"
          title="Вакансия не найдена"
          lead="Возможно, вакансия была удалена или еще не опубликована"
          actions={
            <Link href="/jobs" className="btn btn-primary">
              Вернуться к вакансиям →
            </Link>
          }
        />
      </>
    );
  }

  const existingApplication = candidateApplications.find(
    (application) =>
      application.vacancyId === vacancy.id && application.status !== "rejected"
  );

  const profileReady =
    Boolean(candidate) &&
    Boolean(candidate?.headline) &&
    Boolean(candidate?.summary) &&
    Boolean(candidate?.skills.length);

  // Откликаться может только пользователь с ролью candidate.
  // HR / hiring_manager не могут — бэк отвечает 403.
  const isCandidate = currentUser?.role === "candidate";

  async function handleWithdraw() {
    if (!existingApplication) return;
    setWithdrawBusy(true);
    setError("");
    try {
      await withdrawMyApplication(existingApplication.id);
      // Убираем отклик из локального состояния, чтобы снова можно было откликнуться.
      setCandidateApplications((prev) =>
        prev.filter((a) => a.id !== existingApplication.id)
      );
      showToast("Отклик отозван. Можно отправить заново.");
    } catch (err) {
      setError(getErrorText(err, "Не удалось отозвать отклик"));
    } finally {
      setWithdrawBusy(false);
    }
  }

  function openApplyModal() {
    if (!currentUser) return;
    if (!vacancy) {
      setError("Вакансия не найдена");
      return;
    }
    if (!candidate) {
      setError("Сохраните профиль кандидата");
      return;
    }
    if (!profileReady) {
      setError(
        "Профиль заполнен не полностью"
      );
      return;
    }
    if (existingApplication) {
      setError("Вы уже откликнулись на эту вакансию");
      return;
    }
    setApplyError("");
    setCoverLetter("");
    setApplyConsent(false);
    setIsApplyModalOpen(true);
  }

  async function submitApplication() {
    if (!candidate || !vacancy) return;
    if (!applyConsent) {
      setApplyError(
        "Подтвердите согласие на передачу профиля компании — без него отклик не отправится"
      );
      return;
    }

    const newApplication = await createApplication({
      candidateId: candidate.id,
      vacancyId: vacancy.id,
      source: "job_apply",
      ownerName: "HR Анна",
    });

    setCandidateApplications((prev) => [...prev, newApplication]);
    setIsApplyModalOpen(false);
    setError("");
    setApplyError("");
    showToast("Отклик отправлен");

    addAuditEvent({
      type: "application_created",
      title: "Кандидат откликнулся на вакансию",
      description: `${candidate.fullName} откликнулся на вакансию ${vacancy.title}.${coverLetter.trim() ? "" : ""}`,
      actorRole: "Candidate",
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      vacancyId: vacancy.id,
      vacancyTitle: vacancy.title,
    });
  }

  const canApply =
    isCandidate &&
    Boolean(candidate) &&
    profileReady &&
    !existingApplication;

  return (
    <>
      <PageHeader
        eyebrow={vacancy.companyName}
        title={vacancy.title}
        lead={`${getVacancyLocation(vacancy)} · ${seniorityLabels[vacancy.seniority]} · ${employmentTypeLabels[vacancy.employmentType]} · ${workFormatLabels[vacancy.workFormat]} · ${vacancy.salaryRange}`}
      />

      <div className="job-detail">
        <article className="job-detail__main">
          <header className="job-detail__section-head">
            <div className="caption">
              <span className="mono" style={{ marginRight: 12 }}>
                01
              </span>
              Описание
            </div>
          </header>

          <div className="job-prose">{vacancy.description}</div>

          <div className="job-detail__skills">
            <div className="caption" style={{ marginBottom: 16 }}>
              Ключевые навыки
            </div>
            <div className="chips" style={{ gap: "0 16px" }}>
              {vacancy.skills.map((skill) => (
                <span key={skill} className="chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </article>

        <aside className="job-detail__aside">
          <div className="job-panel">
            <h2 className="job-panel__title">Условия</h2>
            <div className="dl">
              <div>
                <span className="k">Компания</span>
                <span className="v">{vacancy.companyName}</span>
              </div>
              <div>
                <span className="k">Локация</span>
                <span className="v">{getVacancyLocation(vacancy)}</span>
              </div>
              <div>
                <span className="k">Формат</span>
                <span className="v">{workFormatLabels[vacancy.workFormat]}</span>
              </div>
              <div>
                <span className="k">Тип занятости</span>
                <span className="v">
                  {employmentTypeLabels[vacancy.employmentType]}
                </span>
              </div>
              <div>
                <span className="k">Уровень</span>
                <span className="v">{seniorityLabels[vacancy.seniority]}</span>
              </div>
              <div>
                <span className="k">Зарплата</span>
                <span className="v">{vacancy.salaryRange}</span>
              </div>
              <div>
                <span className="k">Дата</span>
                <span className="v mono">{formatDate(vacancy.createdAt)}</span>
              </div>
              <div>
                <span className="k">Откликов</span>
                <span className="v mono">{vacancy.applicationsCount}</span>
              </div>
            </div>
          </div>

          <div className="job-panel">
            <h2 className="job-panel__title">Отклик</h2>

            {error && (
              <div
                className="placeholder"
                style={{
                  borderColor: "var(--risk)",
                  color: "var(--risk)",
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            {!isCandidate && (
              <Placeholder>
                Откликаться могут только пользователи с ролью «Кандидат».
                Зайдите под аккаунтом кандидата
              </Placeholder>
            )}

            {isCandidate && !candidate && (
              <Placeholder>
                Создайте профиль кандидата{" "}
                <Link
                  href="/candidate/profile"
                  style={{ borderBottom: "1px solid var(--ink)" }}
                >
                  Заполнить профиль →
                </Link>
              </Placeholder>
            )}

            {isCandidate && candidate && !profileReady && (
              <Placeholder>
                Профиль заполнен не полностью{" "}
                <Link
                  href="/candidate/profile"
                  style={{ borderBottom: "1px solid var(--ink)" }}
                >
                  Дозаполнить →
                </Link>
              </Placeholder>
            )}

            {existingApplication && (
              <p className="lead" style={{ marginTop: 0, fontSize: 15 }}>
                Вы уже откликнулись. Можно открыть «Мои отклики» или отозвать
                отклик, чтобы отправить заново.
              </p>
            )}

            {canApply && (
              <p className="lead" style={{ marginTop: 0, fontSize: 15 }}>
                Профиль готов — можно откликнуться.
              </p>
            )}

            <div className="job-apply-actions">
              <button
                className="btn btn-primary"
                onClick={openApplyModal}
                disabled={!canApply}
              >
                {existingApplication
                  ? "Отклик уже отправлен"
                  : "Откликнуться →"}
              </button>

              <div className="btn-row">
                <Link href="/candidate/applications" className="btn">
                  Мои отклики
                </Link>
                <Link href="/jobs" className="btn">
                  К списку
                </Link>
              </div>

              {existingApplication && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleWithdraw}
                  disabled={withdrawBusy}
                  style={{ color: "var(--risk)", borderColor: "var(--risk)" }}
                >
                  {withdrawBusy ? "Отзыв…" : "Отозвать отклик"}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* FR-024 application form modal */}
      {isApplyModalOpen && candidate && (
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
              setIsApplyModalOpen(false);
            }
          }}
        >
          <div
            className="overlay-sheet"
            style={{
              width: "100%",
              maxWidth: 640,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 48,
            }}
          >
            <div className="between" style={{ marginBottom: 24 }}>
              <div>
                <div className="eyebrow">Отклик · FR-024</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: "-0.018em",
                    marginTop: 6,
                  }}
                >
                  Отклик на «{vacancy.title}»
                </div>
                <div
                  className="muted"
                  style={{ fontSize: 13, marginTop: 6 }}
                >
                  {vacancy.companyName} · {getVacancyLocation(vacancy)} ·{" "}
                  {vacancy.salaryRange}
                </div>
              </div>
              <button
                type="button"
                className="btn-link mono"
                onClick={() => setIsApplyModalOpen(false)}
                style={{ fontSize: 12 }}
              >
                закрыть ×
              </button>
            </div>

            <div className="field" style={{ marginBottom: 24 }}>
              <span className="field-label">Сопроводительное письмо</span>
              <textarea
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                rows={4}
                className="textarea"
                placeholder="Короткая записка для компании: почему именно эта вакансия, что особенно важно подсветить в профиле."
              />
            </div>

            <button
              type="button"
              className={`radio ${applyConsent ? "on" : ""}`}
              onClick={() => setApplyConsent(!applyConsent)}
            >
              <span className="dot"></span>
              <span>
                <div className="ttl">
                  Я согласен передать профиль компании {vacancy.companyName}
                </div>
                <div className="desc">
                  Компания увидит ваш профиль и материалы. Согласие можно
                  отозвать на странице «Согласия».
                </div>
              </span>
            </button>

            {applyError && (
              <div
                className="placeholder"
                style={{
                  borderColor: "var(--risk)",
                  color: "var(--risk)",
                  marginTop: 16,
                }}
              >
                {applyError}
              </div>
            )}

            <div
              style={{
                marginTop: 32,
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setIsApplyModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitApplication}
              >
                Отправить отклик →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
