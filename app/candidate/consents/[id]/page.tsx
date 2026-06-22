"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/session";
import { getCandidateById } from "@/lib/api/candidates";
import {
  acceptConsent,
  getConsentById,
  revokeConsent,
} from "@/lib/api/consents";
import { addAuditEvent } from "@/lib/api/audit";
import { Candidate } from "@/types/candidate";
import {
  Consent,
  ConsentChannel,
  ConsentLifecycle,
  ConsentType,
} from "@/types/consent";
import { CurrentUser } from "@/types/user";
import {
  PageHeader,
  Section,
  Status,
  Steps,
  Step,
} from "@/components/ui/editorial";

const lifecycleLabels: Record<ConsentLifecycle, string> = {
  not_requested: "не запрошено",
  requested: "запрошено",
  active: "активно",
  revoked: "отозвано",
  expired: "истекло",
};

const lifecycleTones: Record<
  ConsentLifecycle,
  "good" | "warn" | "muted" | "risk"
> = {
  not_requested: "muted",
  requested: "warn",
  active: "good",
  revoked: "risk",
  expired: "risk",
};

const typeLabels: Record<ConsentType, string> = {
  profile_visibility: "Видимость профиля",
  communication: "Коммуникации",
  verification: "Проверка опыта и навыков",
  proctoring: "Прокторинг",
};

const typeDescriptions: Record<ConsentType, string> = {
  profile_visibility:
    "Кандидат разрешает показ профиля HR и hiring-manager после прохождения порога подтверждения.",
  communication:
    "Сервис может присылать уведомления о приглашениях, проверках и решениях по откликам.",
  verification:
    "HR может запускать проверку карточек опыта, запрашивать референсы и evidence-материалы.",
  proctoring:
    "При прохождении assessment может включаться прокторинг (камера, экран) для подтверждения авторства.",
};

const channelLabels: Record<ConsentChannel, string> = {
  web_form: "web-форма",
  email_link: "ссылка из письма",
  in_app: "in-app",
};

export default function CandidateConsentDetailPage() {
  const params = useParams();
  const consentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadConsent() {
      const user = getCurrentUser();
      setCurrentUser(user);

      if (!consentId) {
        setIsLoaded(true);
        return;
      }

      const loadedConsent = await getConsentById(consentId);

      if (loadedConsent) {
        const loadedCandidate = await getCandidateById(loadedConsent.candidateId);
        setConsent(loadedConsent);
        setCandidate(loadedCandidate);
      }

      setIsLoaded(true);
    }

    loadConsent();
  }, [consentId]);

  async function handleAccept() {
    if (!consent || !candidate) {
      return;
    }

    setIsBusy(true);
    const updated = await acceptConsent(consent.id);

    if (updated) {
      setConsent(updated);
      addAuditEvent({
        type: "consent_accepted",
        title: "Кандидат принял согласие",
        description: `${candidate.fullName} принял согласие «${typeLabels[consent.type]}».`,
        actorRole: "Candidate",
        candidateId: candidate.id,
        candidateName: candidate.fullName,
      });
      setActionMessage("Согласие принято и теперь активно.");
    }

    setIsBusy(false);
  }

  async function handleRevoke() {
    if (!consent || !candidate) {
      return;
    }

    setIsBusy(true);
    const updated = await revokeConsent(consent.id);

    if (updated) {
      setConsent(updated);
      addAuditEvent({
        type: "consent_revoked",
        title: "Кандидат отозвал согласие",
        description: `${candidate.fullName} отозвал согласие «${typeLabels[consent.type]}».`,
        actorRole: "Candidate",
        candidateId: candidate.id,
        candidateName: candidate.fullName,
      });
      setActionMessage("Согласие отозвано.");
    }

    setIsBusy(false);
  }

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем согласие." />;
  }

  if (currentUser && currentUser.role !== "candidate") {
    return (
      <PageHeader
        eyebrow="Доступ"
        title="Это страница кандидата"
        lead="Согласия доступны только пользователям с ролью кандидата."
        actions={
          <Link href="/dashboard" className="btn btn-primary">
            В кабинет →
          </Link>
        }
      />
    );
  }

  if (!consent || !candidate) {
    return (
      <>
        <PageHeader
          eyebrow="Не найдено"
          title="Согласие не найдено"
          lead="Запись о согласии не существует или была удалена."
          actions={
            <Link href="/candidate/consents" className="btn btn-primary">
              К списку согласий →
            </Link>
          }
        />
      </>
    );
  }

  const status = consent.status;
  const isActive = status === "active";
  const isRevoked = status === "revoked";
  const isExpired = status === "expired";
  const canAccept = !isActive && !isExpired;
  const canRevoke = isActive;

  return (
    <>
      <PageHeader
        eyebrow={`Согласие · ${typeLabels[consent.type]}`}
        title={
          <>
            {typeLabels[consent.type]}
            <br />
            <em>профиль-уровень</em>
          </>
        }
        lead={typeDescriptions[consent.type]}
        actions={
          <Link href="/candidate/consents" className="btn">
            Все согласия
          </Link>
        }
      />

      <Section num="01" label="Lifecycle">
        <Steps>
          <Step
            marker={<span className="mono muted">01</span>}
            title="Запрошено"
            description="Система или HR создает запрос на согласие. Кандидат видит его в кабинете."
          />
          <Step
            marker={<span className="mono muted">02</span>}
            title="Активно"
            description="Кандидат подтвердил согласие. Связанные сценарии (проверка, коммуникации, прокторинг) разрешены."
          />
          <Step
            marker={<span className="mono muted">03</span>}
            title="Отозвано или истекло"
            description="Кандидат может отозвать согласие в любой момент; согласие также может истечь по времени. После этого связанные сценарии блокируются."
          />
        </Steps>
      </Section>

      <Section num="02" label="Параметры">
        <div className="split-equal">
          <div>
            <div className="caption" style={{ marginBottom: 12 }}>
              Текущий статус
            </div>
            <Status tone={lifecycleTones[status]}>
              {lifecycleLabels[status]}
            </Status>
          </div>
          <div>
            <div className="caption" style={{ marginBottom: 12 }}>
              Канал
            </div>
            <div className="mono">{channelLabels[consent.channel]}</div>
          </div>
        </div>

        <div className="dl" style={{ marginTop: 32 }}>
          <div>
            <span className="k">Кандидат</span>
            <span className="v">{candidate.fullName}</span>
          </div>
          <div>
            <span className="k">Тип</span>
            <span className="v">{typeLabels[consent.type]}</span>
          </div>
          <div>
            <span className="k">Версия текста</span>
            <span className="v mono">{consent.textVersion}</span>
          </div>
          <div>
            <span className="k">Запрошено</span>
            <span className="v mono">{consent.requestedAt ?? "—"}</span>
          </div>
          <div>
            <span className="k">Принято</span>
            <span className="v mono">{consent.acceptedAt ?? "—"}</span>
          </div>
          <div>
            <span className="k">Отозвано</span>
            <span className="v mono">{consent.revokedAt ?? "—"}</span>
          </div>
          <div>
            <span className="k">Истекает</span>
            <span className="v mono">{consent.expiresAt ?? "—"}</span>
          </div>
        </div>
      </Section>

      <Section num="03" label="Действия">
        {actionMessage && (
          <div
            className="placeholder"
            style={{
              borderColor: "var(--ink)",
              color: "var(--ink)",
              marginBottom: 32,
            }}
          >
            {actionMessage}
          </div>
        )}

        <div style={{ display: "flex", gap: 16 }}>
          <button
            className="btn btn-primary"
            onClick={handleAccept}
            disabled={!canAccept || isBusy}
          >
            Дать согласие →
          </button>
          <button
            className="btn"
            onClick={handleRevoke}
            disabled={!canRevoke || isBusy}
            style={
              canRevoke
                ? { borderColor: "var(--risk)", color: "var(--risk)" }
                : undefined
            }
          >
            Отозвать
          </button>
        </div>

        {isRevoked && (
          <div className="caption" style={{ marginTop: 16 }}>
            Согласие отозвано. Чтобы возобновить — нажмите «Дать согласие».
          </div>
        )}
        {isExpired && (
          <div className="caption" style={{ marginTop: 16 }}>
            Согласие истекло. Новый запрос создается со стороны HR или системы.
          </div>
        )}
      </Section>
    </>
  );
}
