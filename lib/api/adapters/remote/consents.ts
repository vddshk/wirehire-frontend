import {
  Consent,
  ConsentChannel,
  ConsentLifecycle,
  ConsentType,
} from "@/types/consent";
import { ApiError, apiClient } from "./client";

// === Бэк-контракт (snake_case) ===

interface BackendConsent {
  id: string;
  candidate_id: string;
  consent_type: ConsentType;
  status: "requested" | "active" | "revoked" | "expired";
  channel?: ConsentChannel | null;
  text_version: string;
  granted_at?: string | null;
  revoked_at?: string | null;
  created_at?: string | null;
}

interface BackendConsentSlot {
  consent_type: ConsentType;
  consent: BackendConsent | null;
}

interface ConsentEnvelope {
  data: BackendConsent;
}

interface ConsentPaginated {
  data: BackendConsent[];
}

interface ConsentSlotList {
  data: BackendConsentSlot[];
}

// === Маппер ===

function mapConsent(b: BackendConsent): Consent {
  return {
    id: b.id,
    candidateId: b.candidate_id,
    type: b.consent_type,
    status: b.status as ConsentLifecycle,
    channel: (b.channel ?? "in_app") as ConsentChannel,
    textVersion: b.text_version,
    requestedAt: b.created_at ?? undefined,
    acceptedAt: b.granted_at ?? undefined,
    revokedAt: b.revoked_at ?? undefined,
  };
}

// === Фиксированный порядок типов (как в локальном адаптере) ===

export const consentTypeOrder: ConsentType[] = [
  "profile_visibility",
  "communication",
  "verification",
  "proctoring",
];

export type CreateConsentInput = {
  candidateId: string;
  type: ConsentType;
  channel: ConsentChannel;
  textVersion?: string;
};

export type ConsentSlot = {
  type: ConsentType;
  consent: Consent | null;
};

// === Запросы ===

// GET /me/consents — история согласий текущего кандидата (бэк сам берет его по
// токену). candidateId-аргумент в фасаде остается для совместимости с UI,
// но игнорируется здесь.
export async function getConsents(): Promise<Consent[]> {
  const response = await apiClient<ConsentPaginated>("/me/consents", {
    method: "GET",
    auth: "required",
  });
  return response.data.map(mapConsent);
}

export async function getConsentsByCandidateId(
  _candidateId: string
): Promise<Consent[]> {
  void _candidateId;
  try {
    return await getConsents();
  } catch (err) {
    // HR смотрит чужой профиль и зовет getConsentsByCandidateId на чужой
    // candidateId — у бэка для этого пока нет публичного эндпоинта, тихо
    // возвращаем пустой список, чтобы UI не падал.
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return [];
    }
    throw err;
  }
}

export async function getConsentById(consentId: string): Promise<Consent | null> {
  const consents = await getConsents();
  return consents.find((consent) => consent.id === consentId) ?? null;
}

// GET /me/consents/slots — 4 фиксированных слота с последней записью или null.
export async function getConsentSlotsByCandidateId(
  _candidateId: string
): Promise<ConsentSlot[]> {
  void _candidateId;
  const response = await apiClient<ConsentSlotList>("/me/consents/slots", {
    method: "GET",
    auth: "required",
  });
  return response.data.map((slot) => ({
    type: slot.consent_type,
    consent: slot.consent ? mapConsent(slot.consent) : null,
  }));
}

// POST /me/consents — кандидат инициирует запрос (status=requested).
export async function createConsent(input: CreateConsentInput): Promise<Consent> {
  const response = await apiClient<ConsentEnvelope>("/me/consents", {
    method: "POST",
    auth: "required",
    body: {
      consent_type: input.type,
      channel: input.channel,
      ...(input.textVersion ? { text_version: input.textVersion } : {}),
    },
  });
  return mapConsent(response.data);
}

// requestConsent у нас исторически возвращает Consent | null. На бэке это
// тот же POST /me/consents — приводим к старому контракту.
export async function requestConsent(_consentId: string): Promise<Consent | null> {
  void _consentId;
  console.warn(
    "requestConsent(id) больше не делает запрос — используй createConsent / ensureConsent"
  );
  return null;
}

// POST /me/consents/{id}/activate — requested → active.
export async function acceptConsent(
  consentId: string
): Promise<Consent | null> {
  try {
    const response = await apiClient<ConsentEnvelope>(
      `/me/consents/${consentId}/activate`,
      { method: "POST", auth: "required" }
    );
    return mapConsent(response.data);
  } catch (err) {
    console.warn("activate consent failed:", err);
    return null;
  }
}

// POST /me/consents/{id}/revoke — active → revoked.
// Для profile_visibility бэк сам переводит профиль в visibility_mode=private.
export async function revokeConsent(
  consentId: string
): Promise<Consent | null> {
  try {
    const response = await apiClient<ConsentEnvelope>(
      `/me/consents/${consentId}/revoke`,
      { method: "POST", auth: "required" }
    );
    return mapConsent(response.data);
  } catch (err) {
    console.warn("revoke consent failed:", err);
    return null;
  }
}

// Бэк не дает ручного «протухания» — это серверный процесс. No-op, чтобы
// импорт не ломался.
export async function expireConsent(
  _consentId: string
): Promise<Consent | null> {
  void _consentId;
  return null;
}

// Helper: вернуть существующее согласие или создать новое (requested).
export async function ensureConsent(
  candidateId: string,
  type: ConsentType,
  channel: ConsentChannel = "in_app"
): Promise<Consent> {
  const consents = await getConsents();
  const existing = consents.find(
    (consent) =>
      consent.type === type &&
      (consent.status === "requested" || consent.status === "active")
  );
  if (existing) return existing;
  return createConsent({ candidateId, type, channel });
}
