"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/api/session";
import {
  getNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/api/notifications";
import {
  Notification,
  NotificationType,
} from "@/types/notification";
import { CurrentUser } from "@/types/user";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Section,
  Status,
  Placeholder,
} from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const typeLabels: Record<NotificationType, string> = {
  application_received: "новый отклик",
  application_confirmed: "отклик отправлен",
  consent_requested: "запрос согласия",
  verification_completed: "проверка завершена",
  assessment_assigned: "назначено задание",
  assessment_reminder: "напоминание о тесте",
  report_ready: "отчет готов",
  reference_received: "ответ референта",
  manager_decision: "решение менеджера",
  profile_admitted: "профиль допущен",
  new_message: "новое сообщение",
  system: "системное",
};

const typeTones: Record<
  NotificationType,
  "good" | "warn" | "muted" | "risk"
> = {
  application_received: "good",
  application_confirmed: "good",
  consent_requested: "warn",
  verification_completed: "good",
  assessment_assigned: "warn",
  assessment_reminder: "warn",
  report_ready: "good",
  reference_received: "good",
  manager_decision: "good",
  profile_admitted: "good",
  new_message: "good",
  system: "muted",
};

const ctaLabels: Record<NotificationType, string> = {
  application_received: "к воронке →",
  application_confirmed: "к отклику →",
  consent_requested: "дать согласие →",
  verification_completed: "к проверке →",
  assessment_assigned: "к заданию →",
  assessment_reminder: "к заданию →",
  report_ready: "открыть отчет →",
  reference_received: "к проверке →",
  manager_decision: "к решению →",
  profile_admitted: "к профилю →",
  new_message: "к диалогу →",
  system: "открыть →",
};

type ReadFilter = "all" | "unread";

export default function NotificationsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [filter, setFilter] = useState<ReadFilter>("all");

  useEffect(() => {
    async function load() {
      const user = getCurrentUser();
      setCurrentUser(user);
      if (!user) {
        setIsLoaded(true);
        return;
      }
      const userNotifications = await getNotificationsForUser(user.id);
      setNotifications(userNotifications);
      setIsLoaded(true);
    }
    load();
  }, []);

  const filtered = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((notification) => !notification.isRead)
        : notifications,
    [notifications, filter]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAllRead() {
    if (!currentUser) return;
    const updated = await markAllNotificationsAsRead(currentUser.id);
    setNotifications(updated);
  }

  async function handleClickNotification(notification: Notification) {
    if (!notification.isRead) {
      const updated = await markNotificationAsRead(notification.id);
      if (updated) {
        setNotifications((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
      }
    }
  }

  if (!isLoaded) {
    return <PageSkeleton variant="compact" />;
  }

  return (
    <div data-screen-label="Уведомления">
      <PageHeader
        eyebrow="Уведомления"
        title="Что нового"
        lead={
          notifications.length === 0
            ? "Тишина. Новые события появятся здесь"
            : `${notifications.length} событий · ${unreadCount} непрочитанных`
        }
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              className="btn"
              onClick={handleMarkAllRead}
            >
              Пометить все прочитанными
            </button>
          ) : null
        }
      />

      <div
        className="filters"
        style={{
          marginTop: 40,
          paddingTop: 28,
          borderTop: "1px solid var(--ink)",
          marginBottom: 40,
        }}
      >
        <button
          type="button"
          className={`f ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          <span className="v">все</span>
        </button>
        <button
          type="button"
          className={`f ${filter === "unread" ? "active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          <span className="v">непрочитанные ({unreadCount})</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <Placeholder>
          {filter === "unread"
            ? "Все уведомления прочитаны"
            : "Здесь будут появляться события: новые отклики, ответы референтов, готовые отчеты, изменения статусов"}
        </Placeholder>
      ) : (
        <div className="rows">
          {filtered.map((notification, index) => (
            <div
              className="r"
              key={notification.id}
              onClick={() => handleClickNotification(notification)}
              style={{
                cursor: notification.isRead ? "default" : "pointer",
                ...(index === 0
                  ? { borderTop: "1px solid var(--line-soft)" }
                  : {}),
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: notification.isRead ? 400 : 500,
                    letterSpacing: "-0.012em",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                  }}
                >
                  {!notification.isRead && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--warn)",
                        display: "inline-block",
                        flexShrink: 0,
                        transform: "translateY(-2px)",
                      }}
                    />
                  )}
                  <span>{notification.title}</span>
                </div>
                <div
                  className="muted"
                  style={{
                    fontSize: 14,
                    marginTop: 6,
                    maxWidth: "70ch",
                    lineHeight: 1.5,
                  }}
                >
                  {notification.body}
                </div>
              </div>
              <Status tone={typeTones[notification.type]}>
                {typeLabels[notification.type]}
              </Status>
              <div
                className="mono muted"
                style={{ fontSize: 11, whiteSpace: "nowrap" }}
              >
                {formatDate(notification.createdAt)}
              </div>
              <div className="text-right">
                {notification.linkUrl ? (
                  <Link
                    href={notification.linkUrl}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleClickNotification(notification);
                    }}
                    className="btn-link mono"
                    style={{ fontSize: 12, whiteSpace: "nowrap" }}
                  >
                    {ctaLabels[notification.type]}
                  </Link>
                ) : (
                  <span
                    className="mono muted"
                    style={{ fontSize: 11, opacity: 0.5 }}
                  >
                    —
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <NotificationSettings role={currentUser?.role} />
    </div>
  );
}

const SETTINGS_KEY = "wirehire-notification-prefs";

type DupChannel = {
  key: string;
  label: string;
  description: string;
  forced?: boolean;
};

const CANDIDATE_OPTIONAL: DupChannel[] = [
  {
    key: "assessment_assigned",
    label: "Назначено задание",
    description: "Когда система назначает AI-оценку или проверку",
  },
  {
    key: "assessment_reminder",
    label: "Напоминание о тесте",
    description: "Если задание не завершено в срок",
  },
  {
    key: "profile_admitted",
    label: "Допуск в общую базу",
    description: "Когда профиль проходит порог и попадает в каталог",
  },
];

const CANDIDATE_FORCED: DupChannel[] = [
  {
    key: "consent_requested",
    label: "Запрос согласия на проверку",
    description: "Юридически значимое уведомление — всегда дублируется на почту",
    forced: true,
  },
];

const COMPANY_OPTIONAL: DupChannel[] = [
  {
    key: "application_received",
    label: "Новый отклик",
    description: "Когда кандидат откликается на вакансию",
  },
  {
    key: "verification_completed",
    label: "Проверка завершена",
    description: "Когда обновляется статус проверки опыта кандидата",
  },
  {
    key: "reference_received",
    label: "Ответ референта",
    description: "Когда референт ответил на запрос компании",
  },
];

const COMPANY_FORCED: DupChannel[] = [
  {
    key: "report_ready",
    label: "Отчет готов",
    description: "Готовность отчета по профилю или вакансии",
    forced: true,
  },
];

function NotificationSettings({ role }: { role?: string }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        setPrefs(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    setLoaded(true);
  }, []);

  function toggle(key: string) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }

  if (!loaded) return null;

  const isCompany = role === "hr" || role === "hiring_manager";
  const optional = isCompany ? COMPANY_OPTIONAL : CANDIDATE_OPTIONAL;
  const forced = isCompany ? COMPANY_FORCED : CANDIDATE_FORCED;
  const channels = [...optional, ...forced];

  return (
    <Section num="01" label="Email-уведомления">
      <p className="notify-prefs-lead">
        Дублируйте важные события на почту. Остальное останется только в
        приложении.
      </p>
      <div className="notify-prefs">
        {channels.map((channel) => {
          const enabled = channel.forced ? true : !!prefs[channel.key];
          const inputId = `notify-pref-${channel.key}`;

          return (
            <div
              key={channel.key}
              className={`notify-pref${channel.forced ? " notify-pref--locked" : ""}`}
            >
              <div className="notify-pref__body">
                <div className="notify-pref__title">{channel.label}</div>
                {channel.description && (
                  <p className="notify-pref__desc">{channel.description}</p>
                )}
                {channel.forced && (
                  <span className="notify-pref__badge">всегда на email</span>
                )}
              </div>

              <label className="notify-pref__control" htmlFor={inputId}>
                <input
                  id={inputId}
                  type="checkbox"
                  className="notify-pref__input"
                  checked={enabled}
                  disabled={channel.forced}
                  onChange={() => toggle(channel.key)}
                />
                <span className="notify-pref__switch" aria-hidden="true" />
                <span className="notify-pref__state">
                  {enabled ? "Email" : "В приложении"}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
