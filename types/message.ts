// FR-068 / FR-069 mock-messenger schema.
// Threads scoped per (candidateId, vacancyId) — pipeline-conversation contract.
export type MessageRole = "hr" | "candidate";

export type Message = {
  id: string;
  threadId: string;
  authorRole: MessageRole;
  authorName: string;
  body: string;
  createdAt: string;
};

export type Thread = {
  id: string;
  candidateId: string;
  candidateName: string;
  vacancyId: string;
  vacancyTitle: string;
  companyName: string;
  participants: { userId: string; role: MessageRole; name: string }[];
  messages: Message[];
  updatedAt: string;
};
