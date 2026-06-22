import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/resume";
import * as remote from "./adapters/remote/resume";

const impl = USE_REMOTE_API ? remote : local;

export const { getMyResume, uploadMyResume, getCandidateResume } = impl;
