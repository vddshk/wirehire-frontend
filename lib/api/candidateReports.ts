import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/candidateReports";
import * as remote from "./adapters/remote/candidateReports";
import type { ReportSnapshot } from "@/types/reportSnapshot";

export async function getLatestReportSnapshotForCandidate(
  candidateId: string,
  vacancyId?: string
): Promise<ReportSnapshot | null> {
  return USE_REMOTE_API
    ? remote.getLatestReportSnapshotForCandidate(candidateId, vacancyId)
    : local.getLatestReportSnapshotForCandidate(candidateId, vacancyId);
}
