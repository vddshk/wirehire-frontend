import {
  Vacancy,
  VacancyEmploymentType,
  VacancyFacets,
  VacancySeniority,
  VacancyStatus,
  VacancyWorkFormat,
} from "@/types/vacancy";
import { ApiError, apiClient } from "./client";

interface BackendVacancy {
  id: string;
  company_id: string;
  company?: { id: string; public_name: string };
  title: string;
  description: string;
  description_preview?: string | null;
  location_country?: string | null;
  location_city?: string | null;
  location_label?: string | null;
  work_type?: string | null;
  seniority?: string | null;
  employment_type?: string | null;
  salary_range?: string | null;
  status: "draft" | "published" | "closed" | "archived";
  has_applied?: boolean;
  applications_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

interface VacancyPaginatedResponse {
  data: BackendVacancy[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

interface VacancyEnvelopeResponse {
  data: BackendVacancy;
  message?: string;
}

interface VacancyFacetsBackend {
  data: {
    work_types: string[];
    location_countries: string[];
    seniorities: string[];
    employment_types: string[];
  };
}

const SENIORITY_VALUES: VacancySeniority[] = ["junior", "middle", "senior"];
const WORK_FORMAT_VALUES: VacancyWorkFormat[] = ["remote", "office", "hybrid"];
const EMPLOYMENT_VALUES: VacancyEmploymentType[] = [
  "full_time",
  "part_time",
  "contract",
];

function mapSeniority(value?: string | null): VacancySeniority {
  if (value && (SENIORITY_VALUES as string[]).includes(value)) {
    return value as VacancySeniority;
  }
  return "middle";
}

function mapWorkFormat(value?: string | null): VacancyWorkFormat {
  if (value && (WORK_FORMAT_VALUES as string[]).includes(value)) {
    return value as VacancyWorkFormat;
  }
  return "office";
}

function mapEmploymentType(value?: string | null): VacancyEmploymentType {
  if (value && (EMPLOYMENT_VALUES as string[]).includes(value)) {
    return value as VacancyEmploymentType;
  }
  return "full_time";
}

function mapStatus(value: string): VacancyStatus {
  // Backend "archived" has no UI counterpart — surface as "closed".
  if (value === "draft" || value === "published" || value === "closed") {
    return value;
  }
  return "closed";
}

function mapVacancy(b: BackendVacancy): Vacancy {
  return {
    id: b.id,
    title: b.title,
    companyName: b.company?.public_name ?? "",
    description: b.description,
    descriptionPreview: b.description_preview ?? undefined,
    locationCountry: b.location_country ?? "",
    locationCity: b.location_city ?? undefined,
    locationLabel: b.location_label ?? undefined,
    seniority: mapSeniority(b.seniority),
    workFormat: mapWorkFormat(b.work_type),
    employmentType: mapEmploymentType(b.employment_type),
    salaryRange: b.salary_range ?? "",
    status: mapStatus(b.status),
    // Backend doesn't expose `skills` yet — default until schema catches up.
    skills: [],
    applicationsCount: b.applications_count ?? 0,
    hasApplied: b.has_applied,
    createdAt: b.created_at ?? "",
  };
}

type VacancyListFilters = {
  workType?: string;
  locationCountry?: string;
  seniority?: string;
  employmentType?: string;
  status?: string;
  page?: number;
  perPage?: number;
};

function buildQuery(filters: VacancyListFilters): string {
  const params = new URLSearchParams();
  if (filters.workType) params.set("work_type", filters.workType);
  if (filters.locationCountry)
    params.set("location_country", filters.locationCountry);
  if (filters.seniority) params.set("seniority", filters.seniority);
  if (filters.employmentType)
    params.set("employment_type", filters.employmentType);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getVacancies(): Promise<Vacancy[]> {
  const response = await apiClient<VacancyPaginatedResponse>("/vacancies", {
    method: "GET",
    auth: "optional",
  });
  return response.data.map(mapVacancy);
}

/** Лендинг: только published. Если есть Bearer — каждая вакансия знает has_applied. */
export async function getPublishedVacancies(
  filters: VacancyListFilters = {}
): Promise<Vacancy[]> {
  const response = await apiClient<VacancyPaginatedResponse>(
    `/vacancies${buildQuery(filters)}`,
    { method: "GET", auth: "optional" }
  );
  return response.data.map(mapVacancy);
}

/** Кабинет HR — канонический список своих вакансий с applications_count. */
export async function getMyVacancies(
  filters: VacancyListFilters = {}
): Promise<Vacancy[]> {
  const response = await apiClient<VacancyPaginatedResponse>(
    `/me/vacancies${buildQuery(filters)}`,
    { method: "GET", auth: "required" }
  );
  return response.data.map(mapVacancy);
}

/** Значения фильтров лендинга (distinct values по published-вакансиям). */
export async function getVacancyFacets(): Promise<VacancyFacets> {
  const response = await apiClient<VacancyFacetsBackend>("/vacancies/facets", {
    method: "GET",
    auth: "none",
  });
  return {
    workTypes: response.data.work_types,
    locationCountries: response.data.location_countries,
    seniorities: response.data.seniorities,
    employmentTypes: response.data.employment_types,
  };
}

export async function getVacancyById(
  vacancyId: string
): Promise<Vacancy | null> {
  try {
    const response = await apiClient<VacancyEnvelopeResponse>(
      `/vacancies/${vacancyId}`,
      { method: "GET", auth: "optional" }
    );
    return mapVacancy(response.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** Кнопка «Опубликовать» в кабинете HR. 422 → ошибка валидации. */
export async function publishVacancy(vacancyId: string): Promise<Vacancy> {
  const response = await apiClient<VacancyEnvelopeResponse>(
    `/vacancies/${vacancyId}/publish`,
    { method: "POST", auth: "required" }
  );
  return mapVacancy(response.data);
}

/** Кнопка «В архив» — предпочтительный способ архивации. */
export async function archiveVacancy(vacancyId: string): Promise<Vacancy> {
  const response = await apiClient<VacancyEnvelopeResponse>(
    `/vacancies/${vacancyId}/archive`,
    { method: "POST", auth: "required" }
  );
  return mapVacancy(response.data);
}

/**
 * DELETE-alias архивации — бэк отвечает `{ data, message }`
 * (то же, что и POST /archive). Для нового UI лучше archiveVacancy.
 */
export async function deleteVacancy(vacancyId: string): Promise<Vacancy> {
  const response = await apiClient<VacancyEnvelopeResponse>(
    `/vacancies/${vacancyId}`,
    { method: "DELETE", auth: "required" }
  );
  return mapVacancy(response.data);
}

export type StoreVacancyInput = {
  title: string;
  description: string;
  locationCountry?: string;
  locationCity?: string;
  workType?: string;
  seniority?: string;
  employmentType?: string;
  salaryRange?: string;
  status?: "draft" | "published";
};

export type UpdateVacancyInput = Partial<Omit<StoreVacancyInput, "status">> & {
  status?: "draft" | "published" | "closed" | "archived";
};

function toStoreBody(input: StoreVacancyInput | UpdateVacancyInput) {
  return {
    title: input.title,
    description: input.description,
    location_country: input.locationCountry,
    location_city: input.locationCity,
    work_type: input.workType,
    seniority: input.seniority,
    employment_type: input.employmentType,
    salary_range: input.salaryRange,
    status: input.status,
  };
}

/** POST /vacancies — создать вакансию в кабинете HR. */
export async function createVacancy(
  input: StoreVacancyInput
): Promise<Vacancy> {
  const response = await apiClient<VacancyEnvelopeResponse>("/vacancies", {
    method: "POST",
    auth: "required",
    body: toStoreBody(input),
  });
  return mapVacancy(response.data);
}

/** PUT /vacancies/{id} — обновить вакансию своей компании. */
export async function updateVacancy(
  vacancyId: string,
  input: UpdateVacancyInput
): Promise<Vacancy> {
  const response = await apiClient<VacancyEnvelopeResponse>(
    `/vacancies/${vacancyId}`,
    {
      method: "PUT",
      auth: "required",
      body: toStoreBody(input),
    }
  );
  return mapVacancy(response.data);
}
