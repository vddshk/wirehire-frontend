import { mockReportSnapshots } from "@/data/mockReportSnapshots";
import type { ReportSnapshot } from "@/types/reportSnapshot";
import { getVerificationRunsByCandidateId } from "./verification";
import { getStoredArray, setStoredArray } from "./storage";

const REPORT_SNAPSHOTS_KEY = "wirehire-report-snapshots";

function bootstrapped(): ReportSnapshot[] {
  const saved = getStoredArray<ReportSnapshot>(REPORT_SNAPSHOTS_KEY);
  if (saved.length > 0) return saved;
  setStoredArray<ReportSnapshot>(REPORT_SNAPSHOTS_KEY, mockReportSnapshots);
  return mockReportSnapshots;
}

export async function getLatestReportSnapshotForCandidate(
  candidateId: string,
  vacancyId?: string
): Promise<ReportSnapshot | null> {
  const snapshots = bootstrapped();
  const runs = await getVerificationRunsByCandidateId(candidateId);
  const completedRuns = runs
    .filter((run) => run.status === "completed" || run.status === "active")
    .filter((run) => !vacancyId || run.vacancyId === vacancyId)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  for (const run of completedRuns) {
    const match = snapshots.find((s) => s.verificationRunId === run.id);
    if (match) return match;
  }

  const linked = snapshots.find((s) => {
    if (vacancyId && s.vacancyId !== vacancyId) return false;
    return completedRuns.some((run) => run.id === s.verificationRunId);
  });
  if (linked) return linked;

  const demoRunByCandidate: Record<string, string> = {
    "cand-demo-current": "vr-demo-1",
  };
  const demoRunId = demoRunByCandidate[candidateId];
  if (!demoRunId) return null;

  return (
    snapshots.find((s) => {
      if (s.verificationRunId !== demoRunId) return false;
      return !vacancyId || s.vacancyId === vacancyId;
    }) ?? null
  );
}
