import { saveCompany } from "@/lib/api/adapters/local/companies";
import {
  extractCompanyBrandName,
  formatCompanyLegalName,
  type CompanyLegalForm,
} from "@/lib/utils/companyLegalForm";
import { CurrentUser, UserRole } from "@/types/user";

const CURRENT_ROLE_STORAGE_KEY = "wirehire-current-role";
const CURRENT_USER_STORAGE_KEY = "wirehire-current-user";

export const demoUsers: Record<UserRole, CurrentUser> = {
  candidate: {
    id: "user-candidate-1",
    fullName: "Никита Орлов",
    email: "candidate@example.com",
    role: "candidate",
    candidateId: "cand-demo-current",
  },
  hr: {
    id: "user-hr-1",
    fullName: "Анна HR",
    email: "hr@company.com",
    role: "hr",
    companyName: "TechCorp",
  },
  hiring_manager: {
    id: "user-manager-1",
    fullName: "Игорь Hiring Manager",
    email: "manager@company.com",
    role: "hiring_manager",
    companyName: "TechCorp",
  },
  admin: {
    id: "user-admin-1",
    fullName: "Admin WireHire",
    email: "admin@wirehire.dev",
    role: "admin",
  },
  reference_provider: {
    id: "user-reference-1",
    fullName: "Мария Референт",
    email: "reference@company.com",
    role: "reference_provider",
    companyName: "Previous Company",
  },
};

function readStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CurrentUser;
    if (parsed && typeof parsed === "object" && "role" in parsed) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function isValidRole(value: string | null): value is UserRole {
  return (
    value === "candidate" ||
    value === "hr" ||
    value === "hiring_manager" ||
    value === "admin" ||
    value === "reference_provider"
  );
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (readStoredUser()) {
    return true;
  }
  const savedRole = localStorage.getItem(CURRENT_ROLE_STORAGE_KEY);
  return isValidRole(savedRole);
}

export function getCurrentRole(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = readStoredUser();
  if (stored) {
    return stored.role;
  }
  const savedRole = localStorage.getItem(CURRENT_ROLE_STORAGE_KEY);
  if (isValidRole(savedRole)) {
    return savedRole;
  }
  return null;
}

export function setCurrentRole(role: UserRole) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(CURRENT_ROLE_STORAGE_KEY, role);
  localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  window.dispatchEvent(new Event("wirehire-role-changed"));
}

export function setCurrentUser(user: CurrentUser) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(CURRENT_ROLE_STORAGE_KEY, user.role);
  window.dispatchEvent(new Event("wirehire-role-changed"));
}

export function getCurrentUser(): CurrentUser {
  const stored = readStoredUser();
  if (stored) {
    return stored;
  }
  const role = getCurrentRole();
  if (role) {
    return demoUsers[role];
  }
  // Fallback for SSR / unauthenticated calls — code that still calls
  // getCurrentUser() outside the shell guard sees a default candidate.
  return demoUsers.candidate;
}

export async function logout(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(CURRENT_ROLE_STORAGE_KEY);
  localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  window.dispatchEvent(new Event("wirehire-role-changed"));
}

type CandidateRegistration = {
  fullName: string;
  email: string;
  password?: string;
};

type CompanyRegistration = {
  fullName: string;
  email: string;
  companyName: string;
  companyBrandName?: string;
  companyLegalForm?: CompanyLegalForm;
  password?: string;
};

export async function registerCandidate(
  input: CandidateRegistration
): Promise<CurrentUser> {
  const userId = `user-cand-${Date.now()}`;
  const candidateId = `cand-${Date.now()}`;
  const user: CurrentUser = {
    id: userId,
    fullName: input.fullName,
    email: input.email,
    role: "candidate",
    candidateId,
  };
  setCurrentUser(user);
  return user;
}

export async function registerCompany(
  input: CompanyRegistration
): Promise<CurrentUser> {
  const userId = `user-hr-${Date.now()}`;
  const legalForm = input.companyLegalForm ?? "ooo";
  const brandName =
    input.companyBrandName?.trim() ||
    extractCompanyBrandName(input.companyName);
  const legalName = formatCompanyLegalName(brandName, legalForm);
  const companyId = `company-${Date.now()}`;

  await saveCompany({
    id: companyId,
    name: legalName,
    brandName,
    legalForm,
    legalName,
    status: "pending_moderation",
    ownerUserId: userId,
    ownerName: input.fullName,
    ownerEmail: input.email,
    createdAt: new Date().toISOString(),
  });

  const user: CurrentUser = {
    id: userId,
    fullName: input.fullName,
    email: input.email,
    role: "hr",
    companyName: legalName,
    companyId,
  };
  setCurrentUser(user);
  return user;
}

type LoginInput = {
  email: string;
  password?: string;
};

export async function loginWithEmail(
  input: LoginInput
): Promise<CurrentUser | null> {
  // Mock: pick a demo user matching email or fallback to candidate
  const matches = Object.values(demoUsers).find(
    (user) => user.email.toLowerCase() === input.email.toLowerCase()
  );
  if (matches) {
    setCurrentUser(matches);
    return matches;
  }
  // Auto-create candidate account for any new email (mock behavior)
  return await registerCandidate({
    fullName: input.email.split("@")[0] || "Кандидат",
    email: input.email,
  });
}
