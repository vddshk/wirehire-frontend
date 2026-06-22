import type { ReportSnapshot } from "@/types/reportSnapshot";
import { ApiError, apiClient } from "./client";
import { mapReportSnapshot, type BackendReportSnapshot } from "./reportSnapshots";

export async function getLatestReportSnapshotForCandidate(
  candidateId: string,
  vacancyId?: string
): Promise<ReportSnapshot | null> {
  const query = vacancyId ? `?vacancy_id=${encodeURIComponent(vacancyId)}` : "";
  try {
    const response = await apiClient<{ data: BackendReportSnapshot }>(
      `/candidates/${candidateId}/latest-report-snapshot${query}`,
      { method: "GET", auth: "required" }
    );
    return mapReportSnapshot(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
