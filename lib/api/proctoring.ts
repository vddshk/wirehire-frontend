import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/proctoring";
import * as remote from "./adapters/remote/proctoring";
import type { ProctoringEventPayload } from "@/types/proctoring";

export type {
  ProctoringContext,
  ProctoringRiskLevel,
  ProctoringSession,
  ProctoringSessionStatus,
} from "./adapters/remote/proctoring";

export async function logProctoringEvent(
  payload: ProctoringEventPayload
): Promise<void> {
  if (USE_REMOTE_API) {
    try {
      await remote.logProctoringEvent(payload);
      return;
    } catch {
      // fallback — не теряем событие при сетевой ошибке
    }
  }
  await local.logProctoringEvent(payload);
}

export const getProctoringContext = USE_REMOTE_API
  ? remote.getProctoringContext
  : async () => ({
      proctoringEnabled: false,
      proctoringRequired: false,
      rulesText: "",
      consentActive: false,
      session: null,
    });

export const startProctoringSession = USE_REMOTE_API
  ? remote.startProctoringSession
  : async (_testId: string, _permissionsGranted: boolean) => {
      throw new Error("Proctoring sessions require remote API.");
    };

export const declineProctoringSession = USE_REMOTE_API
  ? remote.declineProctoringSession
  : async () => {
      throw new Error("Proctoring sessions require remote API.");
    };

export const appendProctoringEvents = USE_REMOTE_API
  ? remote.appendProctoringEvents
  : async () => {
      throw new Error("Proctoring sessions require remote API.");
    };

export const finishProctoringSession = USE_REMOTE_API
  ? remote.finishProctoringSession
  : async () => {
      throw new Error("Proctoring sessions require remote API.");
    };

export const getProctoringSession = USE_REMOTE_API
  ? remote.getProctoringSession
  : async () => {
      throw new Error("Proctoring sessions require remote API.");
    };
