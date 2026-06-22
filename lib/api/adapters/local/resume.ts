import { ResumeFile } from "@/types/candidate";
import { getCandidateById, updateCandidate } from "./candidates";
import { getCurrentUser } from "./session";

async function getMyCandidate() {
  const user = getCurrentUser();
  const candidateId = user.candidateId ?? `candidate-${user.id}`;
  const candidate = await getCandidateById(candidateId);
  if (!candidate) throw new Error("Кандидат не найден");
  return candidate;
}

export async function getMyResume(): Promise<ResumeFile | null> {
  const candidate = await getMyCandidate();
  return candidate.resume ?? null;
}

export async function getCandidateResume(
  candidateId: string
): Promise<ResumeFile | null> {
  const candidate = await getCandidateById(candidateId);
  return candidate?.resume ?? null;
}

export async function uploadMyResume(file: File): Promise<ResumeFile> {
  const candidate = await getMyCandidate();
  const resume: ResumeFile = {
    id: `resume-${Date.now()}`,
    fileName: file.name,
    fileUrl: URL.createObjectURL(file),
    uploadedAt: new Date().toLocaleDateString("ru-RU"),
  };
  await updateCandidate({ ...candidate, resume });
  return resume;
}
