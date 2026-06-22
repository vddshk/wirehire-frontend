import { mockNotifications } from "@/data/mockNotifications";
import { Notification } from "@/types/notification";
import { getStoredArray, setStoredArray } from "./storage";

const NOTIFICATIONS_STORAGE_KEY = "wirehire-notifications";

function bootstrapped(): Notification[] {
  const saved = getStoredArray<Notification>(NOTIFICATIONS_STORAGE_KEY);
  if (saved.length > 0) return saved;
  setStoredArray<Notification>(NOTIFICATIONS_STORAGE_KEY, mockNotifications);
  return mockNotifications;
}

export async function getNotifications(): Promise<Notification[]> {
  return bootstrapped();
}

export async function getNotificationsForUser(
  userId: string
): Promise<Notification[]> {
  const all = bootstrapped();
  return all
    .filter((notification) => notification.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<Notification | null> {
  const all = bootstrapped();
  let updated: Notification | null = null;
  const next = all.map((notification) => {
    if (notification.id !== notificationId) return notification;
    updated = { ...notification, isRead: true };
    return updated;
  });
  setStoredArray<Notification>(NOTIFICATIONS_STORAGE_KEY, next);
  return updated;
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<Notification[]> {
  const all = bootstrapped();
  const next = all.map((notification) =>
    notification.userId === userId
      ? { ...notification, isRead: true }
      : notification
  );
  setStoredArray<Notification>(NOTIFICATIONS_STORAGE_KEY, next);
  return next.filter((notification) => notification.userId === userId);
}
