export type VacancyStatus = "draft" | "published" | "closed";

export type VacancySeniority = "junior" | "middle" | "senior";

export type VacancyWorkFormat = "remote" | "office" | "hybrid";

export type VacancyEmploymentType = "full_time" | "part_time" | "contract";

export type Vacancy = {
  id: string;
  title: string;
  companyName: string;
  description: string;
  /** Готовая короткая выжимка с бэка для карточек списка (description_preview). */
  descriptionPreview?: string;
  locationCountry: string;
  locationCity?: string;
  /** Готовый ярлык локации с бэка (location_label), например "Москва, Россия". */
  locationLabel?: string;
  seniority: VacancySeniority;
  workFormat: VacancyWorkFormat;
  employmentType: VacancyEmploymentType;
  salaryRange: string;
  status: VacancyStatus;
  skills: string[];
  applicationsCount: number;
  /** Для авторизованного кандидата — true, если он уже откликнулся. */
  hasApplied?: boolean;
  createdAt: string;
};

export type VacancyFacets = {
  workTypes: string[];
  locationCountries: string[];
  seniorities: string[];
  employmentTypes: string[];
};