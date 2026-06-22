"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  greetingFirstName,
  refreshCurrentUserDisplayName,
} from "@/lib/api/userDisplayName";
import { getCurrentUser } from "@/lib/api/session";
import { getCandidateById } from "@/lib/api/candidates";
import { getApplicationsByCandidateId } from "@/lib/api/applications";
import { getConsentsByCandidateId } from "@/lib/api/consents";
import { getCandidateDashboard } from "@/lib/api/dashboard";
import { getMySkills } from "@/lib/api/skills";
import { CandidateSkill } from "@/types/skill";
import { CandidateDashboard } from "@/types/dashboard";
import { checkAdmission } from "@/lib/candidates/admissionGate";
import { computeProfileCompletionPercent } from "@/lib/candidates/profileCompletion";
import { CurrentUser } from "@/types/user";
import { Candidate, ProfileStatus } from "@/types/candidate";
import { Application, ApplicationStatus } from "@/types/application";
import { Vacancy } from "@/types/vacancy";
import { getVacancies } from "@/lib/api/vacancies";
import {
  formatApplicationListTitle,
  formatApplicationMetaLine,
  resolveApplicationVacancy,
} from "@/lib/applications/display";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Steps,
  Step,
  Status,
  Placeholder,
} from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  submitted: "Подан",
  reviewed: "Просмотрен",
  in_progress: "В работе",
  shortlist: "Скрининг",
  verification: "Проверка",
  interview: "Интервью",
  offer: "Оффер",
  hired: "Принят",
  rejected: "Отклонен",
  withdrawn: "Отозван",
  archived: "Архивирован",
};

const profileStatusLabels: Record<ProfileStatus, string> = {
  draft: "Черновик",
  active: "Активен",
  pending_threshold: "Ожидает порог",
  admitted: "Допущен",
};

const profileStatusTones: Record<
  ProfileStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  draft: "muted",
  active: "muted",
  pending_threshold: "warn",
  admitted: "good",
};

export default function CandidateDashboardPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [todayLabel, setTodayLabel] = useState("");
  const [admissionMet, setAdmissionMet] = useState(false);
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);

  useEffect(() => {
    async function load() {
      const user = getCurrentUser();
      setCurrentUser(user);

      let myApplications: Application[] = [];
      if (user.candidateId) {
        try {
          const [loadedApplications, loadedVacancies] = await Promise.all([
            getApplicationsByCandidateId(user.candidateId),
            getVacancies().catch(() => [] as Vacancy[]),
          ]);
          myApplications = loadedApplications;
          setVacancies(loadedVacancies);
        } catch {
          myApplications = [];
        }
      }
      setApplications(myApplications);

      setTodayLabel(new Date().toLocaleDateString("ru-RU"));

      if (user.candidateId) {
        const [loadedCandidate, loadedConsents] = await Promise.all([
          getCandidateById(user.candidateId),
          getConsentsByCandidateId(user.candidateId),
        ]);

        if (loadedCandidate) {
          setCandidate(loadedCandidate);
          const { admitted } = checkAdmission(loadedCandidate, loadedConsents);
          setAdmissionMet(admitted);
        }

        await refreshCurrentUserDisplayName();
        setCurrentUser(getCurrentUser());
      }

      try {
        const dashboardData = await getCandidateDashboard();
        setDashboard(dashboardData);
      } catch {
        // Если /me/dashboard недоступен (нет токена) — оставляем null,
        // дашборд рисуется по локальным данным candidate + applications.
      }

      try {
        const skills = await getMySkills();
        setCandidateSkills(skills);
      } catch {
        setCandidateSkills([]);
      }
    }

    load();
  }, []);

  if (!currentUser) {
    return (
      <div className="candidate-home">
        <PageSkeleton />
      </div>
    );
  }

  const firstName = greetingFirstName(candidate?.fullName, currentUser.fullName);
  const activeApplicationsCount = applications.filter(
    (application) =>
      application.status !== "rejected" && application.status !== "hired"
  ).length;

  const effectiveProfileStatus: ProfileStatus =
    candidate?.profileStatus ??
    (candidate ? "active" : "draft");

  const profileCompletionPercent = candidate
    ? computeProfileCompletionPercent({
        fullName: candidate.fullName,
        headline: candidate.headline,
        location: candidate.location,
        desiredRole: candidate.desiredRole,
        summary: candidate.summary,
        experienceCount: candidate.experience.length,
        skillsCount: candidateSkills.length,
      })
    : 0;

  const candidateActions = [
    {
      href: "/candidate/profile",
      title: "Заполнить профиль",
      description:
        "Данные, опыт, навыки, материалы для HR. Чем полнее профиль, тем выше шанс на отклик",
    },
    {
      href: "/candidate/assessment",
      title: "AI-оценка",
      description:
        "Общая проверка навыков по профилю. Результат виден работодателям после прохождения",
    },
    {
      href: "/jobs",
      title: "Найти работу",
      description:
        "Витрина вакансий от компаний. Откликайся на интересные позиции и жди отклика от HR",
    },
    {
      href: "/candidate/applications",
      title: "Мои отклики",
      description:
        "Статусы откликов, переписка с работодателями, ход проверки",
    },
  ];

  return (
    <div className="candidate-home">
      <PageHeader
        wideTitle
        eyebrow={todayLabel}
        title={
          <>
            Здравствуйте,
            <br />
            <em>{firstName}</em>
          </>
        }
        actions={
          <>
            <Link href="/candidate/profile" className="btn">
              Редактировать профиль
            </Link>
            <Link href="/jobs" className="btn btn-primary">
              Найти работу →
            </Link>
          </>
        }
      />

      <div className="hr-dashboard__shortcuts">
        <Link href="/candidate/profile" className="hr-dashboard-shortcut">
          <span className="hr-dashboard-shortcut__val">
            {profileCompletionPercent}%
          </span>
          <span className="hr-dashboard-shortcut__label">Профиль</span>
          <span className="hr-dashboard-shortcut__hint">заполнение</span>
        </Link>
        <Link href="/candidate/applications" className="hr-dashboard-shortcut">
          <span className="hr-dashboard-shortcut__val">
            {dashboard?.applicationsCount ?? activeApplicationsCount}
          </span>
          <span className="hr-dashboard-shortcut__label">Отклики</span>
          <span className="hr-dashboard-shortcut__hint">активные</span>
        </Link>
        <Link href="/candidate/assessment" className="hr-dashboard-shortcut">
          <span className="hr-dashboard-shortcut__val">AI</span>
          <span className="hr-dashboard-shortcut__label">Оценка</span>
          <span className="hr-dashboard-shortcut__hint">навыки</span>
        </Link>
        <Link href="/jobs" className="hr-dashboard-shortcut">
          <span className="hr-dashboard-shortcut__val">→</span>
          <span className="hr-dashboard-shortcut__label">Вакансии</span>
          <span className="hr-dashboard-shortcut__hint">поиск работы</span>
        </Link>
      </div>

      <StatGrid>
        <Stat
          value={
            <Status tone={profileStatusTones[effectiveProfileStatus]}>
              {profileStatusLabels[effectiveProfileStatus]}
            </Status>
          }
          label="Статус профиля"
        />
        <Stat value={`${profileCompletionPercent}%`} label="Заполнено профиля" />
        <Stat
          value={dashboard?.applicationsCount ?? activeApplicationsCount}
          label="Активных откликов"
        />
        <Stat
          value={dashboard?.experiencesCount ?? candidate?.experience.length ?? 0}
          label="Карточек опыта"
        />
      </StatGrid>

      {!admissionMet && candidate && (
        <Section num="01" label="Статус допуска">
          {effectiveProfileStatus === "admitted" ? (
            <Placeholder>
              Профиль допущен в общую базу. Компания может видеть ваш профиль
            </Placeholder>
          ) : (
            <>
              <p style={{ marginBottom: 24, lineHeight: 1.6 }}>
                Профиль еще не допущен в общую базу кандидатов. Компания не видит его
                в поиске. Для допуска нужно: заполнить
                профиль, добавить верифицированный опыт и дать необходимые
                согласия
              </p>
              <div className="action-row">
                <Link href="/candidate/profile" className="btn btn-primary">
                  Заполнить профиль →
                </Link>
                <Link href="/candidate/consents" className="btn">
                  Согласия
                </Link>
              </div>
            </>
          )}
        </Section>
      )}

      <Section num={admissionMet || !candidate ? "01" : "02"} label="Основные действия">
        <Steps>
          {candidateActions.map((action, index) => (
            <Step
              key={action.href}
              marker={
                <span className="mono muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
              }
              title={<Link href={action.href}>{action.title}</Link>}
              description={action.description}
              action={
                <Link href={action.href} className="btn-link mono">
                  открыть →
                </Link>
              }
            />
          ))}
        </Steps>
      </Section>

      {applications.length === 0 ? (
        <Section
          num={admissionMet || !candidate ? "02" : "03"}
          label="Последние отклики"
        >
          <Placeholder>
            Откликов пока нет.{" "}
            <Link href="/jobs" className="btn-link">
              Смотреть вакансии →
            </Link>
          </Placeholder>
        </Section>
      ) : (
        <Section num={admissionMet || !candidate ? "02" : "03"} label="Последние отклики">
          <Steps>
            {applications
              .slice(-3)
              .reverse()
              .map((application) => {
                const { href } = resolveApplicationVacancy(
                  application,
                  vacancies
                );
                const listTitle = formatApplicationListTitle(
                  application,
                  vacancies
                );

                return (
                <Step
                  key={application.id}
                  marker={
                    <Status
                      tone={
                        application.status === "rejected"
                          ? "risk"
                          : application.status === "hired"
                            ? "good"
                            : "muted"
                      }
                    >
                      {applicationStatusLabels[application.status]}
                    </Status>
                  }
                  title={
                    href ? (
                      <Link href={href}>{listTitle}</Link>
                    ) : (
                      listTitle
                    )
                  }
                  description={formatApplicationMetaLine(application)}
                  action={
                    <Link
                      href={href ?? "/candidate/applications"}
                      className="btn-link mono"
                    >
                      открыть →
                    </Link>
                  }
                />
              );
              })}
          </Steps>
        </Section>
      )}
    </div>
  );
}
