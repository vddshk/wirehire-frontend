import { MessageRole, Thread } from "@/types/message";
import { apiClient } from "./client";
import type { CreateThreadInput } from "../local/messages";

interface BackendMessage {
  id: string;
  thread_id: string;
  author_role: MessageRole;
  author_name: string;
  body: string;
  sent_at: string;
}

interface BackendParticipant {
  user_id: string;
  role: MessageRole;
  name: string;
}

interface BackendThread {
  id: string;
  candidate_id: string;
  candidate_name: string;
  vacancy_id: string;
  vacancy_title: string;
  company_name: string;
  participants: BackendParticipant[];
  messages: BackendMessage[];
  updated_at: string;
}

interface ThreadListResponse {
  data: BackendThread[];
}

function mapMessage(b: BackendMessage): Thread["messages"][number] {
  return {
    id: b.id,
    threadId: b.thread_id,
    authorRole: b.author_role,
    authorName: b.author_name,
    body: b.body,
    createdAt: b.sent_at,
  };
}

function mapThread(b: BackendThread): Thread {
  return {
    id: b.id,
    candidateId: b.candidate_id,
    candidateName: b.candidate_name,
    vacancyId: b.vacancy_id,
    vacancyTitle: b.vacancy_title,
    companyName: b.company_name,
    participants: b.participants.map((participant) => ({
      userId: participant.user_id,
      role: participant.role,
      name: participant.name,
    })),
    messages: b.messages.map(mapMessage),
    updatedAt: b.updated_at,
  };
}

export async function getThreads(): Promise<Thread[]> {
  const response = await apiClient<ThreadListResponse>("/me/message-threads", {
    method: "GET",
    auth: "required",
  });
  return response.data.map(mapThread);
}

export async function getThreadsForUser(_userId: string): Promise<Thread[]> {
  return getThreads();
}

export async function getThreadById(threadId: string): Promise<Thread | null> {
  const threads = await getThreads();
  return threads.find((thread) => thread.id === threadId) ?? null;
}

export async function sendMessage(
  threadId: string,
  authorRole: MessageRole,
  authorName: string,
  body: string
): Promise<Thread | null> {
  const [vacancyId, candidateId] = threadId.split(":");
  if (!vacancyId || !candidateId) {
    return null;
  }

  await apiClient<{ data: BackendMessage }>(
    `/vacancies/${vacancyId}/candidates/${candidateId}/messages`,
    {
      method: "POST",
      auth: "required",
      body: { body },
    }
  );

  void authorRole;
  void authorName;

  return getThreadById(threadId);
}

export async function findThreadForCandidateVacancy(
  candidateId: string,
  vacancyId: string
): Promise<Thread | null> {
  const threads = await getThreads();
  return (
    threads.find(
      (thread) =>
        thread.candidateId === candidateId && thread.vacancyId === vacancyId
    ) ?? null
  );
}

export async function createThreadForInvite(
  input: CreateThreadInput
): Promise<Thread> {
  const existing = await findThreadForCandidateVacancy(
    input.candidateId,
    input.vacancyId
  );
  if (existing) return existing;

  await apiClient<{ data: BackendMessage }>(
    `/vacancies/${input.vacancyId}/candidates/${input.candidateId}/messages`,
    {
      method: "POST",
      auth: "required",
      body: { body: input.initialMessage },
    }
  );

  const thread = await findThreadForCandidateVacancy(
    input.candidateId,
    input.vacancyId
  );
  if (thread) return thread;

  return {
    id: `${input.vacancyId}:${input.candidateId}`,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    vacancyId: input.vacancyId,
    vacancyTitle: input.vacancyTitle,
    companyName: input.companyName,
    participants: [
      { userId: input.hrUserId, role: "hr", name: input.hrName },
      {
        userId: `user-candidate-${input.candidateId}`,
        role: "candidate",
        name: input.candidateName,
      },
    ],
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}
