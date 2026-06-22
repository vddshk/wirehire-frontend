import type {
  ProctoringEventPayload,
  ProctoringEventType,
  ProctoringViolationCounts,
} from "@/types/proctoring";
import { apiClient } from "./client";

export type ProctoringSessionStatus =
  | "active"
  | "completed"
  | "declined"
  | "terminated";

export type ProctoringRiskLevel = "low" | "medium" | "high" | "review";

export type ProctoringSession = {
  id: string;
  testResultId: string;
  status: ProctoringSessionStatus;
  riskScore: number | null;
  riskLevel: ProctoringRiskLevel | null;
  violationsCount: number;
  events: Array<{
    type: string;
    occurred_at?: string;
    metadata?: Record<string, unknown>;
  }>;
  startedAt?: string;
  endedAt?: string;
};

export type ProctoringContext = {
  proctoringEnabled: boolean;
  proctoringRequired: boolean;
  rulesText: string;
  consentActive: boolean;
  session: ProctoringSession | null;
};

interface BackendProctoringSession {
  id: string;
  test_result_id: string;
  status: ProctoringSessionStatus;
  risk_score?: number | null;
  risk_level?: ProctoringRiskLevel | null;
  violations_count?: number;
  events?: Array<{
    type: string;
    occurred_at?: string;
    metadata?: Record<string, unknown>;
  }>;
  started_at?: string;
  ended_at?: string;
}

interface BackendProctoringContext {
  proctoring_enabled: boolean;
  proctoring_required: boolean;
  rules_text: string;
  consent_active: boolean;
  session?: BackendProctoringSession | null;
}

function mapSession(raw: BackendProctoringSession): ProctoringSession {
  return {
    id: raw.id,
    testResultId: raw.test_result_id,
    status: raw.status,
    riskScore: raw.risk_score ?? null,
    riskLevel: raw.risk_level ?? null,
    violationsCount: raw.violations_count ?? 0,
    events: raw.events ?? [],
    startedAt: raw.started_at,
    endedAt: raw.ended_at,
  };
}

/** GET /me/tests/{testId}/proctoring — контекст прокторинга для теста. */
export async function getProctoringContext(
  testId: string
): Promise<ProctoringContext> {
  const response = await apiClient<BackendProctoringContext>(
    `/me/tests/${testId}/proctoring`,
    { method: "GET", auth: "required" }
  );

  return {
    proctoringEnabled: response.proctoring_enabled,
    proctoringRequired: response.proctoring_required,
    rulesText: response.rules_text,
    consentActive: response.consent_active,
    session: response.session ? mapSession(response.session) : null,
  };
}

/** POST /me/tests/{testId}/proctoring/start — начать proctoring-session. */
export async function startProctoringSession(
  testId: string,
  permissionsGranted: boolean
): Promise<ProctoringSession> {
  const response = await apiClient<{ data: BackendProctoringSession }>(
    `/me/tests/${testId}/proctoring/start`,
    {
      method: "POST",
      auth: "required",
      body: { permissions_granted: permissionsGranted },
    }
  );

  return mapSession(response.data);
}

/** POST /me/tests/{testId}/proctoring/decline — отказ от прокторинга. */
export async function declineProctoringSession(
  testId: string,
  reason: "consent_denied" | "permissions_denied" | "candidate_opt_out"
): Promise<ProctoringSession> {
  const response = await apiClient<{ data: BackendProctoringSession }>(
    `/me/tests/${testId}/proctoring/decline`,
    {
      method: "POST",
      auth: "required",
      body: { reason },
    }
  );

  return mapSession(response.data);
}

/** POST /me/proctoring-sessions/{id}/events — записать anti-fraud события. */
export async function appendProctoringEvents(
  sessionId: string,
  events: Array<{
    type: ProctoringEventType | string;
    occurredAt?: string;
    metadata?: Record<string, unknown>;
  }>
): Promise<ProctoringSession> {
  const response = await apiClient<{ data: BackendProctoringSession }>(
    `/me/proctoring-sessions/${sessionId}/events`,
    {
      method: "POST",
      auth: "required",
      body: {
        events: events.map((event) => ({
          type: event.type,
          occurred_at: event.occurredAt,
          metadata: event.metadata,
        })),
      },
    }
  );

  return mapSession(response.data);
}

/** POST /me/proctoring-sessions/{id}/finish — завершить session и рассчитать risk. */
export async function finishProctoringSession(
  sessionId: string
): Promise<ProctoringSession> {
  const response = await apiClient<{ data: BackendProctoringSession }>(
    `/me/proctoring-sessions/${sessionId}/finish`,
    { method: "POST", auth: "required" }
  );

  return mapSession(response.data);
}

/** GET /proctoring-sessions/{id} — детали session (кандидат / HR). */
export async function getProctoringSession(
  sessionId: string
): Promise<ProctoringSession> {
  const response = await apiClient<{ data: BackendProctoringSession }>(
    `/proctoring-sessions/${sessionId}`,
    { method: "GET", auth: "required" }
  );

  return mapSession(response.data);
}

/**
 * POST /me/proctoring/events — совместимость с текущим фронтом.
 * Если session_id — UUID активной session, событие также попадет в proctoring_sessions.
 */
export async function logProctoringEvent(
  payload: ProctoringEventPayload
): Promise<void> {
  await apiClient<{ message: string }>("/me/proctoring/events", {
    method: "POST",
    auth: "required",
    body: {
      session_id: payload.sessionId,
      package_id: payload.packageId,
      event_type: payload.eventType,
      occurred_at: payload.occurredAt,
      counts: payload.counts as ProctoringViolationCounts,
    },
  });
}
