"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/session";
import { getCandidateById } from "@/lib/api/candidates";
import {
  getApplicationsByCandidateId,
  withdrawMyApplication,
} from "@/lib/api/applications";
import { getVacancies } from "@/lib/api/vacancies";
import { Application, PIPELINE_COLUMN_BY_STATUS } from "@/types/application";
import {
  getApplicationStageLabel,
  threadApplicationKey,
} from "@/lib/applications/display";
import { Candidate } from "@/types/candidate";
import { CurrentUser } from "@/types/user";
import { Vacancy } from "@/types/vacancy";
import { PageHeader, Status, EditorialTable } from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { formatRelativeDate } from "@/lib/utils/date";

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadCandidateApplications() {
      const user = getCurrentUser();
      setCurrentUser(user);

      if (user.role !== "candidate") {
        setIsLoaded(true);
        return;
      }

      const candidateId = user.candidateId ?? `candidate-${user.id}`;

      const [loadedCandidate, loadedApplications, loadedVacancies] =
        await Promise.all([
          getCandidateById(candidateId),
          getApplicationsByCandidateId(candidateId),
          getVacancies(),
        ]);

      setCandidate(loadedCandidate);
      setApplications(loadedApplications);
      setVacancies(loadedVacancies);
      setIsLoaded(true);
    }

    loadCandidateApplications();
  }, []);

  if (!isLoaded) {
    return <PageSkeleton variant="compact" />;
  }

  if (currentUser && currentUser.role !== "candidate") {
    return (
      <PageHeader
        eyebrow="Доступ"
        title="Это страница кандидата"
        lead="Эта страница доступна только пользователям с ролью кандидата."
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
        title="Профиль не создан"
        lead="Чтобы откликаться на вакансии и видеть свои отклики, заполните профиль кандидата"
        actions={
          <Link href="/candidate/profile" className="btn btn-primary">
            Заполнить профиль →
          </Link>
        }
      />
    );
  }

  function getVacancy(vacancyId: string) {
    return vacancies.find((vacancy) => vacancy.id === vacancyId);
  }

  const activeApplications = applications.filter(
    (application) =>
      PIPELINE_COLUMN_BY_STATUS[application.status] !== "closed"
  );

  const interviewCount = applications.filter(
    (application) => application.status === "interview"
  ).length;

  const lead =
    applications.length === 0
      ? "Откликов пока нет."
      : interviewCount > 0
        ? `${activeApplications.length} активных откликов По ${interviewCount} идет переписка с работодателем`
        : `${activeApplications.length} активных откликов`;

  return (
    <>
      <PageHeader eyebrow="Отклики" title="Мои отклики" lead={lead} />

      {applications.length === 0 ? (
        <p className="muted" style={{ fontSize: 15 }}>
          Здесь появятся ваши отклики и приглашения от компаний. Можно откликнуться
          самому —{" "}
          <Link href="/jobs" className="btn-link">
            смотреть вакансии →
          </Link>
          , или дождаться приглашения в{" "}
          <Link href="/messages" className="btn-link">
            мессенджере →
          </Link>
        </p>
      ) : (
        <EditorialTable>
          <thead>
            <tr>
              <th>Вакансия</th>
              <th>Компания</th>
              <th>Стадия</th>
              <th>Обновлено</th>
              <th aria-label="Действия">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const vacancy = getVacancy(application.vacancyId);
              const vacancyTitle =
                vacancy?.title ?? application.vacancyTitle ?? "Вакансия";
              const companyName =
                vacancy?.companyName ?? application.companyName ?? "—";
              const stage = getApplicationStageLabel(
                application.status,
                application.source
              );
              const href = application.vacancyId
                ? `/jobs/${application.vacancyId}`
                : null;
              const messagesHref =
                application.vacancyId && candidate
                  ? `/messages?thread=${threadApplicationKey(
                      application.vacancyId,
                      candidate.id
                    )}`
                  : null;

              const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
                if (!href) return;
                if ((event.target as HTMLElement).closest("a")) return;
                router.push(href);
              };

              return (
                <tr
                  key={application.id}
                  className="row-clickable"
                  onClick={handleRowClick}
                >
                  <td
                    style={{
                      fontSize: 18,
                      fontWeight: 500,
                      letterSpacing: "-0.012em",
                    }}
                  >
                    {href ? (
                      <Link href={href}>{vacancyTitle}</Link>
                    ) : (
                      vacancyTitle
                    )}
                  </td>
                  <td>{companyName}</td>
                  <td>
                    <Status tone={stage.tone}>{stage.label}</Status>
                  </td>
                  <td className="mono muted">
                    {formatRelativeDate(application.appliedAt)}
                  </td>
                  <td className="text-right">
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        justifyContent: "flex-end",
                        alignItems: "center",
                      }}
                    >
                      {messagesHref && (
                        <Link
                          href={messagesHref}
                          className="btn-link mono"
                          style={{ fontSize: 12 }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          сообщения →
                        </Link>
                      )}
                      {application.status !== "withdrawn" &&
                        application.status !== "rejected" &&
                        application.status !== "hired" && (
                          <button
                            type="button"
                            className="btn-link mono"
                            style={{ fontSize: 12 }}
                            onClick={async (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const ok = window.confirm(
                                "Отозвать отклик? Действие нельзя отменить"
                              );
                              if (!ok) return;
                              try {
                                const updated = await withdrawMyApplication(
                                  application.id
                                );
                                if (updated) {
                                  setApplications((prev) =>
                                    prev.map((item) =>
                                      item.id === updated.id ? updated : item
                                    )
                                  );
                                }
                              } catch (err) {
                                alert(
                                  err instanceof Error
                                    ? err.message
                                    : "Не удалось отозвать отклик"
                                );
                              }
                            }}
                          >
                            отозвать
                          </button>
                        )}
                      <span className="mono muted">{href ? "→" : null}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </EditorialTable>
      )}
    </>
  );
}
