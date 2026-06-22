import { CurrentUser, UserRole } from "@/types/user";
import {
  ApiError,
  apiClient,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "./client";
import { getMyProfile } from "./profile";
import { getMyCompany } from "./company";

const CURRENT_USER_STORAGE_KEY = "wirehire-current-user";
const CURRENT_ROLE_STORAGE_KEY = "wirehire-current-role";

interface BackendUser {
  id: string;
  email: string;
  account_status: "active" | "invited" | "blocked";
  roles?: string[];
  candidate_id?: string | null;
  created_at?: string | null;
}

interface AuthTokenResponse {
  token: string;
  token_type: "Bearer";
  user: BackendUser;
}

interface UserEnvelopeResponse {
  data: BackendUser;
}

// Backend supports six role codes; map them to our five frontend roles.
// employer_admin folds into "hr" because our UI treats company admin and
// recruiter as one persona (see HANDOVER).
const BACKEND_ROLE_PRIORITY = [
  "candidate",
  "employer_admin",
  "hr",
  "hiring_manager",
  "platform_admin",
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

function pickPrimaryRole(roles?: string[]): UserRole {
  if (!roles || roles.length === 0) return "candidate";
  for (const code of BACKEND_ROLE_PRIORITY) {
    if (roles.includes(code)) return mapBackendRole(code);
  }
  return mapBackendRole(roles[0]);
}

function mapUser(
  backend: BackendUser,
  extra: { fullName?: string; companyName?: string } = {}
): CurrentUser {
  return {
    id: backend.id,
    email: backend.email,
    fullName: extra.fullName ?? backend.email.split("@")[0] ?? "",
    role: pickPrimaryRole(backend.roles),
    candidateId: backend.candidate_id ?? undefined,
    companyName: extra.companyName,
  };
}

async function enrichCandidateDisplayName(
  user: CurrentUser
): Promise<CurrentUser> {
  if (!user.candidateId) return user;
  try {
    const profile = await getMyProfile();
    const fullName = profile.fullName.trim();
    if (!fullName) return user;
    return { ...user, fullName };
  } catch {
    return user;
  }
}

async function enrichEmployerCompanyName(
  user: CurrentUser
): Promise<CurrentUser> {
  if (user.role !== "hr" && user.role !== "hiring_manager") return user;
  if (user.companyName?.trim()) return user;
  try {
    const company = await getMyCompany();
    const companyName = company.name.trim();
    if (!companyName) return user;
    return { ...user, companyName };
  } catch {
    return user;
  }
}

async function enrichCurrentUser(user: CurrentUser): Promise<CurrentUser> {
  const withName = await enrichCandidateDisplayName(user);
  return enrichEmployerCompanyName(withName);
}

function persistUser(user: CurrentUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
  window.localStorage.setItem(CURRENT_ROLE_STORAGE_KEY, user.role);
  window.dispatchEvent(new Event("wirehire-role-changed"));
}

function clearPersistedUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  window.localStorage.removeItem(CURRENT_ROLE_STORAGE_KEY);
  window.dispatchEvent(new Event("wirehire-role-changed"));
}

export type LoginInput = { email: string; password: string };
export type RegisterCandidateInput = {
  fullName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};
export type RegisterCompanyInput = {
  fullName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  companyBrandName: string;
  companyLegalForm: string;
  companyName: string;
};

export async function loginWithEmail(
  input: LoginInput
): Promise<CurrentUser | null> {
  const response = await apiClient<AuthTokenResponse>("/auth/login", {
    method: "POST",
    body: { email: input.email, password: input.password },
    auth: "none",
  });
  const user = await enrichCurrentUser(mapUser(response.user));
  setStoredToken(response.token);
  persistUser(user);
  return user;
}

export async function registerCandidate(
  input: RegisterCandidateInput
): Promise<CurrentUser> {
  const response = await apiClient<AuthTokenResponse>("/auth/register", {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
      role: "candidate",
      full_name: input.fullName,
    },
    auth: "none",
  });
  const user = mapUser(response.user, { fullName: input.fullName });
  setStoredToken(response.token);
  persistUser(user);
  return user;
}

export async function registerCompany(
  input: RegisterCompanyInput
): Promise<CurrentUser> {
  const response = await apiClient<AuthTokenResponse>("/auth/register", {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
      role: "employer_admin",
      full_name: input.fullName,
      company_public_name: input.companyName,
      company_legal_name: input.companyName,
      company_brand_name: input.companyBrandName,
      company_legal_form: input.companyLegalForm,
    },
    auth: "none",
  });
  const user = mapUser(response.user, {
    fullName: input.fullName,
    companyName: input.companyName,
  });
  setStoredToken(response.token);
  persistUser(user);
  return user;
}

export async function logout(): Promise<void> {
  if (getStoredToken()) {
    try {
      await apiClient<{ message: string }>("/auth/logout", {
        method: "POST",
        auth: "required",
      });
    } catch (err) {
      // 401 means token is already invalid — proceed to clear local state.
      if (!(err instanceof ApiError) || err.status !== 401) {
        clearStoredToken();
        clearPersistedUser();
        throw err;
      }
    }
  }
  clearStoredToken();
  clearPersistedUser();
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (!getStoredToken()) return null;
  try {
    const response = await apiClient<UserEnvelopeResponse>("/auth/me", {
      method: "GET",
      auth: "required",
    });
    const user = await enrichCurrentUser(mapUser(response.data));
    persistUser(user);
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearStoredToken();
      clearPersistedUser();
      return null;
    }
    throw err;
  }
}
