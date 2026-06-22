export type ReferenceStatus =
  | "pending"
  | "delivered"
  | "opened"
  | "answered_positive"
  | "answered_partial"
  | "answered_negative"
  | "expired";

export type Reference = {
  id: string;
  experienceId: string;
  candidateId: string;
  referenceCompanyName: string;
  referenceContactName: string;
  referenceContactEmail: string;
  status: ReferenceStatus;
  token: string;
  requestedAt: string;
  expiresAt: string;
  respondedAt?: string;
  responseText?: string;
  positiveSignal: boolean;
};
