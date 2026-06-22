"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getCurrentUser, isAuthenticated } from "@/lib/api/session";
import { UserRole } from "@/types/user";

const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  candidate: "/candidate/dashboard",
  hr: "/dashboard",
  hiring_manager: "/dashboard",
  admin: "/audit",
  reference_provider: "/",
};

const STEPS = [
  {
    num: "01",
    label: "профиль",
    title: "Профиль вместо резюме",
    text: "Кандидат один раз собирает опыт, навыки и материалы. Видимость профиля и проверки — отдельные согласия, которые он контролирует сам.",
  },
  {
    num: "02",
    label: "проверка",
    title: "AI-оценка и верификация",
    text: "Платформа проверяет навыки тестами с прокторингом и подтверждает опыт через референсы. HR видит подтвержденный уровень, а не обещания.",
  },
  {
    num: "03",
    label: "найм",
    title: "Поиск и воронка",
    text: "Компания ищет по подтвержденным данным — навыки, баллы, статусы проверок — и ведет отклики до оффера в одном пространстве.",
  },
] as const;

const TICKER_ITEMS = [
  "AI-оценка навыков",
  "Верификация опыта",
  "Прокторинг",
  "Согласия под контролем кандидата",
  "Поиск по подтвержденным данным",
  "Воронка откликов",
] as const;

/** Появление блока при попадании в viewport. */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${visible ? " is-visible" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/** Счетчик с плавным набором значения. */
function useCountUp(target: number, durationMs = 1400, startDelayMs = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    let start: number | null = null;

    function tick(now: number) {
      if (start === null) start = now;
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, startDelayMs);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs, startDelayMs]);

  return value;
}

function HeroCard() {
  const score = useCountUp(87);

  return (
    <div className="landing-card">
      <div className="landing-card__topline">
        <span className="landing-card__tag">профиль кандидата</span>
        <span className="landing-card__badge">допущен в поиск</span>
      </div>
      <div className="landing-card__person">
        <span className="landing-card__avatar">АК</span>
        <div>
          <p className="landing-card__name">Анна Ковалева</p>
          <p className="landing-card__role">
            Senior Frontend · Москва · удаленно
          </p>
        </div>
      </div>
      <div className="landing-card__rows">
        <div className="landing-card__row">
          <span>AI-оценка навыков</span>
          <strong>{score} / 100</strong>
        </div>
        <div className="landing-card__row">
          <span>Опыт подтвержден</span>
          <strong>4 из 5 карточек</strong>
        </div>
        <div className="landing-card__row">
          <span>Согласия</span>
          <strong>активны</strong>
        </div>
      </div>
      <div className="landing-card__meter" role="presentation">
        <span
          className="landing-card__meter-fill"
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="landing-card__skills">
        <span className="is-verified">React</span>
        <span className="is-verified">TypeScript</span>
        <span>Node.js</span>
        <span>GraphQL</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setShowLanding(true);
      setMounted(true);
      return;
    }
    const user = getCurrentUser();
    router.replace(DASHBOARD_BY_ROLE[user.role] ?? "/login");
  }, [router]);

  if (!mounted || !showLanding) {
    return (
      <div className="auth-screen">
        <header className="auth-topbar">
          <Link href="/" className="brand">
            <span className="logo">WireHire</span>
          </Link>
        </header>
        <main className="landing-main">
          <PageSkeleton variant="landing" />
        </main>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <header className="auth-topbar">
        <Link href="/" className="brand">
          <span className="logo">WireHire</span>
        </Link>
        <div className="landing-actions">
          <Link href="/login" className="auth-link">
            Войти →
          </Link>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <div className="eyebrow">Платформа найма</div>
            <h1 className="h-display">
              Проверка кандидатов
              <br />
              <em>без шума</em>
            </h1>
            <p className="landing-hero__lead">
              WireHire соединяет профиль кандидата, AI-оценку навыков и
              HR-воронку. Меньше ручной рутины — больше решений на фактах.
            </p>
            <div className="landing-actions">
              <Link href="/register" className="btn btn-primary btn-lg">
                Я кандидат →
              </Link>
              <Link href="/register/company" className="btn btn-lg">
                Я компания →
              </Link>
            </div>
          </div>

          <aside className="landing-hero__visual" aria-hidden="true">
            <HeroCard />
          </aside>
        </section>

        <div className="landing-ticker" aria-hidden="true">
          <div className="landing-ticker__track">
            {[0, 1].map((copy) => (
              <div className="landing-ticker__group" key={copy}>
                {TICKER_ITEMS.map((item) => (
                  <span key={item} className="landing-ticker__item">
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="landing-steps" aria-label="Как это работает">
          <Reveal>
            <h2 className="h-section landing-section-title">
              Как это работает
            </h2>
          </Reveal>
          <div className="landing-steps__grid">
            {STEPS.map((step, index) => (
              <Reveal
                className="landing-step"
                key={step.num}
                delay={index * 110}
              >
                <div className="landing-step__head">
                  <span className="landing-step__num">{step.num}</span>
                  <span className="landing-step__label">{step.label}</span>
                </div>
                <h3 className="landing-step__title">{step.title}</h3>
                <p className="landing-step__text">{step.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <section className="landing-split" aria-label="Для кого платформа">
            <div className="landing-split__col">
              <span className="landing-split__eyebrow">кандидатам</span>
              <h2 className="landing-split__title">
                Один профиль — все процессы
              </h2>
              <p className="landing-split__text">
                Соберите опыт и навыки один раз, пройдите оценку и управляйте
                тем, кто и что видит. Без рассылки резюме по сто раз.
              </p>
              <Link href="/register" className="btn btn-primary">
                Создать профиль →
              </Link>
            </div>
            <div className="landing-split__col">
              <span className="landing-split__eyebrow">компаниям</span>
              <h2 className="landing-split__title">
                Нанимайте по подтвержденным данным
              </h2>
              <p className="landing-split__text">
                Ищите по обязательным навыкам и баллам AI-оценки, ведите
                воронку и запускайте проверки — все в одном месте.
              </p>
              <Link href="/register/company" className="btn">
                Зарегистрировать компанию →
              </Link>
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
