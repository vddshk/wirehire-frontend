import { mockConsents } from "@/data/mockConsents";
import {
  Consent,
  ConsentChannel,
  ConsentLifecycle,
  ConsentType,
} from "@/types/consent";
import { getStoredArray, setStoredArray } from "./storage";

const CONSENTS_STORAGE_KEY = "wirehire-consents";

const CURRENT_TEXT_VERSION = "v1.0";

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

function nowIso() {
  return new Date().toISOString();
}

function getSavedConsents(): Consent[] {
  return getStoredArray<Consent>(CONSENTS_STORAGE_KEY);
}

function persistConsents(consents: Consent[]) {
  setStoredArray<Consent>(CONSENTS_STORAGE_KEY, consents);
}

function mergeWithMocks(saved: Consent[]): Consent[] {
  const mocksWithoutDuplicates = mockConsents.filter(
    (mockConsent) =>
      !saved.some((savedConsent) => savedConsent.id === mockConsent.id)
  );

  return [...mocksWithoutDuplicates, ...saved];
}

export async function getConsents(): Promise<Consent[]> {
  const savedConsents = getSavedConsents();

  if (savedConsents.length > 0) {
    return mergeWithMocks(savedConsents);
  }

  persistConsents(mockConsents);

  return mockConsents;
}

export async function getConsentsByCandidateId(
  candidateId: string
): Promise<Consent[]> {
  const consents = await getConsents();

  return consents.filter((consent) => consent.candidateId === candidateId);
}

export async function getConsentById(
  consentId: string
): Promise<Consent | null> {
  const consents = await getConsents();

  return consents.find((consent) => consent.id === consentId) ?? null;
}

export async function createConsent(
  input: CreateConsentInput
): Promise<Consent> {
  const consents = await getConsents();

  const newConsent: Consent = {
    id: `consent-${Date.now()}`,
    candidateId: input.candidateId,
    type: input.type,
    status: "requested",
    channel: input.channel,
    textVersion: input.textVersion ?? CURRENT_TEXT_VERSION,
    requestedAt: nowIso(),
  };

  persistConsents([...consents, newConsent]);

  return newConsent;
}

function applyTransition(
  consent: Consent,
  next: ConsentLifecycle
): Consent {
  const updated: Consent = { ...consent, status: next };

  if (next === "requested" && !updated.requestedAt) {
    updated.requestedAt = nowIso();
  }

  if (next === "active") {
    updated.acceptedAt = nowIso();
    updated.revokedAt = undefined;
  }

  if (next === "revoked") {
    updated.revokedAt = nowIso();
  }

  if (next === "expired" && !updated.expiresAt) {
    updated.expiresAt = nowIso();
  }

  return updated;
}

async function updateConsentStatus(
  consentId: string,
  next: ConsentLifecycle
): Promise<Consent | null> {
  const consents = await getConsents();

  let updatedConsent: Consent | null = null;

  const updatedConsents = consents.map((consent) => {
    if (consent.id !== consentId) {
      return consent;
    }

    updatedConsent = applyTransition(consent, next);

    return updatedConsent;
  });

  persistConsents(updatedConsents);

  return updatedConsent;
}

export async function requestConsent(
  consentId: string
): Promise<Consent | null> {
  return updateConsentStatus(consentId, "requested");
}

export async function acceptConsent(
  consentId: string
): Promise<Consent | null> {
  return updateConsentStatus(consentId, "active");
}

export async function revokeConsent(
  consentId: string
): Promise<Consent | null> {
  return updateConsentStatus(consentId, "revoked");
}

export async function expireConsent(
  consentId: string
): Promise<Consent | null> {
  return updateConsentStatus(consentId, "expired");
}

export type ConsentSlot = {
  type: ConsentType;
  consent: Consent | null;
};

export async function getConsentSlotsByCandidateId(
  candidateId: string
): Promise<ConsentSlot[]> {
  const candidateConsents = await getConsentsByCandidateId(candidateId);

  return consentTypeOrder.map((type) => ({
    type,
    consent:
      candidateConsents.find((consent) => consent.type === type) ?? null,
  }));
}

export async function ensureConsent(
  candidateId: string,
  type: ConsentType,
  channel: ConsentChannel = "in_app"
): Promise<Consent> {
  const candidateConsents = await getConsentsByCandidateId(candidateId);
  const existing = candidateConsents.find((consent) => consent.type === type);

  if (existing) {
    return existing;
  }

  return createConsent({ candidateId, type, channel });
}
