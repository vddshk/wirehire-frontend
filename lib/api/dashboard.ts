import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/dashboard";
import * as remote from "./adapters/remote/dashboard";
import { CandidateDashboard } from "@/types/dashboard";

/**
 * Сначала пытаемся получить дашборд с бэка (когда USE_REMOTE_API=true).
 * Если бэк недоступен или вернул 401/403 (нет токена кандидата) — считаем
 * локально из мок-данных. Это дает корректные плитки в любом режиме.
 */
export async function getCandidateDashboard(): Promise<CandidateDashboard> {
  if (USE_REMOTE_API) {
    try {
      return await remote.getCandidateDashboard();
    } catch {
      // fallthrough — посчитаем локально
    }
  }
  return local.getCandidateDashboard();
}
