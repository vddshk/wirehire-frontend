import type { ProctoringEventPayload } from "@/types/proctoring";
import { getStoredArray, setStoredArray } from "./storage";

const PROCTORING_EVENTS_KEY = "wirehire-proctoring-events";

export async function logProctoringEvent(
  payload: ProctoringEventPayload
): Promise<void> {
  const events = getStoredArray<ProctoringEventPayload>(PROCTORING_EVENTS_KEY);
  setStoredArray(PROCTORING_EVENTS_KEY, [...events, payload]);
}
