export type CandidateStatus =
  | "not_verified"
  | "pending"
  | "verified"
  | "questionable";

export type WorkFormat = "remote" | "office" | "hybrid";

export type ExperienceStatus =
  | "not_checked"
  | "awaiting_reference"
  | "verified"
  | "partially_verified"
  | "questionable";

export type EvidenceType =
  | "portfolio"
  | "repository"
  | "certificate"
  | "document"
  | "other";

export type EvidenceMaterial = {
  id: string;
  title: string;
  type: EvidenceType;
  url: string;
  comment: string;
  createdAt: string;
};

export type ProfileStatus =
  | "draft"
  | "active"
  | "pending_threshold"
  | "admitted";

export type VisibilityMode = "public" | "restricted" | "hidden";

export type ExperienceType = "work" | "project" | "education";

export type EducationDetails = {
  institutionName: string;
  speciality: string;
  degree?: string;
  thesisTitle?: string;
  diplomaDocumentId?: string;
};

export type CandidateExperience = {
  id: string;
  type?: ExperienceType;
  company: string;
  role: string;
  period: string;
  employmentType: string;
  responsibilities: string;
  stack: string[];
  status: ExperienceStatus;
  evidence?: EvidenceMaterial[];

  referenceCompanyName?: string;
  referenceContactName?: string;
  referenceContactEmail?: string;

  educationDetails?: EducationDetails;

  // Поля с бэка: готовые подписи для списка и флаг применимости проверки.
  /** Готовая подпись (должность или специальность) — с бэка. */
  titleLabel?: string;
  /** Готовая подпись (компания, проект или вуз) — с бэка. */
  organizationLabel?: string;
  /** false для образования — не показывать бейдж верификации. */
  verificationApplicable?: boolean;
};

export type ResumeFile = {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

import type { CandidateSkill, Skill } from "./skill";

export type Candidate = {
  id: string;
  fullName: string;
  headline: string;
  location: string;
  workFormat: WorkFormat;
  verificationStatus: CandidateStatus;
  skills: string[];
  summary: string;
  experience: CandidateExperience[];

  email?: string;
  phone?: string;
  profileStatus?: ProfileStatus;
  visibilityMode?: VisibilityMode;
  desiredRole?: string;
  resume?: ResumeFile;
  structuredSkills?: Skill[];
  /** Structured навыки из `candidate_skills` (новая таблица бэка).
   *  В детальной карточке HR — `skills_preview`, в кабинете кандидата
   *  загружается отдельным запросом /me/skills и кладется сюда же. */
  skillsPreview?: CandidateSkill[];
  /** Кол-во карточек опыта с бэка (`experiences_count`). На листинге сам опыт
   *  не приходит, только число — используем его для счетчика на карточке. */
  experiencesCount?: number;
  /** Кол-во подтвержденных карточек опыта (`verified_experiences_count`). */
  verifiedExperiencesCount?: number;
  /** Последний profile-report готов (с бэка `has_profile_report`). */
  hasProfileReport?: boolean;
  profileReportScore?: number;
  profileReportStatus?: string;
  /** Кандидат загрузил PDF-резюме (с бэка `has_resume`). */
  hasResume?: boolean;
};
