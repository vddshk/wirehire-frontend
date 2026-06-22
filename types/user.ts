export type UserRole =
  | "candidate"
  | "hr"
  | "hiring_manager"
  | "admin"
  | "reference_provider";

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyName?: string;
  companyId?: string;
  candidateId?: string;
};

export const userRoleLabels: Record<UserRole, string> = {
  candidate: "Кандидат",
  hr: "HR / Employer",
  hiring_manager: "Hiring Manager",
  admin: "Admin",
  reference_provider: "Reference Provider",
};