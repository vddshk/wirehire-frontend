export type AdminCandidateListItem = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  status: string;
  headline?: string;
  visibilityMode?: string;
  pendingReferencesCount: number;
  experiencesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminExperienceItem = {
  id: string;
  experienceType?: string;
  companyName?: string;
  projectName?: string;
  roleTitle?: string;
  verificationStatus: string;
  referrerEmail?: string;
  referrerName?: string;
};

export type AdminReferenceRequestItem = {
  id: string;
  status: string;
  dbStatus: string;
  recipientEmail: string;
  experienceId: string;
  experienceTitle?: string;
  companyName?: string;
  createdAt?: string;
  answeredAt?: string;
  verdict?: string;
  canConfirm: boolean;
};

export type AdminCandidateDetail = AdminCandidateListItem & {
  experiences: AdminExperienceItem[];
  referenceRequests: AdminReferenceRequestItem[];
  canAdmit: boolean;
};

export type ReferenceVerdict = "positive" | "partial" | "negative";
