export type ManagerDecisionStatus =
  | "continue"
  | "needs_review"
  | "reject";

export type ManagerDecision = {
  id: string;
  reportId: string;
  verificationRunId: string;
  candidateId: string;
  vacancyId: string;

  status: ManagerDecisionStatus;
  comment: string;

  decidedBy: string;
  decidedAt: string;
};