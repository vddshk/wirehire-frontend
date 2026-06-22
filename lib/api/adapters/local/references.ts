import { mockReferences } from "@/data/mockReferences";
import { Reference, ReferenceStatus } from "@/types/reference";
import { getStoredArray, setStoredArray } from "./storage";

const REFERENCES_STORAGE_KEY = "wirehire-references";

const EXPIRES_IN_DAYS = 14;

function nowIso() {
  return new Date().toLocaleDateString("ru-RU");
}

function expiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + EXPIRES_IN_DAYS);
  return d.toLocaleDateString("ru-RU");
}

function generateToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSaved(): Reference[] {
  return getStoredArray<Reference>(REFERENCES_STORAGE_KEY);
}

function persist(refs: Reference[]) {
  setStoredArray<Reference>(REFERENCES_STORAGE_KEY, refs);
}

function mergeWithMocks(saved: Reference[]): Reference[] {
  const deduped = mockReferences.filter(
    (m) => !saved.some((s) => s.id === m.id)
  );
  return [...deduped, ...saved];
}

export async function getReferences(): Promise<Reference[]> {
  const saved = getSaved();
  if (saved.length > 0) {
    return mergeWithMocks(saved);
  }
  persist(mockReferences);
  return mockReferences;
}

export async function getReferencesByExperienceId(
  experienceId: string
): Promise<Reference[]> {
  const refs = await getReferences();
  return refs.filter((r) => r.experienceId === experienceId);
}

export async function getReferencesByCandidateId(
  candidateId: string
): Promise<Reference[]> {
  const refs = await getReferences();
  return refs.filter((r) => r.candidateId === candidateId);
}

export async function getReferenceByToken(
  token: string
): Promise<Reference | null> {
  const refs = await getReferences();
  return refs.find((r) => r.token === token) ?? null;
}

export type CreateReferenceInput = {
  experienceId: string;
  candidateId: string;
  referenceCompanyName: string;
  referenceContactName: string;
  referenceContactEmail: string;
};

export async function createForExperience(
  input: CreateReferenceInput
): Promise<Reference> {
  const refs = await getReferences();

  const newRef: Reference = {
    id: `ref-${Date.now()}`,
    experienceId: input.experienceId,
    candidateId: input.candidateId,
    referenceCompanyName: input.referenceCompanyName,
    referenceContactName: input.referenceContactName,
    referenceContactEmail: input.referenceContactEmail,
    status: "pending",
    token: generateToken(),
    requestedAt: nowIso(),
    expiresAt: expiresAt(),
    positiveSignal: false,
  };

  persist([...refs, newRef]);

  return newRef;
}

export type SubmitReferenceResponse = {
  verdict: "positive" | "partial" | "negative";
  responseText?: string;
};

export async function submitResponse(
  token: string,
  response: SubmitReferenceResponse
): Promise<Reference | null> {
  const refs = await getReferences();

  const verdictToStatus: Record<
    SubmitReferenceResponse["verdict"],
    ReferenceStatus
  > = {
    positive: "answered_positive",
    partial: "answered_partial",
    negative: "answered_negative",
  };

  let updated: Reference | null = null;

  const next = refs.map((r) => {
    if (r.token !== token) {
      return r;
    }

    updated = {
      ...r,
      status: verdictToStatus[response.verdict],
      responseText: response.responseText,
      positiveSignal: response.verdict === "positive",
      respondedAt: nowIso(),
    };

    return updated;
  });

  persist(next);
  return updated;
}

export async function markOpened(token: string): Promise<Reference | null> {
  const refs = await getReferences();

  let updated: Reference | null = null;

  const next = refs.map((r) => {
    if (r.token !== token || r.status !== "pending") {
      return r;
    }
    updated = { ...r, status: "opened" as ReferenceStatus };
    return updated;
  });

  persist(next);
  return updated;
}
