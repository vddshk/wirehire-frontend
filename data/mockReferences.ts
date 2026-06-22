import { Reference } from "@/types/reference";

export const mockReferences: Reference[] = [
  {
    id: "ref-1",
    experienceId: "exp-1",
    candidateId: "cand-demo-current",
    referenceCompanyName: "ProductHub",
    referenceContactName: "Мария Референт",
    referenceContactEmail: "reference@previous.example",
    status: "answered_positive",
    token: "tok-abc123",
    requestedAt: "2026-04-01 12:00",
    respondedAt: "2026-04-03 16:45",
    expiresAt: "2026-05-01 12:00",
    responseText:
      "Подтверждаю опыт работы и роль Product Manager. Никита показал себя как сильный специалист.",
    positiveSignal: true,
  },
  {
    id: "ref-2",
    experienceId: "exp-2",
    candidateId: "cand-demo-current",
    referenceCompanyName: "StartupXYZ",
    referenceContactName: "Иван Менеджер",
    referenceContactEmail: "manager@earlier.example",
    status: "pending",
    token: "tok-def456",
    requestedAt: "2026-05-10 09:00",
    expiresAt: "2026-05-24 09:00",
    positiveSignal: false,
  },
  {
    id: "ref-3",
    experienceId: "exp-6",
    candidateId: "5",
    referenceCompanyName: "CloudSystems",
    referenceContactName: "Сергей Тимлид",
    referenceContactEmail: "lead@cloudsystems.example",
    status: "answered_partial",
    token: "tok-partial789",
    requestedAt: "2026-05-01 10:00",
    respondedAt: "2026-05-04 14:20",
    expiresAt: "2026-05-15 10:00",
    responseText:
      "Период работы подтверждаю, но роль была ниже — Senior Engineer, не Lead. Квалификация высокая.",
    positiveSignal: false,
  },
];
