import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/skills";
import * as remote from "./adapters/remote/skills";

// Facade — переключает реализацию по USE_REMOTE_API. Если бэк недоступен,
// можно временно вернуть local-режим, не трогая страницы.
const impl = USE_REMOTE_API ? remote : local;

export const {
  getMySkills,
  createMySkill,
  updateMySkill,
  deleteMySkill,
  getSkillsTaxonomy,
} = impl;

export type { StoreSkillInput, TaxonomyQuery } from "./adapters/remote/skills";
