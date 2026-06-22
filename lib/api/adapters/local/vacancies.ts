import { mockVacancies } from "@/data/mockVacancies";
import { Vacancy, VacancyFacets } from "@/types/vacancy";
import { getStoredArray, setStoredArray } from "./storage";

const VACANCIES_STORAGE_KEY = "wirehire-vacancies";

type VacancyListFilters = {
  workType?: string;
  locationCountry?: string;
  seniority?: string;
  employmentType?: string;
  status?: string;
  page?: number;
  perPage?: number;
};

function getVacanciesWithoutDuplicates(
  mockItems: Vacancy[],
  savedItems: Vacancy[]
): Vacancy[] {
  return mockItems.filter(
    (mockVacancy) =>
      !savedItems.some((savedVacancy) => savedVacancy.id === mockVacancy.id)
  );
}

export async function getVacancies(): Promise<Vacancy[]> {
  const savedVacancies = getStoredArray<Vacancy>(VACANCIES_STORAGE_KEY);

  const mockVacanciesWithoutDuplicates = getVacanciesWithoutDuplicates(
    mockVacancies,
    savedVacancies
  );

  return [...mockVacanciesWithoutDuplicates, ...savedVacancies];
}

function applyFilters(items: Vacancy[], filters: VacancyListFilters): Vacancy[] {
  return items.filter((vacancy) => {
    if (filters.workType && vacancy.workFormat !== filters.workType)
      return false;
    if (
      filters.locationCountry &&
      vacancy.locationCountry !== filters.locationCountry
    )
      return false;
    if (filters.seniority && vacancy.seniority !== filters.seniority)
      return false;
    if (
      filters.employmentType &&
      vacancy.employmentType !== filters.employmentType
    )
      return false;
    if (filters.status && vacancy.status !== filters.status) return false;
    return true;
  });
}

export async function getPublishedVacancies(
  filters: VacancyListFilters = {}
): Promise<Vacancy[]> {
  const vacancies = await getVacancies();
  const published = vacancies.filter((vacancy) => vacancy.status === "published");
  return applyFilters(published, filters);
}

export async function getMyVacancies(
  filters: VacancyListFilters = {}
): Promise<Vacancy[]> {
  // В локальном моке нет привязки к "моей компании" — отдаем все, кроме архивов.
  const vacancies = await getVacancies();
  return applyFilters(vacancies, filters);
}

export async function getVacancyFacets(): Promise<VacancyFacets> {
  const vacancies = await getVacancies();
  const published = vacancies.filter((v) => v.status === "published");
  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort();
  return {
    workTypes: uniq(published.map((v) => v.workFormat)),
    locationCountries: uniq(published.map((v) => v.locationCountry)),
    seniorities: uniq(published.map((v) => v.seniority)),
    employmentTypes: uniq(published.map((v) => v.employmentType)),
  };
}

export async function getVacancyById(
  vacancyId: string
): Promise<Vacancy | null> {
  const vacancies = await getVacancies();

  return vacancies.find((vacancy) => vacancy.id === vacancyId) ?? null;
}

export async function publishVacancy(vacancyId: string): Promise<Vacancy> {
  const vacancies = await getVacancies();
  const target = vacancies.find((v) => v.id === vacancyId);
  if (!target) throw new Error("Vacancy not found");
  const updated: Vacancy = { ...target, status: "published" };
  const saved = getStoredArray<Vacancy>(VACANCIES_STORAGE_KEY).map((v) =>
    v.id === vacancyId ? updated : v
  );
  setStoredArray<Vacancy>(VACANCIES_STORAGE_KEY, saved);
  return updated;
}

export async function archiveVacancy(vacancyId: string): Promise<Vacancy> {
  const vacancies = await getVacancies();
  const target = vacancies.find((v) => v.id === vacancyId);
  if (!target) throw new Error("Vacancy not found");
  // В нашем UI нет "archived" — закрываем.
  const updated: Vacancy = { ...target, status: "closed" };
  const saved = getStoredArray<Vacancy>(VACANCIES_STORAGE_KEY).map((v) =>
    v.id === vacancyId ? updated : v
  );
  setStoredArray<Vacancy>(VACANCIES_STORAGE_KEY, saved);
  return updated;
}

export async function deleteVacancy(vacancyId: string): Promise<Vacancy> {
  // DELETE-alias — то же, что archiveVacancy (см. openapi).
  return archiveVacancy(vacancyId);
}

type StoreVacancyInput = {
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

type UpdateVacancyInput = Partial<Omit<StoreVacancyInput, "status">> & {
  status?: "draft" | "published" | "closed" | "archived";
};

export async function createVacancy(
  input: StoreVacancyInput
): Promise<Vacancy> {
  const newVacancy: Vacancy = {
    id: `vac-${Date.now()}`,
    title: input.title,
    companyName: "",
    description: input.description,
    locationCountry: input.locationCountry ?? "",
    locationCity: input.locationCity,
    seniority:
      input.seniority === "junior" ||
      input.seniority === "middle" ||
      input.seniority === "senior"
        ? input.seniority
        : "middle",
    workFormat:
      input.workType === "remote" ||
      input.workType === "office" ||
      input.workType === "hybrid"
        ? input.workType
        : "office",
    employmentType:
      input.employmentType === "full_time" ||
      input.employmentType === "part_time" ||
      input.employmentType === "contract"
        ? input.employmentType
        : "full_time",
    salaryRange: input.salaryRange ?? "",
    status: input.status === "published" ? "published" : "draft",
    skills: [],
    applicationsCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  const saved = getStoredArray<Vacancy>(VACANCIES_STORAGE_KEY);
  setStoredArray<Vacancy>(VACANCIES_STORAGE_KEY, [...saved, newVacancy]);
  return newVacancy;
}

export async function updateVacancy(
  vacancyId: string,
  input: UpdateVacancyInput
): Promise<Vacancy> {
  const vacancies = await getVacancies();
  const target = vacancies.find((v) => v.id === vacancyId);
  if (!target) throw new Error("Vacancy not found");
  const updated: Vacancy = {
    ...target,
    title: input.title ?? target.title,
    description: input.description ?? target.description,
    locationCountry: input.locationCountry ?? target.locationCountry,
    locationCity: input.locationCity ?? target.locationCity,
    salaryRange: input.salaryRange ?? target.salaryRange,
    status:
      input.status === "draft" ||
      input.status === "published" ||
      input.status === "closed"
        ? input.status
        : target.status,
  };
  const saved = getStoredArray<Vacancy>(VACANCIES_STORAGE_KEY).map((v) =>
    v.id === vacancyId ? updated : v
  );
  setStoredArray<Vacancy>(VACANCIES_STORAGE_KEY, saved);
  return updated;
}
