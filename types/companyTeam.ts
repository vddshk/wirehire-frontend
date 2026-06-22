// Company team member — used by /employer/team. Не путать с CurrentUser:
// CurrentUser — текущая сессия, TeamMember — запись в справочнике команды
// конкретной компании.
export type CompanyTeamRole = "owner" | "hr" | "hiring_manager";

export type CompanyTeamStatus = "active" | "invited" | "suspended";

export type TeamMember = {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  role: CompanyTeamRole;
  status: CompanyTeamStatus;
  joinedAt: string;
};
