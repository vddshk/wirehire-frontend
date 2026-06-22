"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Candidate } from "@/types/candidate";
import { Vacancy } from "@/types/vacancy";
import {
  ConsentStatus,
  VerificationRun,
  VerificationRunStatus,
} from "@/types/verification";
import { addAuditEvent } from "@/lib/api/audit";
import {
  PageHeader,
  Section,
  Status,
  Crumb,
  Steps,
  Step,
} from "@/components/ui/editorial";

function getAllCandidates(): Candidate[] {
  const savedCandidatesRaw = localStorage.getItem("wirehire-candidates");
  return savedCandidatesRaw ? JSON.parse(savedCandidatesRaw) : [];
}

function getAllVacancies(): Vacancy[] {
  const savedVacanciesRaw = localStorage.getItem("wirehire-vacancies");
  return savedVacanciesRaw ? JSON.parse(savedVacanciesRaw) : [];
}

import { formatVacancyLocation as getVacancyLocation } from "@/lib/utils/vacancy";

const consentLabels: Record<ConsentStatus, string> = {
  not_requested: "не запрошено",
  requested: "запрошено",
  active: "активно",
  revoked: "отозвано",
};

const consentTones: Record<ConsentStatus, "good" | "warn" | "muted" | "risk"> =
  {
    not_requested: "muted",
    requested: "warn",
    active: "good",
    revoked: "risk",
  };

const runStatusLabels: Record<VerificationRunStatus, string> = {
  created: "создана",
  waiting_consent: "ждет согласие",
  active: "активна",
  completed: "завершена",
  cancelled: "отменена",
};

const runStatusTones: Record<
  VerificationRunStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  created: "muted",
  waiting_consent: "warn",
  active: "good",
  completed: "good",
  cancelled: "risk",
};

export default function ConsentPage() {
  const params = useParams();
  const verificationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [verificationRun, setVerificationRun] =
    useState<VerificationRun | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState("");

  useEffect(() => {
    const savedRunsRaw = localStorage.getItem("wirehire-verification-runs");
    const savedRuns: VerificationRun[] = savedRunsRaw
      ? JSON.parse(savedRunsRaw)
      : [];

    const foundRun = savedRuns.find((run) => run.id === verificationId);

    if (foundRun) {
      const allCandidates = getAllCandidates();
      const allVacancies = getAllVacancies();

      const foundCandidate = allCandidates.find(
        (item) => item.id === foundRun.candidateId
      );

      const foundVacancy = allVacancies.find(
        (item) => item.id === foundRun.vacancyId
      );

      setVerificationRun(foundRun);
      setCandidate(foundCandidate ?? null);
      setVacancy(foundVacancy ?? null);
    }

    setIsLoaded(true);
  }, [verificationId]);

  function updateVerificationRun(updatedRun: VerificationRun) {
    const savedRunsRaw = localStorage.getItem("wirehire-verification-runs");
    const savedRuns: VerificationRun[] = savedRunsRaw
      ? JSON.parse(savedRunsRaw)
      : [];

    const updatedRuns = savedRuns.map((run) => {
      if (run.id !== updatedRun.id) {
        return run;
      }
      return updatedRun;
    });

    localStorage.setItem(
      "wirehire-verification-runs",
      JSON.stringify(updatedRuns)
    );

    setVerificationRun(updatedRun);
  }

  function handleAcceptConsent() {
    if (!verificationRun || !candidate || !vacancy) {
      return;
    }

    const updatedRun: VerificationRun = {
      ...verificationRun,
      consentStatus: "active",
      status: "active",
    };

    updateVerificationRun(updatedRun);

    addAuditEvent({
      type: "consent_accepted",
      title: "Кандидат принял согласие",
      description: `${candidate.fullName} принял согласие на проверку под вакансию ${vacancy.title}.`,
      actorRole: "Candidate",
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      vacancyId: vacancy.id,
      vacancyTitle: vacancy.title,
      verificationRunId: verificationRun.id,
    });

    setDecisionMessage(
      "Согласие принято. Проверка теперь активна — HR может продолжить."
    );
  }

  function handleRevokeConsent() {
    if (!verificationRun || !candidate || !vacancy) {
      return;
    }

    const updatedRun: VerificationRun = {
      ...verificationRun,
      consentStatus: "revoked",
      status: "cancelled",
    };

    updateVerificationRun(updatedRun);

    addAuditEvent({
      type: "consent_revoked",
      title: "Кандидат отозвал согласие",
      description: `${candidate.fullName} отозвал согласие на проверку под вакансию ${vacancy.title}. Проверка отменена.`,
      actorRole: "Candidate",
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      vacancyId: vacancy.id,
      vacancyTitle: vacancy.title,
      verificationRunId: verificationRun.id,
    });

    setDecisionMessage(
      "Согласие отозвано. Проверка отменена и не должна продолжаться."
    );
  }

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем согласие." />;
  }

  if (!verificationRun || !candidate || !vacancy) {
    return (
      <>
        <Crumb>
          <Link href="/candidate/dashboard">← Главная</Link>
        </Crumb>
        <PageHeader
          eyebrow="Не найдено"
          title="Согласие не найдено"
          lead="Проверка, кандидат или вакансия не существуют."
          actions={
            <Link href="/candidate/dashboard" className="btn btn-primary">
              На главную →
            </Link>
          }
        />
      </>
    );
  }

  const isConsentActive = verificationRun.consentStatus === "active";
  const isConsentRevoked = verificationRun.consentStatus === "revoked";

  return (
    <>
      <Crumb>
        <Link href="/candidate/dashboard">← Главная</Link>
        {" · "}
        Согласие
      </Crumb>

      <PageHeader
        eyebrow="Согласие на проверку"
        title={
          <>
            Проверка опыта
            <br />
            <em>и навыков</em>
          </>
        }
        lead="Перед запуском проверки кандидат должен отдельно подтвердить согласие на обработку данных, проверку опыта и assessment-процедуры. Согласие можно отозвать в любой момент."
        actions={
          <Link
            href={`/verification/${verificationRun.id}`}
            className="btn"
          >
            Открыть проверку
          </Link>
        }
      />

      <Section num="01" label="Что включает проверка">
        <Steps>
          <Step
            marker={<span className="mono muted">01</span>}
            title="Проверка опыта"
            description="HR может просмотреть карточки опыта, evidence-материалы и при необходимости запросить подтверждение у компании-референта."
          />
          <Step
            marker={<span className="mono muted">02</span>}
            title="Проверка навыков"
            description="Кандидату может быть назначен тест или практический кейс. Прохождение в удобное время, опционально с прокторингом."
          />
          <Step
            marker={<span className="mono muted">03</span>}
            title="Итоговый отчет"
            description="Система формирует объяснимый отчет с рисками, основаниями статусов и recommended next steps. Решение о найме остается за hiring manager."
          />
        </Steps>
      </Section>

      <Section num="02" label="Кандидат и вакансия">
        <div className="split-equal">
          <div>
            <div className="caption" style={{ marginBottom: 12 }}>
              Кандидат
            </div>
            <div className="dl">
              <div>
                <span className="k">ФИО</span>
                <span className="v">{candidate.fullName}</span>
              </div>
              <div>
                <span className="k">Headline</span>
                <span className="v">{candidate.headline}</span>
              </div>
              <div>
                <span className="k">Локация</span>
                <span className="v">{candidate.location}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="caption" style={{ marginBottom: 12 }}>
              Вакансия
            </div>
            <div className="dl">
              <div>
                <span className="k">Название</span>
                <span className="v">{vacancy.title}</span>
              </div>
              <div>
                <span className="k">Компания</span>
                <span className="v">{vacancy.companyName}</span>
              </div>
              <div>
                <span className="k">Локация</span>
                <span className="v">{getVacancyLocation(vacancy)}</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section num="03" label="Решение">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            marginBottom: 32,
          }}
        >
          <div>
            <div className="caption" style={{ marginBottom: 8 }}>
              Статус consent
            </div>
            <Status tone={consentTones[verificationRun.consentStatus]}>
              {consentLabels[verificationRun.consentStatus]}
            </Status>
          </div>
          <div>
            <div className="caption" style={{ marginBottom: 8 }}>
              Статус проверки
            </div>
            <Status tone={runStatusTones[verificationRun.status]}>
              {runStatusLabels[verificationRun.status]}
            </Status>
          </div>
        </div>

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

        <div style={{ display: "flex", gap: 16 }}>
          <button
            className="btn btn-primary"
            onClick={handleAcceptConsent}
            disabled={isConsentActive}
          >
            Принять согласие →
          </button>
          <button
            className="btn"
            onClick={handleRevokeConsent}
            disabled={isConsentRevoked}
            style={
              !isConsentRevoked
                ? { borderColor: "var(--risk)", color: "var(--risk)" }
                : undefined
            }
          >
            Отозвать
          </button>
        </div>
      </Section>
    </>
  );
}
