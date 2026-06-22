import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/vacancies";
import * as remote from "./adapters/remote/vacancies";

const impl = USE_REMOTE_API ? remote : local;

export const {
  getVacancies,
  getPublishedVacancies,
  getMyVacancies,
  getVacancyFacets,
  getVacancyById,
  publishVacancy,
  archiveVacancy,
  deleteVacancy,
  createVacancy,
  updateVacancy,
} = impl;
