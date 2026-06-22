import { USE_REMOTE_API } from "./config";
import * as remoteCandidates from "./adapters/remote/adminCandidates";
import * as remoteUsers from "./adapters/remote/adminUsers";
import type {
  AdminCandidateDetail,
  AdminCandidateListItem,
  AdminReferenceRequestItem,
  ReferenceVerdict,
} from "@/types/adminCandidate";

export type ListAdminCandidatesParams = remoteCandidates.ListAdminCandidatesParams;

export async function getAdminCandidates(
  params?: ListAdminCandidatesParams
): Promise<AdminCandidateListItem[]> {
  if (!USE_REMOTE_API) {
    return [];
  }
  return remoteCandidates.getAdminCandidates(params);
}

export async function getAdminCandidateById(
  candidateId: string
): Promise<AdminCandidateDetail | null> {
  if (!USE_REMOTE_API) {
    return null;
  }
  return remoteCandidates.getAdminCandidateById(candidateId);
}

export async function adminAdmitCandidate(
  candidateId: string
): Promise<AdminCandidateListItem> {
  return remoteCandidates.adminAdmitCandidate(candidateId);
}

export async function adminConfirmReference(
  requestId: string,
  verdict: ReferenceVerdict,
  note?: string
): Promise<AdminReferenceRequestItem> {
  return remoteCandidates.adminConfirmReference(requestId, verdict, note);
}

export type ListAdminUsersParams = remoteUsers.ListAdminUsersParams;

export async function getAdminUsers(params?: ListAdminUsersParams) {
  if (!USE_REMOTE_API) {
    return [];
  }
  return remoteUsers.getAdminUsers(params);
}

export async function updateAdminUserStatus(
  userId: string,
  status: "active" | "suspended"
) {
  return remoteUsers.updateAdminUserStatus(userId, status);
}
