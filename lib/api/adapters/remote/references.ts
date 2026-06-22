import { Reference, ReferenceStatus } from "@/types/reference";
import { formatDate } from "@/lib/utils/date";
import { apiClient } from "./client";
import type { SubmitReferenceResponse } from "../local/references";

// Публичный endpoint референта — БЕЗ Bearer (auth: "none"). Токен в URL.
interface BackendPublicReference {
  id: string;
  status: ReferenceStatus;
  reference_company_name: string;
  reference_contact_name?: string | null;
  reference_contact_email?: string | null;
  requested_at?: string | null;
  expires_at?: string | null;
  responded_at?: string | null;
  response_text?: string | null;
  positive_signal: boolean;
  experience_summary?: Record<string, unknown>;
}

interface ReferenceEnvelope {
  data: BackendPublicReference;
}

// Публичный ответ не раскрывает candidateId/experienceId (приватные данные),
// поэтому в Reference они пустые — на странице референта не используются.
function mapReference(b: BackendPublicReference, token: string): Reference {
  return {
    id: b.id,
    experienceId: "",
    candidateId: "",
    referenceCompanyName: b.reference_company_name,
    referenceContactName: b.reference_contact_name ?? "",
    referenceContactEmail: b.reference_contact_email ?? "",
    status: b.status,
    token,
    requestedAt: b.requested_at ? formatDate(b.requested_at) : "",
    expiresAt: b.expires_at ? formatDate(b.expires_at) : "",
    respondedAt: b.responded_at ? formatDate(b.responded_at) : undefined,
    responseText: b.response_text ?? undefined,
    positiveSignal: b.positive_signal,
  };
}

/** GET /ref/{token} — данные для формы референта. */
export async function getReferenceByToken(
  token: string
): Promise<Reference | null> {
  const response = await apiClient<ReferenceEnvelope>(`/ref/${token}`, {
    method: "GET",
    auth: "none",
  });
  return response.data ? mapReference(response.data, token) : null;
}

/** POST /ref/{token}/open — отметить просмотр (опционально). */
export async function markOpened(token: string): Promise<Reference | null> {
  const response = await apiClient<ReferenceEnvelope>(`/ref/${token}/open`, {
    method: "POST",
    auth: "none",
  });
  return response?.data ? mapReference(response.data, token) : null;
}

/** POST /ref/{token}/respond — отправить вердикт референта. */
export async function submitResponse(
  token: string,
  response: SubmitReferenceResponse
): Promise<Reference | null> {
  const result = await apiClient<ReferenceEnvelope>(`/ref/${token}/respond`, {
    method: "POST",
    auth: "none",
    body: {
      verdict: response.verdict,
      ...(response.responseText
        ? { response_text: response.responseText }
        : {}),
    },
  });
  return result?.data ? mapReference(result.data, token) : null;
}
