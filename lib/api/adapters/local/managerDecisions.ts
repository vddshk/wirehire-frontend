import { ManagerDecision } from "@/types/managerDecision";
import { getStoredArray, setStoredArray } from "./storage";

const MANAGER_DECISIONS_STORAGE_KEY = "wirehire-manager-decisions";

export async function getManagerDecisions(): Promise<ManagerDecision[]> {
  return getStoredArray<ManagerDecision>(MANAGER_DECISIONS_STORAGE_KEY);
}

export async function getManagerDecisionByReportId(
  reportId: string
): Promise<ManagerDecision | null> {
  const decisions = await getManagerDecisions();

  return decisions.find((decision) => decision.reportId === reportId) ?? null;
}

export async function saveManagerDecision(
  decision: ManagerDecision
): Promise<ManagerDecision> {
  const decisions = await getManagerDecisions();

  const decisionsWithoutCurrent = decisions.filter(
    (item) => item.reportId !== decision.reportId
  );

  setStoredArray<ManagerDecision>(MANAGER_DECISIONS_STORAGE_KEY, [
    ...decisionsWithoutCurrent,
    decision,
  ]);

  return decision;
}
