import Link from "next/link";
import type { ReactNode } from "react";

type RegisterTab = "candidate" | "company";

type RegisterLayoutProps = {
  activeTab: RegisterTab;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

export function RegisterLayout({
  activeTab,
  title,
  subtitle,
  aside,
  children,
  wide = false,
}: RegisterLayoutProps) {
  return (
    <div className="auth-screen">
      <header className="auth-topbar">
        <Link href="/login" className="brand">
          <span className="logo">WireHire</span>
        </Link>
        <Link href="/login" className="auth-link">
          Уже есть аккаунт? Войти →
        </Link>
      </header>

      <main className={`auth-main${wide ? " auth-main--wide" : ""}`}>
        <div className={`auth-card${wide ? " auth-card--wide" : ""}`}>
          <div className="auth-register-head">
            <h1 className="h-display auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>

          <nav className="auth-steps" aria-label="Тип регистрации">
            <Link
              href="/register"
              className={`auth-step${activeTab === "candidate" ? " is-active" : ""}`}
              aria-current={activeTab === "candidate" ? "step" : undefined}
            >
              <span className="auth-step__num">01</span>
              <span className="auth-step__label">Кандидат</span>
            </Link>
            <Link
              href="/register/company"
              className={`auth-step${activeTab === "company" ? " is-active" : ""}`}
              aria-current={activeTab === "company" ? "step" : undefined}
            >
              <span className="auth-step__num">02</span>
              <span className="auth-step__label">Компания</span>
            </Link>
          </nav>

          <div className={`auth-register-body${aside ? " has-aside" : ""}`}>
            {aside && <aside className="auth-aside">{aside}</aside>}
            <div className="auth-register-form">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
