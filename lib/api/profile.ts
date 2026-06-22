import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/profile";
import * as remote from "./adapters/remote/profile";

const impl = USE_REMOTE_API ? remote : local;

export const { getMyProfile, updateMyProfile } = impl;
export type { UpdateMyProfileInput } from "./adapters/remote/profile";
