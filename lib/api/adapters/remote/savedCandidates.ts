import type { SavedCandidate } from "@/types/savedCandidate";
import { apiClient } from "./client";
import {
  BackendPublicCandidate,
  mapCandidate,
} from "./candidates";

interface BackendSavedCandidate {
  id: string;
  company_id: string;
  candidate_id: string;
  saved_by_user_id?: string | null;
  note?: string | null;
  saved_at?: string | null;
  candidate?: BackendPublicCandidate | null;
}

interface SavedCandidateEnvelope {
  data: BackendSavedCandidate;
}

interface SavedCandidatePaginated {
  data: BackendSavedCandidate[];
}

function mapSavedCandidate(b: BackendSavedCandidate): SavedCandidate {
  return {
    id: b.id,
    companyId: b.company_id,
    candidateId: b.candidate_id,
    savedByUserId: b.saved_by_user_id ?? undefined,
    note: b.note ?? undefined,
    savedAt: b.saved_at ?? undefined,
    candidate: b.candidate ? mapCandidate(b.candidate) : null,
  };
}

export interface ListSavedCandidatesOptions {
  page?: number;
  perPage?: number;
}

function buildQuery(opts: ListSavedCandidatesOptions): string {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("per_page", String(opts.perPage));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** GET /me/saved-candidates — shortlist текущего HR/менеджера. */
export async function getSavedCandidates(
  opts: ListSavedCandidatesOptions = {}
): Promise<SavedCandidate[]> {
  const response = await apiClient<SavedCandidatePaginated>(
    `/me/saved-candidates${buildQuery(opts)}`,
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapSavedCandidate);
}

/** GET /me/saved-candidates/{id} — одна запись с полной карточкой. */
export async function getSavedCandidateById(
  id: string
): Promise<SavedCandidate> {
  const response = await apiClient<SavedCandidateEnvelope>(
    `/me/saved-candidates/${id}`,
    { method: "GET", auth: "required" }
  );
  return mapSavedCandidate(response.data);
}

/** POST /me/saved-candidates — добавить кандидата в shortlist.
 *  Повторное сохранение того же кандидата → бэк вернет 422. */
export async function createSavedCandidate(input: {
  candidateId: string;
  note?: string;
}): Promise<SavedCandidate> {
  const response = await apiClient<SavedCandidateEnvelope>(
    `/me/saved-candidates`,
    {
      method: "POST",
      auth: "required",
      body: {
        candidate_id: input.candidateId,
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    }
  );
  return mapSavedCandidate(response.data);
}

/** PATCH /me/saved-candidates/{id} — обновить заметку. */
export async function updateSavedCandidateNote(
  id: string,
  note: string | null
): Promise<SavedCandidate> {
  const response = await apiClient<SavedCandidateEnvelope>(
    `/me/saved-candidates/${id}`,
    {
      method: "PATCH",
      auth: "required",
      body: { note },
    }
  );
  return mapSavedCandidate(response.data);
}

/** DELETE /me/saved-candidates/{id} — удалить из shortlist. */
export async function deleteSavedCandidate(id: string): Promise<void> {
  await apiClient<void>(`/me/saved-candidates/${id}`, {
    method: "DELETE",
    auth: "required",
  });
}
