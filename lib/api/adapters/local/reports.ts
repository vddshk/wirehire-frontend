import { VerificationReport } from "@/types/report";
import { getStoredArray, setStoredArray } from "./storage";

const REPORTS_STORAGE_KEY = "wirehire-reports";

export async function getReports(): Promise<VerificationReport[]> {
  return getStoredArray<VerificationReport>(REPORTS_STORAGE_KEY);
}

export async function getReportById(
  reportId: string
): Promise<VerificationReport | null> {
  const reports = await getReports();
  return reports.find((report) => report.id === reportId) ?? null;
}

export async function getReportByVerificationRunId(
  verificationRunId: string
): Promise<VerificationReport | null> {
  const reports = await getReports();
  return (
    reports.find((report) => report.verificationRunId === verificationRunId) ??
    null
  );
}

export async function getReportsByCandidateId(
  candidateId: string
): Promise<VerificationReport[]> {
  const reports = await getReports();
  return reports.filter((report) => report.candidateId === candidateId);
}

export async function saveReport(
  report: VerificationReport
): Promise<VerificationReport> {
  const reports = await getReports();
  const next = reports.filter((item) => item.id !== report.id);
  setStoredArray<VerificationReport>(REPORTS_STORAGE_KEY, [...next, report]);
  return report;
}

// FR-053: manual override. Stores the override side-by-side with the original
// AI-derived score; original keyFindings / risks / nextSteps stay intact for
// auditability.
export async function applyManualOverride(
  reportId: string,
  override: {
    overrideStatus: VerificationReport["overallStatus"];
    overrideReason: string;
    overriddenBy: string;
  }
): Promise<VerificationReport | null> {
  const report = await getReportById(reportId);
  if (!report) return null;
  const updated: VerificationReport = {
    ...report,
    overrideStatus: override.overrideStatus,
    overrideReason: override.overrideReason,
    overriddenBy: override.overriddenBy,
    overriddenAt: new Date().toLocaleDateString("ru-RU"),
  };
  return saveReport(updated);
}

export async function clearManualOverride(
  reportId: string
): Promise<VerificationReport | null> {
  const report = await getReportById(reportId);
  if (!report) return null;
  const updated: VerificationReport = {
    ...report,
    overrideStatus: undefined,
    overrideReason: undefined,
    overriddenBy: undefined,
    overriddenAt: undefined,
  };
  return saveReport(updated);
}
