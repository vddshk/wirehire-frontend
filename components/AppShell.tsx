"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getApplications,
  getApplicationsByCandidateId,
} from "@/lib/api/applications";
import { getCandidates } from "@/lib/api/candidates";
import { getManagerDecisions } from "@/lib/api/managerDecisions";
import { getNotificationsForUser } from "@/lib/api/notifications";
import {
  getCurrentUser,
  isAuthenticated,
  logout,
} from "@/lib/api/session";
import { refreshCurrentUserDisplayName } from "@/lib/api/userDisplayName";
import { getPublishedVacancies, getVacancies } from "@/lib/api/vacancies";
import { getVerificationRunsByCandidateId } from "@/lib/api/verification";
import { AppShellSkeleton } from "@/components/ui/PageSkeleton";
import { Application } from "@/types/application";
import { CurrentUser, UserRole } from "@/types/user";

const PUBLIC_PATHS = ["/", "/login", "/register", "/reference"];

function isPublicPath(pathname: string): boolean {
  if (!pathname) return false;
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  );
}

type CountKey =
  | "publishedVacancies"
  | "myApplications"
  | "myVerifications"
  | "admittedCandidates"
  | "activeApplications"
  | "publishedVacanciesHr"
  | "managerDecisions"
  | "notificationsUnread";

type NavItem = {
  title: string;
  href?: string;
  countKey?: CountKey;
  disabled?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type NavRole = Exclude<UserRole, "reference_provider">;

const COMPANY_NAV: NavGroup[] = [
  {
    label: "Работа",
    items: [
      { title: "Дашборд", href: "/dashboard" },
      {
        title: "Поиск кандидатов",
        href: "/candidates",
        countKey: "admittedCandidates",
      },
      { title: "Сохраненные", href: "/candidates/saved" },
      {
        title: "Воронка",
        href: "/applications",
        countKey: "activeApplications",
      },
      { title: "Проверки", href: "/verification" },
      {
        title: "Решения",
        href: "/manager/reports",
        countKey: "managerDecisions",
      },
    ],
  },
  {
    label: "Компания",
    items: [
      {
        title: "Вакансии",
        href: "/vacancies",
        countKey: "publishedVacanciesHr",
      },
      { title: "Запросы референтов", disabled: true },
      { title: "Мессенджер", href: "/messages" },
      {
        title: "Уведомления",
        href: "/notifications",
        countKey: "notificationsUnread",
      },
      { title: "Настройки компании", href: "/employer/onboarding" },
    ],
  },
];

const NAV_BY_ROLE: Record<NavRole, NavGroup[]> = {
  candidate: [
    {
      label: "Поиск",
      items: [
        { title: "Главная", href: "/candidate/dashboard" },
        { title: "Мой профиль", href: "/candidate/profile" },
        { title: "AI-оценка", href: "/candidate/assessment" },
        {
          title: "Поиск работы",
          href: "/jobs",
          countKey: "publishedVacancies",
        },
        {
          title: "Мои отклики",
          href: "/candidate/applications",
          countKey: "myApplications",
        },
      ],
    },
    {
      label: "Аккаунт",
      items: [
        { title: "Сообщения", href: "/messages" },
        {
          title: "Уведомления",
          href: "/notifications",
          countKey: "notificationsUnread",
        },
        { title: "Согласия", href: "/candidate/consents" },
      ],
    },
  ],
  hr: COMPANY_NAV,
  hiring_manager: COMPANY_NAV,
  admin: [
    {
      label: "Платформа",
      items: [
        { title: "Кандидаты", href: "/admin/candidates" },
        { title: "Компании", href: "/admin/companies" },
        { title: "Пользователи", href: "/admin/users" },
        { title: "Журнал", href: "/audit" },
      ],
    },
  ],
};

const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  candidate: "/candidate/dashboard",
  hr: "/dashboard",
  hiring_manager: "/dashboard",
  admin: "/admin/candidates",
  reference_provider: "/",
};

const SHORT_ROLE_LABELS: Record<UserRole, string> = {
  candidate: "Кандидат",
  hr: "Компания",
  hiring_manager: "Компания",
  admin: "Админ",
  reference_provider: "Reference",
};

function ChevronDown() {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 1.5L6 6.5L11 1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Counts = Record<CountKey, number>;

const INITIAL_COUNTS: Counts = {
  publishedVacancies: 0,
  myApplications: 0,
  myVerifications: 0,
  admittedCandidates: 0,
  activeApplications: 0,
  publishedVacanciesHr: 0,
  managerDecisions: 0,
  notificationsUnread: 0,
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type AppShellProps = { children: React.ReactNode };

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const publicPath = useMemo(() => isPublicPath(pathname), [pathname]);

  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(null);
  const [counts, setCounts] = useState<Counts>(INITIAL_COUNTS);
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      const ok = isAuthenticated();
      if (ok) {
        await refreshCurrentUserDisplayName();
      }
      if (cancelled) return;
      setAuthed(ok);
      setCurrentUserState(ok ? getCurrentUser() : null);
      setAuthChecked(true);
    }

    void bootstrapAuth();

    const onRoleChanged = () => {
      const nowOk = isAuthenticated();
      setAuthed(nowOk);
      setCurrentUserState(nowOk ? getCurrentUser() : null);
    };
    window.addEventListener("wirehire-role-changed", onRoleChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("wirehire-role-changed", onRoleChanged);
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (publicPath) return;
    if (!authed) {
      router.replace("/login");
    }
  }, [authChecked, authed, publicPath, router]);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    async function loadCounts(user: CurrentUser) {
      const candidateId = user.candidateId;

      if (user.role === "candidate") {
        const [
          publishedVacancies,
          myApplications,
          myVerifications,
          userNotifications,
        ] = await Promise.all([
          getPublishedVacancies(),
          candidateId
            ? getApplicationsByCandidateId(candidateId)
            : Promise.resolve<Application[]>([]),
          candidateId
            ? getVerificationRunsByCandidateId(candidateId)
            : Promise.resolve([]),
          getNotificationsForUser(user.id),
        ]);

        if (cancelled) return;

        const activeVerifications = myVerifications.filter(
          (run) =>
            run.status === "active" ||
            run.status === "waiting_consent" ||
            run.status === "created"
        ).length;

        const notificationsUnread = userNotifications.filter(
          (notification) => !notification.isRead
        ).length;

        setCounts({
          publishedVacancies: publishedVacancies.length,
          myApplications: myApplications.length,
          myVerifications: activeVerifications,
          admittedCandidates: 0,
          activeApplications: 0,
          publishedVacanciesHr: 0,
          managerDecisions: 0,
          notificationsUnread,
        });
        return;
      }

      const [
        publishedVacancies,
        myApplications,
        myVerifications,
        candidates,
        applications,
        allVacancies,
        managerDecisions,
        userNotifications,
      ] = await Promise.all([
        getPublishedVacancies(),
        candidateId
          ? getApplicationsByCandidateId(candidateId)
          : Promise.resolve<Application[]>([]),
        candidateId
          ? getVerificationRunsByCandidateId(candidateId)
          : Promise.resolve([]),
        getCandidates(),
        getApplications(),
        getVacancies(),
        getManagerDecisions(),
        getNotificationsForUser(user.id),
      ]);

      if (cancelled) return;

      const activeApplications = applications.filter(
        (app) =>
          app.status !== "hired" &&
          app.status !== "rejected" &&
          app.status !== "withdrawn"
      ).length;

      const activeVerifications = myVerifications.filter(
        (run) =>
          run.status === "active" ||
          run.status === "waiting_consent" ||
          run.status === "created"
      ).length;

      const admittedCandidates = candidates.filter(
        (cand) => cand.profileStatus === "admitted"
      ).length;

      const publishedVacanciesHr = allVacancies.filter(
        (vac) => vac.status === "published"
      ).length;

      const notificationsUnread = userNotifications.filter(
        (notification) => !notification.isRead
      ).length;

      setCounts({
        publishedVacancies: publishedVacancies.length,
        myApplications: myApplications.length,
        myVerifications: activeVerifications,
        admittedCandidates,
        activeApplications,
        publishedVacanciesHr,
        managerDecisions: managerDecisions.length,
        notificationsUnread,
      });
    }

    loadCounts(currentUser);

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;
    function onClick(event: MouseEvent) {
      const node = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isUserMenuOpen]);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.replace("/login");
  }, [router]);

  function isItemActive(href?: string) {
    if (!href) return false;
    if (href === "/dashboard" || href === "/candidate/dashboard") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (publicPath) {
    return <>{children}</>;
  }

  if (!authChecked) {
    return <AppShellSkeleton />;
  }

  if (!authed && !publicPath) {
    return <AppShellSkeleton />;
  }

  const activeRole: UserRole = currentUser?.role ?? "hr";
  const navGroups =
    activeRole !== "reference_provider" ? NAV_BY_ROLE[activeRole] : [];

  const userName = currentUser?.fullName ?? "—";
  const userSubtitle = (() => {
    if (!currentUser) return "Гость";
    if (currentUser.role === "candidate") {
      return SHORT_ROLE_LABELS.candidate;
    }
    if (currentUser.companyName) {
      return `${SHORT_ROLE_LABELS[currentUser.role]} · ${currentUser.companyName}`;
    }
    return SHORT_ROLE_LABELS[currentUser.role];
  })();

  const initials = initialsOf(userName);

  return (
    <div className="app">
      <header className="modebar">
        <div className="modebar-left">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Открыть меню"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <Link href={DASHBOARD_BY_ROLE[activeRole]} className="brand">
            <span className="logo">WireHire</span>
          </Link>
        </div>

        <div
          className={`user-menu${isUserMenuOpen ? " is-open" : ""}`}
          ref={userMenuRef}
        >
          <button
            type="button"
            className={`trigger${isUserMenuOpen ? " is-open" : ""}`}
            onClick={() => setIsUserMenuOpen((open) => !open)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
          >
            <span className="avatar-mono" aria-hidden="true">
              {initials}
            </span>
            <span className="user-meta">
              <span className="user-name">{userName}</span>
              <span className="user-sub">{userSubtitle}</span>
            </span>
            <span className="user-chevron" aria-hidden="true">
              <ChevronDown />
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="panel" role="menu">
              <div className="header">
                <span className="header-avatar" aria-hidden="true">
                  {initials}
                </span>
                <div className="header-copy">
                  <div className="name">{userName}</div>
                  <div className="sub">{userSubtitle}</div>
                </div>
              </div>

              {activeRole === "candidate" && (
                <Link
                  href="/candidate/profile"
                  className="item"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Профиль
                </Link>
              )}

              {(activeRole === "hr" || activeRole === "hiring_manager") && (
                <Link
                  href="/employer/onboarding"
                  className="item"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Настройки компании
                </Link>
              )}

              {activeRole === "admin" && (
                <Link
                  href="/audit"
                  className="item"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Журнал
                </Link>
              )}

              <div className="divider" />

              <button
                type="button"
                className="item danger"
                role="menuitem"
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </header>

      {isMenuOpen && (
        <div
          className="sidenav-overlay"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="workspace">
        <nav
          className={`sidenav ${isMenuOpen ? "is-open" : ""}`}
          aria-label="Основная навигация"
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="grouplabel">{group.label}</div>

              <div className="group" role="list">
                {group.items.map((item) => {
                  const count =
                    item.countKey !== undefined
                      ? counts[item.countKey]
                      : undefined;
                  const active = isItemActive(item.href);

                  if (item.disabled || !item.href) {
                    return (
                      <span
                        key={item.title}
                        className="navitem is-disabled"
                        title="Появится позже"
                      >
                        <span>{item.title}</span>
                        {count !== undefined && (
                          <span className="count">{count}</span>
                        )}
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={`navitem ${active ? "active" : ""}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>{item.title}</span>
                      {count !== undefined && (
                        <span className="count">{count}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="me">
            <div className="name">{userName}</div>
            <div className="sub">{userSubtitle}</div>
          </div>
        </nav>

        <main className="main main--enter">{children}</main>
      </div>
    </div>
  );
}
