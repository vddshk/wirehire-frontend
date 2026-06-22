import type { CandidateStatus, WorkFormat } from "./candidate";
import type { CandidatePool } from "@/lib/api/adapters/remote/candidates";

export type CandidateFilterType =
  | "select"
  | "text"
  | "search"
  | "toggle"
  | "range"
  | "multiselect";

export type CandidateFilterGroup =
  | "primary"
  | "advanced"
  | "quality"
  | "deprecated";

export type CandidateFilterOption = {
  value: string;
  label: string;
};

export type CandidateFilterDefinition = {
  key: string;
  type: CandidateFilterType;
  label: string;
  default?: string;
  placeholder?: string;
  options?: CandidateFilterOption[];
  /** Где показывать в UI (если не задано — advanced для select/text). */
  group?: CandidateFilterGroup;
  /** Для type=range */
  min?: number;
  max?: number;
  step?: number;
  /** Поле ещё не поддерживается бэком — показываем disabled + подсказку. */
  backendReady?: boolean;
  helpText?: string;
};

export type CandidateSearchSort =
  | "relevance"
  | "assessment_score"
  | "profile_updated";

export type CandidateSearchFilters = {
  pool?: CandidatePool;
  location?: string;
  workFormat?: WorkFormat;
  verificationStatus?: CandidateStatus;
  q?: string;
  /** @deprecated Используйте skillsMust */
  skill?: string;
  skillsMust?: string[];
  skillsNice?: string[];
  minAssessmentScore?: number;
  skillConfirmedOnly?: boolean;
  verifiedExperienceOnly?: boolean;
  proctoredOnly?: boolean;
  /** Контекст пресета из вакансии — для аналитики на бэке. */
  vacancyId?: string;
  sort?: CandidateSearchSort;
  page?: number;
  perPage?: number;
};

export type CandidateSearchMeta = {
  total: number;
  poolTotal: number;
};
