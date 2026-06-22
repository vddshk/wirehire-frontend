"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mockApplications } from "@/data/mockApplications";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Placeholder,
} from "@/components/ui/editorial";

type DemoStorageStats = {
  savedCandidates: number;
  savedVacancies: number;
  savedApplications: number;
  verificationRuns: number;
  reports: number;
  auditEvents: number;
};

const storageKeys = {
  candidates: "wirehire-candidates",
  vacancies: "wirehire-vacancies",
  applications: "wirehire-applications",
  verificationRuns: "wirehire-verification-runs",
  reports: "wirehire-reports",
  auditEvents: "wirehire-audit-events",
};

function getStoredArrayLength(key: string) {
  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return 0;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue.length;
    }

    return 0;
  } catch {
    return 0;
  }
}

function getDemoStorageStats(): DemoStorageStats {
  return {
    savedCandidates: getStoredArrayLength(storageKeys.candidates),
    savedVacancies: getStoredArrayLength(storageKeys.vacancies),
    savedApplications: getStoredArrayLength(storageKeys.applications),
    verificationRuns: getStoredArrayLength(storageKeys.verificationRuns),
    reports: getStoredArrayLength(storageKeys.reports),
    auditEvents: getStoredArrayLength(storageKeys.auditEvents),
  };
}

export default function DemoPage() {
  const [stats, setStats] = useState<DemoStorageStats>({
    savedCandidates: 0,
    savedVacancies: 0,
    savedApplications: 0,
    verificationRuns: 0,
    reports: 0,
    auditEvents: 0,
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    setStats(getDemoStorageStats());
  }, []);

  function refreshStats() {
    setStats(getDemoStorageStats());
  }

  function handleResetDemoData() {
    localStorage.removeItem(storageKeys.candidates);
    localStorage.removeItem(storageKeys.vacancies);
    localStorage.removeItem(storageKeys.verificationRuns);
    localStorage.removeItem(storageKeys.reports);
    localStorage.removeItem(storageKeys.auditEvents);

    localStorage.setItem(
      storageKeys.applications,
      JSON.stringify(mockApplications)
    );

    setMessage(
      "Демо-данные сброшены. Кандидаты и вакансии вернулись к моковым данным, pipeline сброшен, проверки, отчеты и журнал очищены."
    );

    refreshStats();
  }

  function handleClearAuditOnly() {
    localStorage.removeItem(storageKeys.auditEvents);

    setMessage("Журнал действий очищен.");

    refreshStats();
  }

  function handleClearReportsOnly() {
    localStorage.removeItem(storageKeys.reports);

    setMessage("Отчеты очищены. Проверки при этом не удалены.");

    refreshStats();
  }

  function handleClearVerificationOnly() {
    localStorage.removeItem(storageKeys.verificationRuns);
    localStorage.removeItem(storageKeys.reports);

    const resetApplications = mockApplications.map((application) => ({
      ...application,
      verificationRunId: undefined,
    }));

    localStorage.setItem(
      storageKeys.applications,
      JSON.stringify(resetApplications)
    );

    setMessage(
      "Проверки и отчеты очищены. Pipeline возвращен к базовому состоянию."
    );

    refreshStats();
  }

  const hasDynamicData =
    stats.savedCandidates > 0 ||
    stats.savedVacancies > 0 ||
    stats.verificationRuns > 0 ||
    stats.reports > 0 ||
    stats.auditEvents > 0;

  return (
    <>
      <PageHeader
        eyebrow="Demo mode"
        title="Демо-режим"
        lead="Подготовка продукта к показу. Очисти localStorage и верни приложение в стартовое состояние."
      />

      {message && (
        <div
          style={{
            marginBottom: 40,
            padding: "16px 20px",
            border: "1px solid var(--good)",
            borderRadius: 2,
            fontSize: 14,
            color: "var(--fg)",
          }}
        >
          {message}
        </div>
      )}

      <StatGrid cols={3}>
        <Stat value={stats.savedCandidates} label="Созданные кандидаты" />
        <Stat value={stats.savedVacancies} label="Созданные вакансии" />
        <Stat value={stats.savedApplications} label="Отклики в pipeline" />
        <Stat value={stats.verificationRuns} label="Проверки" />
        <Stat value={stats.reports} label="Отчеты" />
        <Stat value={stats.auditEvents} label="Audit events" />
      </StatGrid>

      <Section num="01" label="Управление демо-данными">
        <p style={{ marginBottom: 28, fontSize: 15, color: "var(--muted)" }}>
          Основная кнопка ниже полностью готовит приложение к новой
          демонстрации. Используйте ее перед показом, если хотите начать с
          чистого состояния.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, border: "1px solid var(--line-soft)" }}>
          <button
            onClick={handleResetDemoData}
            style={{ padding: 24, textAlign: "left", cursor: "pointer", background: "var(--ink)", color: "var(--bg)", border: "none" }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Сбросить демо-данные
            </div>
            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
              Очистит созданных кандидатов, вакансии, проверки, отчеты и
              журнал. Pipeline вернется к базовым откликам.
            </p>
          </button>

          <button
            onClick={handleClearVerificationOnly}
            style={{ padding: 24, textAlign: "left", cursor: "pointer", background: "transparent", border: "none", borderLeft: "1px solid var(--line-soft)" }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Очистить проверки и отчеты
            </div>
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
              Удалит проверки и отчеты, но оставит созданных
              кандидатов и вакансии
            </p>
          </button>

          <button
            onClick={handleClearReportsOnly}
            style={{ padding: 24, textAlign: "left", cursor: "pointer", background: "transparent", border: "none", borderTop: "1px solid var(--line-soft)" }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Очистить только отчеты
            </div>
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
              Полезно, если нужно заново показать процесс формирования отчета.
            </p>
          </button>

          <button
            onClick={handleClearAuditOnly}
            style={{ padding: 24, textAlign: "left", cursor: "pointer", background: "transparent", border: "none", borderTop: "1px solid var(--line-soft)", borderLeft: "1px solid var(--line-soft)" }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Очистить только журнал
            </div>
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
              Удалит audit events, но не тронет кандидатов, проверки и отчеты.
            </p>
          </button>
        </div>

        {!hasDynamicData && (
          <Placeholder>
            Приложение уже в чистом демо-состоянии.
          </Placeholder>
        )}
      </Section>

      <Section num="02" label="Быстрый маршрут">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid var(--line-soft)" }}>
          {[
            { num: "01", href: "/dashboard", title: "Dashboard", desc: "Показать общую картину продукта." },
            { num: "02", href: "/candidates", title: "Кандидаты", desc: "Показать профиль, опыт и evidence." },
            { num: "03", href: "/applications", title: "Pipeline", desc: "Провести кандидата до проверки." },
            { num: "04", href: "/audit", title: "Журнал", desc: "Показать прозрачность действий." },
          ].map((step, i) => (
            <Link
              key={step.num}
              href={step.href}
              style={{
                display: "block",
                padding: 24,
                borderLeft: i > 0 ? "1px solid var(--line-soft)" : undefined,
              }}
            >
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{step.num}</div>
              <div style={{ marginTop: 8, fontWeight: 600, letterSpacing: "-0.015em" }}>{step.title}</div>
              <p style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>{step.desc}</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
