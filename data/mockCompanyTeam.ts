import { TeamMember } from "@/types/companyTeam";

export const mockCompanyTeam: TeamMember[] = [
  {
    id: "tm-1",
    companyId: "company-techcorp",
    fullName: "Анна HR",
    email: "hr@company.com",
    role: "owner",
    status: "active",
    joinedAt: "2025-12-01",
  },
  {
    id: "tm-2",
    companyId: "company-techcorp",
    fullName: "Игорь Hiring Manager",
    email: "manager@company.com",
    role: "hiring_manager",
    status: "active",
    joinedAt: "2026-02-14",
  },
  {
    id: "tm-3",
    companyId: "company-techcorp",
    fullName: "Виктория Рекрутер",
    email: "victoria@company.com",
    role: "hr",
    status: "invited",
    joinedAt: "2026-05-12",
  },
];
