import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/profileReports";
import * as remote from "./adapters/remote/profileReports";
import type { ProfileReport } from "@/types/profileReport";
import type { ProfileReportFetchResult } from "@/types/profileReportFetch";

export async function getProfileReports(): Promise<ProfileReport[]> {
  return local.getProfileReports();
}

export async function fetchProfileReportForCandidate(
  candidateId: string
): Promise<ProfileReportFetchResult> {
  return USE_REMOTE_API
    ? remote.fetchProfileReportForCandidate(candidateId)
    : local.fetchProfileReportForCandidate(candidateId);
}

export async function getProfileReportByCandidateId(
  candidateId: string
): Promise<ProfileReport | null> {
  return USE_REMOTE_API
    ? remote.getProfileReportByCandidateId(candidateId)
    : local.getProfileReportByCandidateId(candidateId);
}

export async function saveProfileReport(
  report: ProfileReport
): Promise<ProfileReport> {
  return local.saveProfileReport(report);
}
