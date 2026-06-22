import { UserAccount, UserAccountStatus } from "@/types/admin";
import { UserRole } from "@/types/user";
import { apiClient } from "./client";

interface BackendUser {
  id: string;
  email: string;
  full_name?: string | null;
  account_status: "active" | "blocked" | "invited";
  roles?: string[];
  primary_role?: string | null;
  company_name?: string | null;
  candidate_id?: string | null;
  email_verified_at?: string | null;
  last_active_at?: string | null;
  created_at?: string | null;
}

interface BackendList {
  data: BackendUser[];
}

interface BackendEnvelope {
  data: BackendUser;
}

const BACKEND_ROLE_PRIORITY = [
  "platform_admin",
  "employer_admin",
  "hr",
  "hiring_manager",
  "candidate",
  "referrer",
] as const;

function mapBackendRole(code: string): UserRole {
  switch (code) {
    case "candidate":
      return "candidate";
    case "employer_admin":
    case "hr":
      return "hr";
    case "hiring_manager":
      return "hiring_manager";
    case "platform_admin":
      return "admin";
    case "referrer":
      return "reference_provider";
    default:
      return "candidate";
  }
}

function pickPrimaryRole(roles?: string[], primary?: string | null): UserRole {
  if (primary) {
    return mapBackendRole(primary);
  }
  if (!roles || roles.length === 0) {
    return "candidate";
  }
  for (const code of BACKEND_ROLE_PRIORITY) {
    if (roles.includes(code)) {
      return mapBackendRole(code);
    }
  }
  return mapBackendRole(roles[0]);
}

function mapAccountStatus(
  status: BackendUser["account_status"],
  emailVerifiedAt?: string | null
): UserAccountStatus {
  if (status === "blocked") {
    return "suspended";
  }
  if (status === "invited" || !emailVerifiedAt) {
    return "invited";
  }
  return "active";
}

function mapUser(item: BackendUser): UserAccount {
  return {
    id: item.id,
    fullName: item.full_name?.trim() || item.email.split("@")[0] || item.email,
    email: item.email,
    role: pickPrimaryRole(item.roles, item.primary_role),
    companyName: item.company_name ?? undefined,
    status: mapAccountStatus(item.account_status, item.email_verified_at),
    createdAt: item.created_at ?? "",
    lastSeenAt: item.last_active_at ?? undefined,
  };
}

export type ListAdminUsersParams = {
  role?: UserRole | "all";
  status?: UserAccountStatus | "all";
  search?: string;
};

function toBackendAccountStatus(status: UserAccountStatus): string {
  if (status === "suspended") {
    return "blocked";
  }
  if (status === "invited") {
    return "invited";
  }
  return "active";
}

export async function getAdminUsers(
  params: ListAdminUsersParams = {}
): Promise<UserAccount[]> {
  const query = new URLSearchParams({ per_page: "100" });
  if (params.role && params.role !== "all") {
    query.set("role", params.role);
  }
  if (params.status && params.status !== "all") {
    query.set("account_status", toBackendAccountStatus(params.status));
  }
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  const response = await apiClient<BackendList>(
    `/admin/users?${query.toString()}`,
    { method: "GET", auth: "required" }
  );

  return response.data.map(mapUser);
}

export async function updateAdminUserStatus(
  userId: string,
  status: Extract<UserAccountStatus, "active" | "suspended">
): Promise<UserAccount> {
  const response = await apiClient<BackendEnvelope>(
    `/admin/users/${userId}/status`,
    {
      method: "PATCH",
      auth: "required",
      body: {
        account_status: status === "suspended" ? "blocked" : "active",
      },
    }
  );
  return mapUser(response.data);
}
