import { Notification } from "@/types/notification";

export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    userId: "user-candidate-1",
    type: "consent_requested",
    channel: "in_app",
    title: "Запрошено согласие на проверку",
    body: "Компания TechCorp запросила согласие на проверку опыта по вакансии Frontend Engineer",
    isRead: false,
    createdAt: "2026-05-15 14:20",
    linkUrl: "/candidate/consents",
  },
  {
    id: "notif-2",
    userId: "user-candidate-1",
    type: "application_confirmed",
    channel: "in_app",
    title: "Отклик отправлен",
    body: "Ваш отклик на вакансию Frontend Engineer в TechCorp принят, статус: подан",
    isRead: false,
    createdAt: "2026-05-14 09:15",
    linkUrl: "/candidate/applications",
  },
  {
    id: "notif-3",
    userId: "user-hr-1",
    type: "application_received",
    channel: "in_app",
    title: "Новый отклик",
    body: "Никита Орлов откликнулся на вакансию Frontend Engineer",
    isRead: true,
    createdAt: "2026-05-14 09:10",
    linkUrl: "/applications",
  },
];
