export type ConsentType =
  | "profile_visibility"
  | "communication"
  | "verification"
  | "proctoring";

export type ConsentLifecycle =
  | "not_requested"
  | "requested"
  | "active"
  | "revoked"
  | "expired";

export type ConsentChannel = "web_form" | "email_link" | "in_app";

export type Consent = {
  id: string;
  candidateId: string;
  type: ConsentType;
  status: ConsentLifecycle;
  channel: ConsentChannel;
  textVersion: string;
  requestedAt?: string;
  acceptedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
};
