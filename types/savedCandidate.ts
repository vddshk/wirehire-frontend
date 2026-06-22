import type { Candidate } from "./candidate";

// HR/менеджер сохраняет понравившегося кандидата в свой shortlist
// (отдельная сущность от ApplicationStatus = "shortlist" — там статус
// отклика внутри воронки, здесь — закладка вне контекста вакансии).
//
// Бэк может вернуть `candidate = null`, если кандидат стал невидим
// после сохранения — запись остается в shortlist, но карточку показать
// нельзя.
export type SavedCandidate = {
  id: string;
  companyId: string;
  candidateId: string;
  savedByUserId?: string;
  note?: string;
  savedAt?: string;
  candidate?: Candidate | null;
};
