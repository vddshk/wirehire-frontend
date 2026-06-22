import { getCurrentRole } from "./session";
import * as remote from "./adapters/remote/skillVerifications";
import type { SkillVerification } from "@/types/skillVerification";

// Проверки навыков по прогону. Кандидат смотрит свой через /me/..., HR/менеджер
// — общий /verification-runs/{id}/skill-verifications. Выбор по роли.
export async function getSkillVerificationsForRun(
  runId: string
): Promise<SkillVerification[]> {
  const role = getCurrentRole();
  if (role === "candidate") {
    return remote.getMySkillVerifications(runId);
  }
  return remote.getSkillVerificationsForRun(runId);
}
