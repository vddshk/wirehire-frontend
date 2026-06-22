import { Candidate } from "@/types/candidate";
import { getCandidateById, updateCandidate } from "./candidates";
import { getCurrentUser } from "./session";
import type { UpdateMyProfileInput } from "../remote/profile";

async function getMyCandidate(): Promise<Candidate> {
  const user = getCurrentUser();
  const candidateId = user.candidateId ?? `candidate-${user.id}`;
  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    throw new Error("Кандидат не найден в локальном хранилище");
  }
  return candidate;
}

export async function getMyProfile(): Promise<Candidate> {
  return getMyCandidate();
}

export async function updateMyProfile(
  input: UpdateMyProfileInput
): Promise<Candidate> {
  const current = await getMyCandidate();
  const next: Candidate = {
    ...current,
    fullName: input.fullName ?? current.fullName,
    headline: input.headline ?? current.headline,
    desiredRole: input.desiredRole ?? current.desiredRole,
    summary: input.summary ?? current.summary,
    location: input.location ?? current.location,
    workFormat: input.workFormat ?? current.workFormat,
    visibilityMode: input.visibilityMode ?? current.visibilityMode,
    email: input.contacts?.email ?? current.email,
    phone: input.contacts?.phone ?? current.phone,
  };
  return updateCandidate(next);
}
