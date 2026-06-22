import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/company";
import * as remote from "./adapters/remote/company";

const impl = USE_REMOTE_API ? remote : local;

export const { getMyCompany, updateMyCompany } = impl;
export type { UpdateMyCompanyInput } from "./adapters/remote/company";
