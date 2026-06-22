"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyCompany } from "@/lib/api/company";
import { Company, CompanyStatus } from "@/types/company";
import { Status } from "@/components/ui/editorial";

const statusCopy: Record<
  CompanyStatus,
  { title: string; body: string; tone: "warn" | "risk" | "good" }
> = {
  pending_moderation: {
    title: "Компания на проверке",
    body: "Кабинет открыт в ограниченном режиме. Администратор свяжется с вами для подтверждения документов. После одобрения станут доступны публикация вакансий и полный доступ к базе кандидатов.",
    tone: "warn",
  },
  suspended: {
    title: "Компания не подтверждена",
    body: "Регистрация отклонена или приостановлена. Проверьте почту или обновите данные в профиле компании.",
    tone: "risk",
  },
  active: {
    title: "Компания подтверждена",
    body: "Профиль компании проверен. Доступны все функции кабинета HR.",
    tone: "good",
  },
};

type CompanyModerationNoticeProps = {
  compact?: boolean;
};

export function CompanyModerationNotice({
  compact = false,
}: CompanyModerationNoticeProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getMyCompany();
        if (!cancelled) setCompany(data);
      } catch {
        if (!cancelled) setCompany(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !company || company.status === "active") {
    return null;
  }

  const copy = statusCopy[company.status];

  return (
    <div
      className={`company-moderation-notice${compact ? " company-moderation-notice--compact" : ""}`}
      role="status"
    >
      <div className="company-moderation-notice__head">
        <Status tone={copy.tone}>{copy.title}</Status>
        <span className="company-moderation-notice__name">{company.name}</span>
      </div>
      <p className="company-moderation-notice__body">{copy.body}</p>
      {!compact && (
        <div className="company-moderation-notice__actions">
          <Link href="/employer/onboarding" className="btn btn-ghost">
            Профиль компании
          </Link>
        </div>
      )}
    </div>
  );
}
