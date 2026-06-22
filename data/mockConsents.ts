import { Consent } from "@/types/consent";

export const mockConsents: Consent[] = [
  {
    id: "consent-1",
    candidateId: "cand-demo-current",
    type: "profile_visibility",
    status: "active",
    channel: "web_form",
    textVersion: "v1.0",
    requestedAt: "2026-05-01 10:00",
    acceptedAt: "2026-05-01 10:02",
  },
  {
    id: "consent-2",
    candidateId: "cand-demo-current",
    type: "verification",
    status: "requested",
    channel: "in_app",
    textVersion: "v1.0",
    requestedAt: "2026-05-15 14:20",
  },
  {
    id: "consent-3",
    candidateId: "cand-demo-current",
    type: "communication",
    status: "active",
    channel: "in_app",
    textVersion: "v1.0",
    requestedAt: "2026-05-01 10:00",
    acceptedAt: "2026-05-01 10:05",
  },
  {
    id: "consent-4",
    candidateId: "cand-demo-current",
    type: "proctoring",
    status: "revoked",
    channel: "in_app",
    textVersion: "v1.0",
    requestedAt: "2026-04-12 09:10",
    acceptedAt: "2026-04-12 09:15",
    revokedAt: "2026-05-10 18:40",
  },
];
