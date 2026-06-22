export type AuditEventType =
  | "candidate_created"
  | "application_created"
  | "application_moved"
  | "application_rejected"
  | "experience_added"
  | "evidence_added"
  | "verification_created"
  | "consent_requested"
  | "consent_accepted"
  | "consent_revoked"
  | "consent_expired"
  | "assessment_package_assigned"
  | "assessment_submitted"
  | "report_generated"
  | "profile_report_generated"
  | "manager_decision_created"
  | "profile_admitted"
  | "reference_requested"
  | "reference_response_received"
  | "skill_status_updated"
  | "notification_sent";

export type AuditActorRole = "HR" | "Candidate" | "System";

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  title: string;
  description: string;
  actorRole: AuditActorRole;
  createdAt: string;

  candidateId?: string;
  candidateName?: string;

  vacancyId?: string;
  vacancyTitle?: string;

  verificationRunId?: string;
  reportId?: string;
};
