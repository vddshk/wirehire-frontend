import { AuditEvent } from "@/types/audit";

const AUDIT_STORAGE_KEY = "wirehire-audit-events";

const SEED_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "audit-seed-1",
    type: "candidate_created",
    title: "Создан профиль кандидата",
    description: "Никита Орлов зарегистрировался и заполнил базовый профиль.",
    actorRole: "Candidate",
    createdAt: "2026-05-15 10:02",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
  },
  {
    id: "audit-seed-2",
    type: "experience_added",
    title: "Добавлена карточка опыта",
    description: "Добавлена карточка опыта Product Manager · ProductHub.",
    actorRole: "Candidate",
    createdAt: "2026-05-15 10:24",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
  },
  {
    id: "audit-seed-3",
    type: "reference_requested",
    title: "Запрос референту отправлен",
    description: "Запрос отправлен Марии Референт (ProductHub) по карточке Product Manager.",
    actorRole: "System",
    createdAt: "2026-05-15 10:25",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
  },
  {
    id: "audit-seed-4",
    type: "reference_response_received",
    title: "Референт подтвердил опыт",
    description: "Мария Референт (ProductHub) подтвердила опыт работы.",
    actorRole: "System",
    createdAt: "2026-05-17 14:08",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
  },
  {
    id: "audit-seed-5",
    type: "profile_admitted",
    title: "Профиль допущен в общую базу",
    description: "Получен первый положительный ответ референта — профиль виден HR при поиске.",
    actorRole: "System",
    createdAt: "2026-05-17 14:08",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
  },
  {
    id: "audit-seed-6",
    type: "application_created",
    title: "Создан отклик",
    description: "Никита Орлов откликнулся на вакансию Frontend Developer.",
    actorRole: "Candidate",
    createdAt: "2026-05-18 11:30",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
    vacancyId: "vac-1",
    vacancyTitle: "Frontend Developer",
  },
  {
    id: "audit-seed-7",
    type: "assessment_submitted",
    title: "AI-оценка пройден",
    description: "Кандидат прошел общую AI-оценку навыков. Средний результат 89/100.",
    actorRole: "Candidate",
    createdAt: "2026-05-19 19:45",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
  },
  {
    id: "audit-seed-8",
    type: "profile_report_generated",
    title: "Сформирован отчет по профилю",
    description: "Сформирован отчет по профилю v1.4 — итоговый рейтинг доверия 78 из 100.",
    actorRole: "System",
    createdAt: "2026-05-19 19:46",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
  },
];

export function getAuditEvents(): AuditEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedEventsRaw = localStorage.getItem(AUDIT_STORAGE_KEY);

  if (!savedEventsRaw) {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(SEED_AUDIT_EVENTS));
    return SEED_AUDIT_EVENTS;
  }

  try {
    return JSON.parse(savedEventsRaw);
  } catch {
    return [];
  }
}

export function addAuditEvent(
  event: Omit<AuditEvent, "id" | "createdAt"> & {
    createdAt?: string;
  }
) {
  if (typeof window === "undefined") {
    return;
  }

  const currentEvents = getAuditEvents();

  const newEvent: AuditEvent = {
    ...event,
    id: `audit-${Date.now()}`,
    createdAt: event.createdAt ?? new Date().toLocaleDateString("ru-RU"),
  };

  localStorage.setItem(
    AUDIT_STORAGE_KEY,
    JSON.stringify([...currentEvents, newEvent])
  );
}

export function clearAuditEvents() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(AUDIT_STORAGE_KEY);
}
