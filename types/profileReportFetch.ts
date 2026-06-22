import type { ProfileReport } from "./profileReport";

export type ProfileReportFetchResult = {
  report: ProfileReport | null;
  /** 403 — нет доступа к profile-report */
  accessDenied?: boolean;
  accessDeniedMessage?: string;
  /** 404 — доступ есть, snapshot еще не готов */
  missingBlocks?: string[];
  candidateStatus?: string;
};
