import { mockThreads } from "@/data/mockMessages";
import { MessageRole, Thread } from "@/types/message";
import { getStoredArray, setStoredArray } from "./storage";

const THREADS_STORAGE_KEY = "wirehire-message-threads";

function bootstrapped(): Thread[] {
  const saved = getStoredArray<Thread>(THREADS_STORAGE_KEY);
  if (saved.length > 0) return saved;
  setStoredArray<Thread>(THREADS_STORAGE_KEY, mockThreads);
  return mockThreads;
}

export async function getThreads(): Promise<Thread[]> {
  return bootstrapped();
}

export async function getThreadsForUser(userId: string): Promise<Thread[]> {
  const threads = bootstrapped();
  return threads
    .filter((thread) =>
      thread.participants.some(
        (participant) => participant.userId === userId
      )
    )
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getThreadById(threadId: string): Promise<Thread | null> {
  const threads = bootstrapped();
  return threads.find((thread) => thread.id === threadId) ?? null;
}

export type CreateThreadInput = {
  candidateId: string;
  candidateName: string;
  vacancyId: string;
  vacancyTitle: string;
  companyName: string;
  hrUserId: string;
  hrName: string;
  initialMessage: string;
};

export async function findThreadForCandidateVacancy(
  candidateId: string,
  vacancyId: string
): Promise<Thread | null> {
  const threads = bootstrapped();
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
  const threads = bootstrapped();
  const existing = threads.find(
    (thread) =>
      thread.candidateId === input.candidateId &&
      thread.vacancyId === input.vacancyId
  );
  if (existing) return existing;

  const now = new Date().toLocaleDateString("ru-RU");
  const threadId = `thread-${Date.now()}`;
  const newThread: Thread = {
    id: threadId,
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
    messages: [
      {
        id: `m-${Date.now()}`,
        threadId,
        authorRole: "hr",
        authorName: input.hrName,
        body: input.initialMessage,
        createdAt: now,
      },
    ],
    updatedAt: now,
  };

  setStoredArray<Thread>(THREADS_STORAGE_KEY, [...threads, newThread]);
  return newThread;
}

export async function sendMessage(
  threadId: string,
  authorRole: MessageRole,
  authorName: string,
  body: string
): Promise<Thread | null> {
  const threads = bootstrapped();
  const now = new Date().toLocaleDateString("ru-RU");
  let updated: Thread | null = null;
  const next = threads.map((thread) => {
    if (thread.id !== threadId) return thread;
    updated = {
      ...thread,
      messages: [
        ...thread.messages,
        {
          id: `m-${Date.now()}`,
          threadId,
          authorRole,
          authorName,
          body,
          createdAt: now,
        },
      ],
      updatedAt: now,
    };
    return updated;
  });
  setStoredArray<Thread>(THREADS_STORAGE_KEY, next);
  return updated;
}
