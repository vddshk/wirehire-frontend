import { ResumeFile } from "@/types/candidate";
import { ApiError, apiClient } from "./client";

interface BackendStoredFile {
  id: string;
  original_filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  download_url?: string | null;
  created_at?: string | null;
}

interface BackendStoredFileEnvelope {
  data: BackendStoredFile;
  message?: string;
}

function mapResume(file: BackendStoredFile): ResumeFile {
  return {
    id: file.id,
    fileName: file.original_filename ?? "resume",
    fileUrl: file.download_url ?? "",
    uploadedAt: file.created_at ?? "",
  };
}

/** GET /me/resume — метаданные + временная ссылка на скачивание. */
export async function getMyResume(): Promise<ResumeFile | null> {
  try {
    const response = await apiClient<BackendStoredFileEnvelope>(
      "/me/resume",
      { method: "GET", auth: "required" }
    );
    return mapResume(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

// Серверный лимит: только PDF, до 10 МБ. Дублируем здесь — чтобы дать
// понятную ошибку до сетевого запроса и не гонять большие файлы зря.
const RESUME_MAX_BYTES = 10 * 1024 * 1024;
const RESUME_ALLOWED_MIME = "application/pdf";

/** GET /candidates/{id}/resume — PDF кандидата для HR. */
export async function getCandidateResume(
  candidateId: string
): Promise<ResumeFile | null> {
  try {
    const response = await apiClient<BackendStoredFileEnvelope>(
      `/candidates/${candidateId}/resume`,
      { method: "GET", auth: "required" }
    );
    return mapResume(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** POST /me/resume — multipart/form-data. Только PDF, до 10 МБ. */
export async function uploadMyResume(file: File): Promise<ResumeFile> {
  const isPdf =
    file.type === RESUME_ALLOWED_MIME ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new Error("Резюме можно загрузить только в формате PDF.");
  }
  if (file.size > RESUME_MAX_BYTES) {
    throw new Error("Файл больше 10 МБ. Уменьшите размер и попробуйте снова.");
  }

  const formData = new FormData();
  formData.append("resume", file);
  const response = await apiClient<BackendStoredFileEnvelope>("/me/resume", {
    method: "POST",
    auth: "required",
    body: formData,
  });
  return mapResume(response.data);
}
