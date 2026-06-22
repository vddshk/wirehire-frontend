import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/session";
import * as remote from "./adapters/remote/session";

// Sync helpers (read/write localStorage cache) always come from local — the
// remote adapter writes to the same keys after a successful login, so the
// cached user object stays in sync.
export const {
  demoUsers,
  getCurrentRole,
  setCurrentRole,
  setCurrentUser,
  getCurrentUser,
  isAuthenticated,
} = local;

// Async API calls — switch by env. When remote is on, hits real backend; when
// off, the local mock behaves the same way (returns Promise of mock user).
export const loginWithEmail = USE_REMOTE_API
  ? remote.loginWithEmail
  : local.loginWithEmail;

export const registerCandidate = USE_REMOTE_API
  ? remote.registerCandidate
  : local.registerCandidate;

export const registerCompany = USE_REMOTE_API
  ? remote.registerCompany
  : local.registerCompany;

export const logout = USE_REMOTE_API ? remote.logout : local.logout;
