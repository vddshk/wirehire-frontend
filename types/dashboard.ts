/**
 * Соответствует CandidateDashboardData из docs/openapi.yaml.
 * Endpoint: GET /me/dashboard
 */
export type CandidateDashboard = {
  /** Сырой статус кандидата с бэка (`draft`, `published`, `admitted_to_talent_pool`, и т.д.) */
  candidateStatus: string;
  /** Доля заполненности профиля 0–100. */
  profileCompletionPercent: number;
  /** Ключи: full_name, location, headline, summary, resume — true если заполнено. */
  profileChecks: Record<string, boolean>;
  /** Сколько активных откликов (без withdrawn). */
  applicationsCount: number;
  /** Сколько карточек опыта. */
  experiencesCount: number;
};
