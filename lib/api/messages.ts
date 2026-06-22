import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/messages";
import * as remote from "./adapters/remote/messages";

const impl = USE_REMOTE_API ? remote : local;

export const {
  getThreads,
  getThreadsForUser,
  getThreadById,
  sendMessage,
  findThreadForCandidateVacancy,
  createThreadForInvite,
} = impl;

export type { CreateThreadInput } from "./adapters/local/messages";
