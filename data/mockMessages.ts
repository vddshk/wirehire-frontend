import { Thread } from "@/types/message";

export const mockThreads: Thread[] = [
  {
    id: "thread-1",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
    vacancyId: "vac-1",
    vacancyTitle: "Frontend Developer",
    companyName: "TechCorp",
    participants: [
      { userId: "user-hr-1", role: "hr", name: "Анна HR" },
      { userId: "user-candidate-1", role: "candidate", name: "Никита Орлов" },
    ],
    messages: [
      {
        id: "m-1-1",
        threadId: "thread-1",
        authorRole: "hr",
        authorName: "Анна HR",
        body: "Никита, посмотрели профиль и AI-оценка — хорошие сигналы. Готовы пригласить на тех-интервью на следующей неделе. Удобно во вторник или среду после 16:00 МСК?",
        createdAt: "2026-05-14 11:02",
      },
      {
        id: "m-1-2",
        threadId: "thread-1",
        authorRole: "candidate",
        authorName: "Никита Орлов",
        body: "Здравствуйте! Удобно в среду 17:00 МСК. Ссылку на встречу пришлите, пожалуйста, в личный кабинет.",
        createdAt: "2026-05-14 12:18",
      },
      {
        id: "m-1-3",
        threadId: "thread-1",
        authorRole: "hr",
        authorName: "Анна HR",
        body: "Договорились. Слот забронировал, отправил приглашение и тестовое задание по продукт-аналитике — найдешь в разделе «Ассессмент».",
        createdAt: "2026-05-14 12:31",
      },
    ],
    updatedAt: "2026-05-14 12:31",
  },
  {
    id: "thread-2",
    candidateId: "cand-demo-current",
    candidateName: "Никита Орлов",
    vacancyId: "vac-2",
    vacancyTitle: "Backend Developer",
    companyName: "FinX",
    participants: [
      { userId: "user-hr-2", role: "hr", name: "Виктория HR" },
      { userId: "user-candidate-1", role: "candidate", name: "Никита Орлов" },
    ],
    messages: [
      {
        id: "m-2-1",
        threadId: "thread-2",
        authorRole: "hr",
        authorName: "Виктория HR",
        body: "Никита, спасибо за отклик. Хотим уточнить опыт работы с distributed systems — был ли продакшен с очередями и saga-pattern?",
        createdAt: "2026-05-12 09:45",
      },
    ],
    updatedAt: "2026-05-12 09:45",
  },
];
