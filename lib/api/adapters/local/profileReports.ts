import { mockProfileReports } from "@/data/mockProfileReports";
import { ProfileReport } from "@/types/profileReport";
import type { ProfileReportFetchResult } from "@/types/profileReportFetch";
import { getStoredArray, setStoredArray } from "./storage";

const PROFILE_REPORTS_STORAGE_KEY = "wirehire-profile-reports";
const SEED_VERSION_KEY = "wirehire-profile-reports-seed";
// Bump when mockProfileReports changes shape or adds new fixtures.
const CURRENT_SEED_VERSION = "4";

export async function getProfileReports(): Promise<ProfileReport[]> {
  const saved = getStoredArray<ProfileReport>(PROFILE_REPORTS_STORAGE_KEY);
  const seedVersion =
    typeof window !== "undefined"
      ? localStorage.getItem(SEED_VERSION_KEY)
      : null;
  if (saved.length > 0 && seedVersion === CURRENT_SEED_VERSION) return saved;
  // Seed (or re-seed) with mock data — backend bootstraps the same way.
  setStoredArray<ProfileReport>(PROFILE_REPORTS_STORAGE_KEY, mockProfileReports);
  if (typeof window !== "undefined") {
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
  }
  return mockProfileReports;
}

export async function fetchProfileReportForCandidate(
  candidateId: string
): Promise<ProfileReportFetchResult> {
  const report = await getProfileReportByCandidateId(candidateId);
  if (report) {
    return { report };
  }
  return {
    report: null,
    missingBlocks: ["assessment", "references"],
  };
}

export async function getProfileReportByCandidateId(
  candidateId: string
): Promise<ProfileReport | null> {
  const reports = await getProfileReports();
  // Latest version wins when more than one snapshot was stored for a candidate.
  return (
    reports
      .filter((report) => report.candidateId === candidateId)
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}

export async function saveProfileReport(
  report: ProfileReport
): Promise<ProfileReport> {
  const reports = await getProfileReports();
  const next = reports.filter((item) => item.id !== report.id);
  setStoredArray<ProfileReport>(PROFILE_REPORTS_STORAGE_KEY, [...next, report]);
  return report;
}
