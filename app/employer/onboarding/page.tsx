"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/session";
import { getCompanies, saveCompany } from "@/lib/api/companies";
import { getMyCompany, updateMyCompany } from "@/lib/api/company";
import { Company } from "@/types/company";
import { CurrentUser } from "@/types/user";
import { CompanyModerationNotice } from "@/components/CompanyModerationNotice";
import {
  PageHeader,
  Section,
  Status,
  Crumb,
} from "@/components/ui/editorial";

type VerificationScopeDefault = "trust_only" | "skills_only" | "full";

export default function EmployerOnboardingPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");

  const [defaultScope, setDefaultScope] =
    useState<VerificationScopeDefault>("full");
  const [defaultProctoring, setDefaultProctoring] = useState(false);
  // FR-021: SLA, locations
  const [extraLocations, setExtraLocations] = useState("");
  const [refereeSlaDays, setRefereeSlaDays] = useState(7);
  const [refereeReminderDays, setRefereeReminderDays] = useState(2);

  const COMPANY_PREFS_KEY = "wirehire-company-prefs";

  useEffect(() => {
    const raw = localStorage.getItem(COMPANY_PREFS_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (p.extraLocations) setExtraLocations(p.extraLocations);
        if (p.refereeSlaDays) setRefereeSlaDays(p.refereeSlaDays);
        if (p.refereeReminderDays)
          setRefereeReminderDays(p.refereeReminderDays);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    async function load() {
      const user = getCurrentUser();
      setCurrentUser(user);
      if (!user) {
        setIsLoaded(true);
        return;
      }

      // Сначала пробуем GET /me/company с бэка.
      // Если не вышло — fallback на локальный список компаний.
      let resolvedCompany: Company | null = null;
      try {
        resolvedCompany = await getMyCompany();
      } catch {
        const companies = await getCompanies();
        resolvedCompany =
          companies.find((c) => c.ownerUserId === user.id) ??
          companies.find((c) => c.name === user.companyName) ??
          null;
      }

      setCompany(resolvedCompany);
      if (resolvedCompany) {
        setName(resolvedCompany.name);
        setWebsite(resolvedCompany.website ?? "");
        setIndustry(resolvedCompany.industry ?? "");
        setDescription(resolvedCompany.description ?? "");
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем настройки" />;
  }

  if (
    currentUser &&
    currentUser.role !== "hr" &&
    currentUser.role !== "hiring_manager" &&
    currentUser.role !== "admin"
  ) {
    return (
      <PageHeader
        eyebrow="Доступ"
        title="Настройки компании"
        lead="У вас нет прав на просмотр этой страницы. Если вы считаете, что это ошибка, обратитесь к администратору вашей компании"
        actions={
          <Link href="/dashboard" className="btn btn-primary">
            К дашборду →
          </Link>
        }
      />
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Название компании обязательно");
      return;
    }
    const next: Company = company
      ? {
          ...company,
          name: name.trim(),
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          description: description.trim() || undefined,
        }
      : {
          id: `company-${Date.now()}`,
          name: name.trim(),
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          description: description.trim() || undefined,
          status: "active",
          ownerUserId: currentUser?.id,
          createdAt: new Date().toLocaleDateString("ru-RU"),
        };
    const saved = await saveCompany(next);
    setCompany(saved);
    // PATCH /me/company — параллельно на бэк
    try {
      await updateMyCompany({
        publicName: next.name,
        site: next.website ?? null,
        industry: next.industry ?? null,
        about: next.description ?? null,
      });
    } catch (err) {
      console.warn("PATCH /me/company failed:", err);
    }
    // FR-021: company-level prefs — SLA, locations
    localStorage.setItem(
      COMPANY_PREFS_KEY,
      JSON.stringify({
        extraLocations: extraLocations.trim(),
        refereeSlaDays,
        refereeReminderDays,
        defaultScope,
        defaultProctoring,
      })
    );
    setError("");
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2400);
  }

  const companyStatus = company?.status;

  return (
    <div data-screen-label="Компания · Настройки">
      <PageHeader
        wideTitle
        eyebrow="Компания"
        title="Настройки компании"
        lead="Заполните основные данные о компании и выберите степень проверки кандидатов"
        actions={
          <>
            {savedNotice && (
              <span
                className="mono muted"
                style={{
                  fontSize: 12,
                  alignSelf: "center",
                  letterSpacing: 0.4,
                }}
              >
                Сохранено ✓
              </span>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
            >
              Сохранить →
            </button>
          </>
        }
      />

      <CompanyModerationNotice compact />

      {error && (
        <div
          className="placeholder"
          style={{
            borderColor: "var(--risk)",
            color: "var(--risk)",
            marginBottom: 32,
          }}
        >
          {error}
        </div>
      )}

      <Section num="01" label="Основные данные">
        <div className="fieldgrid">
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Название компании *</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input"
              style={{ fontSize: 24, letterSpacing: "-0.018em" }}
            />
          </div>
          <div className="field">
            <span className="field-label">Сайт</span>
            <input
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              className="input"
              placeholder="https://"
            />
          </div>
          <div className="field">
            <span className="field-label">Индустрия</span>
            <input
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className="input"
              placeholder="SaaS, Fintech…"
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Описание</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="textarea"
              placeholder="Что вы делаете, для кого, в каком масштабе. Эту строчку увидят кандидаты в карточках вакансий"
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">
              Локации{" "}
              <span
                className="muted"
                style={{
                  textTransform: "none",
                  letterSpacing: 0,
                  fontFamily: "var(--font-sans)",
                }}
              >
                · через запятую
              </span>
            </span>
            <input
              value={extraLocations}
              onChange={(event) => setExtraLocations(event.target.value)}
              className="input"
              placeholder="Москва, СПб, Тбилиси, удаленно"
            />
          </div>
        </div>
      </Section>

      <Section num="02" label="Степень проверки">
        <div className="caption" style={{ marginBottom: 14 }}>
          Выбор проверки
        </div>
        {(
          [
            [
              "trust_only",
              "Только опыт",
              "Доверие к опыту работы. Подходит для кандидатов с длинной историей",
            ],
            [
              "skills_only",
              "Только навыки",
              "AI-оценка без проверки опыта. Подходит для кандидатов с короткой историей или из других индустрий",
            ],
            [
              "full",
              "Полная проверка",
              "Опыт + навыки + прокторинг. Подходит для критичных позиций и/или новых кандидатов без репутации",
            ],
          ] as const
        ).map(([value, ttl, desc]) => (
          <button
            key={value}
            type="button"
            className={`radio ${defaultScope === value ? "on" : ""}`}
            onClick={() => setDefaultScope(value)}
          >
            <span className="dot"></span>
            <span>
              <div className="ttl">{ttl}</div>
              <div className="desc">{desc}</div>
            </span>
          </button>
        ))}

        <div className="caption" style={{ marginTop: 32, marginBottom: 14 }}>
          Прокторинг по умолчанию
        </div>
        <button
          type="button"
          className={`radio ${defaultProctoring ? "on" : ""}`}
          onClick={() => setDefaultProctoring(!defaultProctoring)}
        >
          <span className="dot"></span>
          <span>
            <div className="ttl">Включать прокторинг для новых проверок</div>
            <div className="desc">
              Кандидат может отказаться — об этом сообщается в отчете
            </div>
          </span>
        </button>

        <div className="caption" style={{ marginTop: 32, marginBottom: 14 }}>
          SLA(?) ответов референтов
        </div>
        <div className="fieldgrid">
          <div className="field">
            <span className="field-label">Срок (дней)</span>
            <input
              type="number"
              min={1}
              max={30}
              className="input"
              value={refereeSlaDays}
              onChange={(event) =>
                setRefereeSlaDays(
                  Math.max(1, Math.min(30, Number(event.target.value) || 1))
                )
              }
            />
          </div>
          <div className="field">
            <span className="field-label">Напомнить за (дней)</span>
            <input
              type="number"
              min={1}
              max={14}
              className="input"
              value={refereeReminderDays}
              onChange={(event) =>
                setRefereeReminderDays(
                  Math.max(1, Math.min(14, Number(event.target.value) || 1))
                )
              }
            />
          </div>
        </div>
      </Section>

      {company && (
        <Section num="03" label="Статус и команда">
          <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
            Компания «{company.name}» сохранена со статусом{" "}
            <Status tone={companyStatus === "active" ? "good" : "warn"}>
              {companyStatus === "active"
                ? "активна"
                : companyStatus === "pending_moderation"
                  ? "на модерации"
                  : "приостановлена"}
            </Status>
            . Можно создавать вакансии и приглашать кандидатов
          </div>

          <div className="dl" style={{ marginBottom: 32 }}>
            <div>
              <span className="k">Название</span>
              <span className="v">{company.name}</span>
            </div>
            {company.website && (
              <div>
                <span className="k">Сайт</span>
                <span className="v">{company.website}</span>
              </div>
            )}
            {company.industry && (
              <div>
                <span className="k">Индустрия</span>
                <span className="v">{company.industry}</span>
              </div>
            )}
            <div>
              <span className="k">Степень проверки</span>
              <span className="v">
                {defaultScope === "trust_only"
                  ? "только опыт"
                  : defaultScope === "skills_only"
                    ? "только навыки"
                    : "полная"}
              </span>
            </div>
            <div>
              <span className="k">Прокторинг по умолчанию</span>
              <span className="v">
                {defaultProctoring ? "включен" : "выключен"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/vacancies" className="btn btn-primary">
              Создать вакансию →
            </Link>
          </div>
        </Section>
      )}
    </div>
  );
}
