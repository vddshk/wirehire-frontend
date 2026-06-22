"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/session";
import { getCandidateById } from "@/lib/api/candidates";
import {
  acceptConsent,
  ensureConsent,
  getConsentSlotsByCandidateId,
  revokeConsent,
} from "@/lib/api/consents";
import { addAuditEvent } from "@/lib/api/audit";
import { Candidate } from "@/types/candidate";
import {
  Consent,
  ConsentLifecycle,
  ConsentType,
} from "@/types/consent";
import { CurrentUser } from "@/types/user";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Stat,
  StatGrid,
  Status,
  EditorialTable,
  Placeholder,
} from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

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
    "Кандидат разрешает показ профиля компании после прохождения порога подтверждения",
  communication:
    "Сервис может присылать уведомления о приглашениях, проверках и решениях по откликам",
  verification:
    "Компания может запускать проверку карточек опыта, запрашивать референсы и материалы",
  proctoring:
    "При прохождении теста может включаться прокторинг (камера, экран) для подтверждения авторства",
};

type ConsentSlot = {
  type: ConsentType;
  consent: Consent | null;
};

const ONBOARDING_CONSENT_TYPES: ConsentType[] = [
  "profile_visibility",
  "verification",
];

export default function CandidateConsentsPage() {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [slots, setSlots] = useState<ConsentSlot[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingType, setPendingType] = useState<ConsentType | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadConsents() {
      const user = getCurrentUser();
      setCurrentUser(user);

      if (user.role !== "candidate") {
        setIsLoaded(true);
        return;
      }

      const candidateId = user.candidateId ?? `candidate-${user.id}`;

      const [loadedCandidate, loadedSlots] = await Promise.all([
        getCandidateById(candidateId),
        getConsentSlotsByCandidateId(candidateId),
      ]);

      setCandidate(loadedCandidate);
      setSlots(loadedSlots);
      setIsLoaded(true);
    }

    loadConsents();
  }, []);

  async function refreshSlots(candidateId: string) {
    const next = await getConsentSlotsByCandidateId(candidateId);
    setSlots(next);
  }

  async function handleGive(slot: ConsentSlot) {
    if (!candidate) {
      return;
    }

    setPendingType(slot.type);

    const baseConsent =
      slot.consent ?? (await ensureConsent(candidate.id, slot.type));

    const accepted = await acceptConsent(baseConsent.id);

    if (accepted) {
      addAuditEvent({
        type: "consent_accepted",
        title: "Кандидат принял согласие",
        description: `${candidate.fullName} принял согласие «${typeLabels[slot.type]}»`,
        actorRole: "Candidate",
        candidateId: candidate.id,
        candidateName: candidate.fullName,
      });

      setActionMessage(`Согласие «${typeLabels[slot.type]}» активно`);
    }

    await refreshSlots(candidate.id);
    setPendingType(null);
  }

  async function handleRevoke(slot: ConsentSlot) {
    if (!candidate || !slot.consent) {
      return;
    }

    setPendingType(slot.type);

    const revoked = await revokeConsent(slot.consent.id);

    if (revoked) {
      addAuditEvent({
        type: "consent_revoked",
        title: "Кандидат отозвал согласие",
        description: `${candidate.fullName} отозвал согласие «${typeLabels[slot.type]}»`,
        actorRole: "Candidate",
        candidateId: candidate.id,
        candidateName: candidate.fullName,
      });

      setActionMessage(`Согласие «${typeLabels[slot.type]}» отозвано`);
    }

    await refreshSlots(candidate.id);
    setPendingType(null);
  }

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
        lead="Согласия привязаны к профилю кандидата. Заполните профиль"
        actions={
          <Link href="/candidate/profile" className="btn btn-primary">
            Заполнить профиль →
          </Link>
        }
      />
    );
  }

  const activeCount = slots.filter(
    (slot) => slot.consent?.status === "active"
  ).length;

  const pendingCount = slots.filter(
    (slot) => slot.consent?.status === "requested"
  ).length;

  const missingCount = slots.filter(
    (slot) => slot.consent === null || slot.consent.status === "not_requested"
  ).length;

  const onboardingComplete = ONBOARDING_CONSENT_TYPES.every((type) =>
    slots.some(
      (slot) => slot.type === type && slot.consent?.status === "active"
    )
  );

  return (
    <>
      <PageHeader
        eyebrow={isWelcome ? "Добро пожаловать" : "Согласия"}
        title={isWelcome ? "Согласия для старта" : "Мои согласия"}
        lead={
          isWelcome
            ? "Перед откликами и проверками нужны согласия на видимость профиля и проверку опыта. Их можно отозвать позже в этом разделе"
            : "Согласия привязаны к профилю и действуют независимо от конкретных откликов. Их можно дать и отозвать в любой момент"
        }
        actions={
          isWelcome ? (
            onboardingComplete ? (
              <Link href="/candidate/profile" className="btn btn-primary">
                Заполнить профиль →
              </Link>
            ) : (
              <Link href="/candidate/dashboard" className="btn">
                Пропустить
              </Link>
            )
          ) : (
            <Link href="/candidate/profile" className="btn">
              Профиль
            </Link>
          )
        }
      />

      {isWelcome && (
        <div className="auth-callout" style={{ marginBottom: 32 }}>
          {onboardingComplete ? (
            <>
              Базовые согласия активны. Дальше заполните профиль — так
              компании смогут видеть вас в поиске и приглашать на проверки.
            </>
          ) : (
            <>
              Для допуска в базу WireHire активируйте{" "}
              <strong>«{typeLabels.profile_visibility}»</strong> и{" "}
              <strong>«{typeLabels.verification}»</strong>. Остальные типы —
              по желанию.
            </>
          )}
        </div>
      )}

      <StatGrid>
        <Stat value={slots.length} label="Всего типов" />
        <Stat value={activeCount} label="Активные" />
        <Stat value={pendingCount} label="Ожидают ответа" />
        <Stat value={missingCount} label="Не запрошены" />
      </StatGrid>

      {actionMessage && (
        <Placeholder>{actionMessage}</Placeholder>
      )}

      <div style={{ marginTop: 40 }}>
        {slots.length === 0 ? (
          <Placeholder>Типы согласий не настроены</Placeholder>
        ) : (
          <EditorialTable>
            <thead>
              <tr>
                <th>Согласие</th>
                <th>Статус</th>
                <th>Дата</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const status: ConsentLifecycle =
                  slot.consent?.status ?? "not_requested";
                const isActive = status === "active";
                const isBusy = pendingType === slot.type;

                const updatedAt =
                  slot.consent?.revokedAt ??
                  slot.consent?.acceptedAt ??
                  slot.consent?.requestedAt ??
                  "—";

                return (
                  <tr key={slot.type}>
                    <td
                      style={{
                        fontSize: 17,
                        fontWeight: 500,
                        letterSpacing: "-0.012em",
                      }}
                    >
                      {slot.consent ? (
                        <Link href={`/candidate/consents/${slot.consent.id}`}>
                          {typeLabels[slot.type]}
                        </Link>
                      ) : (
                        typeLabels[slot.type]
                      )}
                      <div
                        className="caption"
                        style={{ marginTop: 4, textTransform: "none" }}
                      >
                        {typeDescriptions[slot.type]}
                      </div>
                    </td>
                    <td>
                      <Status tone={lifecycleTones[status]}>
                        {lifecycleLabels[status]}
                      </Status>
                    </td>
                    <td className="mono muted">
                      {updatedAt === "—" ? "—" : formatDate(updatedAt)}
                    </td>
                    <td className="text-right">
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          className="btn btn-primary"
                          onClick={() => handleGive(slot)}
                          disabled={isActive || isBusy}
                          style={{ fontSize: 12, padding: "6px 12px" }}
                        >
                          Дать согласие
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleRevoke(slot)}
                          disabled={!isActive || isBusy}
                          style={
                            isActive
                              ? {
                                  fontSize: 12,
                                  padding: "6px 12px",
                                  borderColor: "var(--risk)",
                                  color: "var(--risk)",
                                }
                              : { fontSize: 12, padding: "6px 12px" }
                          }
                        >
                          Отозвать
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </EditorialTable>
        )}
      </div>
    </>
  );
}