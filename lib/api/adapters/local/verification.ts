import { VerificationRun } from "@/types/verification";
import { getStoredArray, setStoredArray } from "./storage";

const VERIFICATION_RUNS_STORAGE_KEY = "wirehire-verification-runs";

export async function createForExperience(input: {
  experienceId: string;
  candidateId: string;
  hasReferenceContact: boolean;
}): Promise<VerificationRun> {
  const runs = await getVerificationRuns();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  const newRun: VerificationRun = {
    id: `vr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    candidateId: input.candidateId,
    experienceId: input.experienceId,
    scope: "trust_only",
    status: input.hasReferenceContact ? "active" : "waiting_consent",
    consentStatus: "active",
    dueAt: dueDate.toLocaleDateString("ru-RU"),
    proctoringEnabled: false,
    createdAt: new Date().toLocaleDateString("ru-RU"),
  };
  setStoredArray<VerificationRun>(VERIFICATION_RUNS_STORAGE_KEY, [
    ...runs,
    newRun,
  ]);
  return newRun;
}

export async function cancelByExperienceId(
  experienceId: string
): Promise<VerificationRun[]> {
  const runs = await getVerificationRuns();
  const updated: VerificationRun[] = [];
  const next = runs.map((run) => {
    if (run.experienceId !== experienceId) return run;
    if (run.status === "completed" || run.status === "cancelled") return run;
    const cancelled: VerificationRun = { ...run, status: "cancelled" };
    updated.push(cancelled);
    return cancelled;
  });
  setStoredArray<VerificationRun>(VERIFICATION_RUNS_STORAGE_KEY, next);
  return updated;
}

export async function getActiveRunByExperienceId(
  experienceId: string
): Promise<VerificationRun | null> {
  const runs = await getVerificationRuns();
  return (
    runs.find(
      (run) =>
        run.experienceId === experienceId &&
        run.status !== "cancelled" &&
        run.status !== "completed"
    ) ?? null
  );
}

export async function getVerificationRuns(): Promise<VerificationRun[]> {
  return getStoredArray<VerificationRun>(VERIFICATION_RUNS_STORAGE_KEY);
}

export async function getVerificationRunById(
  verificationRunId: string
): Promise<VerificationRun | null> {
  const runs = await getVerificationRuns();

  return runs.find((run) => run.id === verificationRunId) ?? null;
}

export async function getVerificationRunsByCandidateId(
  candidateId: string
): Promise<VerificationRun[]> {
  const runs = await getVerificationRuns();

  return runs.filter((run) => run.candidateId === candidateId);
}

export async function updateVerificationRun(
  updatedRun: VerificationRun
): Promise<VerificationRun> {
  const runs = await getVerificationRuns();

  const updatedRuns = runs.map((run) => {
    if (run.id !== updatedRun.id) {
      return run;
    }

    return updatedRun;
  });

  setStoredArray<VerificationRun>(VERIFICATION_RUNS_STORAGE_KEY, updatedRuns);

  return updatedRun;
}
