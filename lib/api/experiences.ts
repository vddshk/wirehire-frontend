import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/experiences";
import * as remote from "./adapters/remote/experiences";

const impl = USE_REMOTE_API ? remote : local;

export const {
  listMyExperiences,
  createMyExperience,
  getMyExperience,
  updateMyExperience,
  deleteMyExperience,
} = impl;

export type { CreateExperienceInput } from "./adapters/local/experiences";
