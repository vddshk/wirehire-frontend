// Shortlist HR — отдельная таблица на бэке (`/me/saved-candidates`).
// Local-адаптера нет: фича появилась уже после переезда на remote-only.
export {
  getSavedCandidates,
  getSavedCandidateById,
  createSavedCandidate,
  updateSavedCandidateNote,
  deleteSavedCandidate,
} from "./adapters/remote/savedCandidates";

export type { ListSavedCandidatesOptions } from "./adapters/remote/savedCandidates";
