import { ConfidenceLevel, ReportOverallStatus } from "./report";
import type { AiScreeningDetail } from "./reportSnapshot";

export type ProfileReportWeights = {
  experience: number;
  skills: number;
  proctoring: number;
  /** До миграции на ТЗ §A.13 (3 блока) бэк может отдавать отдельный вес references. */
  references?: number;
};

export type ProfileSnapshot = {
  experienceCount: number;
  skillsCount: number;
  hasProctoring: boolean;
};

export type ProfileReport = {
  id: string;
  candidateId: string;
  version: number;
  generatedAt: string;

  weights: ProfileReportWeights;

  overallStatus: ReportOverallStatus;
  confidenceLevel: ConfidenceLevel;

  experienceScore: number;
  skillsScore: number;
  referencesScore: number | null;
  proctoringScore: number | null;
  referencesPositiveCount: number;
  referencesTotalCount: number;

  summary: string;
  keyFindings: string[];
  risks: string[];
  nextSteps: string[];

  profileSnapshot: ProfileSnapshot;

  weightedScore?: number;
  verificationRunId?: string;
  aiScreening?: AiScreeningDetail;
};
