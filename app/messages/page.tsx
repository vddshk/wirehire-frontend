"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/lib/api/session";
import { getThreadsForUser, sendMessage } from "@/lib/api/messages";
import { ChatApplicationContext } from "@/components/messages/ChatApplicationContext";
import {
  applicationSourceLabel,
  threadApplicationKey,
} from "@/lib/applications/display";
import {
  loadApplicationsByThread,
  vacancyHrefForThread,
} from "@/lib/messages/loadThreadApplications";
import { Application } from "@/types/application";
import { MessageRole, Thread } from "@/types/message";
import { CurrentUser } from "@/types/user";
import { PageHeader, EmptyState } from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { formatDate } from "@/lib/utils/date";

function isHrRole(user: CurrentUser | null): boolean {
  if (!user) return false;
  return user.role === "hr" || user.role === "hiring_manager";
}

function myMessageRole(user: CurrentUser | null): MessageRole {
  return isHrRole(user) ? "hr" : "candidate";
}

function displayName(thread: Thread, user: CurrentUser | null): string {
  if (isHrRole(user)) return thread.candidateName;
  return thread.vacancyTitle?.trim() || thread.companyName;
}

function displayContext(
  thread: Thread,
  user: CurrentUser | null,
  application: Application | null
): string {
  const company = thread.companyName?.trim() || "Компания";
  if (isHrRole(user)) {
    const vacancy = thread.vacancyTitle?.trim() || "Вакансия";
    return `${vacancy} · ${company}`;
  }
  const source = application
    ? applicationSourceLabel(application.source)
    : "Переписка";
  return `${company} · ${source}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const threadFromUrl = searchParams.get("thread");

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [applicationsByThread, setApplicationsByThread] = useState<
    Map<string, Application>
  >(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const user = getCurrentUser();
      setCurrentUser(user);
      if (!user) {
        setIsLoaded(true);
        return;
      }
      const userThreads = await getThreadsForUser(user.id);
      const threadApplications = await loadApplicationsByThread(userThreads, user);
      setThreads(userThreads);
      setApplicationsByThread(threadApplications);
      if (threadFromUrl) {
        const matched = userThreads.find(
          (thread) =>
            thread.id === threadFromUrl ||
            threadApplicationKey(thread.vacancyId, thread.candidateId) ===
              threadFromUrl
        );
        if (matched) setActiveId(matched.id);
      } else if (userThreads[0]) {
        setActiveId(userThreads[0].id);
      }
      setIsLoaded(true);
    }
    load();
  }, [threadFromUrl]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? null,
    [threads, activeId]
  );

  const activeApplication = useMemo(() => {
    if (!activeThread) return null;
    return (
      applicationsByThread.get(
        threadApplicationKey(activeThread.vacancyId, activeThread.candidateId)
      ) ?? null
    );
  }, [activeThread, applicationsByThread]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [activeThread?.id, activeThread?.messages.length]);

  async function handleSend() {
    if (!activeThread || !currentUser || !draft.trim() || isSending) return;
    setIsSending(true);
    try {
      const role = myMessageRole(currentUser);
      const updated = await sendMessage(
        activeThread.id,
        role,
        currentUser.fullName,
        draft.trim()
      );
      if (!updated) return;
      setThreads((prev) =>
        prev.map((thread) => (thread.id === updated.id ? updated : thread))
      );
      setDraft("");
    } finally {
      setIsSending(false);
    }
  }

  function handleComposeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  if (!isLoaded) {
    return <PageSkeleton variant="compact" />;
  }

  if (threads.length === 0) {
    const isHr = isHrRole(currentUser);
    return (
      <>
        <PageHeader
          eyebrow="Сообщения"
          title="Мессенджер"
          lead="Переписка по вакансиям и откликам"
        />
        <EmptyState
          title="Переписок пока нет"
          description={
            isHr
              ? "Откройте кандидата или вакансию — чат появится после первого контакта."
              : "Откликнитесь на вакансию или дождитесь приглашения от HR."
          }
          action={
            isHr ? (
              <Link href="/candidates" className="btn btn-primary">
                Кандидаты →
              </Link>
            ) : (
              <Link href="/jobs" className="btn btn-primary">
                Смотреть вакансии →
              </Link>
            )
          }
        />
      </>
    );
  }

  const role = myMessageRole(currentUser);

  return (
    <div data-screen-label="Сообщения">
      <PageHeader
        eyebrow="Сообщения"
        title="Мессенджер"
        lead={`${threads.length} активных переписок · контекст: вакансии и отклики`}
      />

      <div className="chat-layout">
        <aside className="chat-sidebar" aria-label="Список переписок">
          <div className="chat-sidebar__label">Переписки</div>
          {threads.map((thread) => {
            const isActive = thread.id === activeId;
            const last = thread.messages[thread.messages.length - 1];
            const title = displayName(thread, currentUser);
            const application =
              applicationsByThread.get(
                threadApplicationKey(thread.vacancyId, thread.candidateId)
              ) ?? null;
            const context = displayContext(thread, currentUser, application);
            return (
              <button
                type="button"
                key={thread.id}
                onClick={() => setActiveId(thread.id)}
                className={`chat-thread${isActive ? " is-active" : ""}`}
              >
                <div className="chat-thread__top">
                  <span className="chat-thread__name">{title}</span>
                  <span className="chat-thread__when">
                    {formatDate(thread.updatedAt)}
                  </span>
                </div>
                <div className="chat-thread__ctx">{context}</div>
                {last && (
                  <p className="chat-thread__preview">{last.body}</p>
                )}
              </button>
            );
          })}
        </aside>

        <section className="chat-panel" aria-label="Активная переписка">
          {activeThread ? (
            <>
              <header className="chat-header">
                <div
                  className="chat-header__avatar"
                  aria-hidden="true"
                >
                  {initials(displayName(activeThread, currentUser))}
                </div>
                <div className="chat-header__meta">
                  <h2 className="chat-header__title">
                    {displayName(activeThread, currentUser)}
                  </h2>
                  <p className="chat-header__subtitle">
                    {displayContext(
                      activeThread,
                      currentUser,
                      activeApplication
                    )}
                  </p>
                </div>
              </header>

              <div className="chat-scroll" ref={scrollRef}>
                <ChatApplicationContext
                  thread={activeThread}
                  application={activeApplication}
                  vacancyHref={
                    currentUser
                      ? vacancyHrefForThread(activeThread, currentUser)
                      : null
                  }
                  isHrViewer={isHrRole(currentUser)}
                />
                {activeThread.messages.length === 0 ? (
                  <div className="chat-empty">
                    <p className="chat-empty__title">Переписка начата</p>
                    <p className="chat-empty__lead">
                      Напишите первое сообщение — кандидат увидит его в
                      кабинете.
                    </p>
                  </div>
                ) : (
                  <div className="chat-messages">
                    {activeThread.messages.map((message) => {
                      const isMine = message.authorRole === role;
                      return (
                        <div
                          key={message.id}
                          className={`chat-message${
                            isMine ? " chat-message--out" : " chat-message--in"
                          }`}
                        >
                          <div className="chat-bubble">
                            {!isMine && (
                              <div className="chat-bubble__author">
                                {message.authorName}
                              </div>
                            )}
                            <p className="chat-bubble__text">{message.body}</p>
                            <time
                              className="chat-bubble__time"
                              dateTime={message.createdAt}
                            >
                              {formatDate(message.createdAt)}
                            </time>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="chat-compose">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposeKeyDown}
                  rows={3}
                  className="chat-compose__input"
                  placeholder="Сообщение…"
                  disabled={isSending}
                />
                <div className="chat-compose__footer">
                  <span className="chat-compose__hint">
                    Enter — отправить, Shift+Enter — новая строка
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={!draft.trim() || isSending}
                  >
                    {isSending ? "Отправка…" : "Отправить →"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="chat-empty">
              <p className="chat-empty__title">Выберите переписку</p>
              <p className="chat-empty__lead">
                Слева список активных чатов — откройте любой, чтобы продолжить
                диалог.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
