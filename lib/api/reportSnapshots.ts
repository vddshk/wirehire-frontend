import { getCurrentRole } from "./session";
import * as remote from "./adapters/remote/reportSnapshots";
import type { ReportSnapshot } from "@/types/reportSnapshot";

// Сводный отчет по прогону. Кандидат — /me/..., HR/менеджер — общий путь.
export async function getReportSnapshotForRun(
  runId: string
): Promise<ReportSnapshot | null> {
  const role = getCurrentRole();
  if (role === "candidate") {
    return remote.getMyReportSnapshot(runId);
  }
  return remote.getReportSnapshotForRun(runId);
}

// HR-действия с отчетом (override / сброс) — remote напрямую.
export {
  overrideReportSnapshot,
  clearReportSnapshotOverride,
} from "./adapters/remote/reportSnapshots";
