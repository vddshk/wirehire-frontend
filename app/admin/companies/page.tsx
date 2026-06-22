"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCompanies } from "@/lib/api/companies";
import { Company, CompanyStatus } from "@/types/company";
import { getLegalFormShortLabel } from "@/lib/utils/companyLegalForm";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Status,
  Crumb,
  EditorialTable,
  Placeholder,
  Stat,
  StatGrid,
} from "@/components/ui/editorial";

const statusLabels: Record<CompanyStatus, string> = {
  pending_moderation: "на проверке",
  active: "подтверждена",
  suspended: "отклонена",
};

const statusTones: Record<
  CompanyStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  pending_moderation: "warn",
  active: "good",
  suspended: "risk",
};

type StatusFilter = "all" | CompanyStatus;

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    "pending_moderation"
  );

  useEffect(() => {
    async function load() {
      const data = await getCompanies();
      setCompanies(data);
      setIsLoaded(true);
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return companies.filter((company) => {
      const matchesSearch =
        !s ||
        company.name.toLowerCase().includes(s) ||
        company.ownerName?.toLowerCase().includes(s) ||
        company.ownerEmail?.toLowerCase().includes(s) ||
        company.industry?.toLowerCase().includes(s);
      const matchesStatus =
        statusFilter === "all" || company.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем компании." />;
  }

  const pendingCount = companies.filter(
    (c) => c.status === "pending_moderation"
  ).length;
  const activeCount = companies.filter((c) => c.status === "active").length;
  const suspendedCount = companies.filter((c) => c.status === "suspended").length;

  return (
    <div data-screen-label="Admin · Компании">
      <Crumb>
        <Link href="/admin/candidates">← Платформа</Link>
        {" · "}Модерация компаний
      </Crumb>
      <PageHeader
        eyebrow="Платформа"
        title={
          <>
            Модерация
            <br />
            <em>компаний</em>
          </>
        }
        lead="Новые HR указывают ОПФ (ООО, ПАО, ИП…) и бренд. Подтвердите документы, чтобы открыть полный доступ к вакансиям и базе."
      />

      <div style={{ marginBottom: 32 }}>
        <StatGrid cols={3}>
          <Stat value={pendingCount} label="Ожидают проверки" />
          <Stat value={activeCount} label="Подтверждены" />
          <Stat value={suspendedCount} label="Отклонены" />
        </StatGrid>
      </div>

      <div style={{ marginBottom: 32 }}>
        <input
          className="input search"
          placeholder="Компания, контакт, email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="filters" style={{ marginTop: 24 }}>
          {(
            [
              ["pending_moderation", "на проверке"],
              ["all", "все"],
              ["active", "подтверждены"],
              ["suspended", "отклонены"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={`f ${statusFilter === value ? "active" : ""}`}
              onClick={() => setStatusFilter(value)}
            >
              <span className="k">статус:</span>{" "}
              <span className="v">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Placeholder>Компаний под фильтр не найдено</Placeholder>
      ) : (
        <EditorialTable>
          <thead>
            <tr>
              <th>Компания</th>
              <th className="mobile-hide">Контакт</th>
              <th className="mobile-hide">Email</th>
              <th>Статус</th>
              <th className="mobile-hide">Регистрация</th>
              <th aria-label="Действия">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((company) => (
              <tr key={company.id}>
                <td data-label="Компания">
                  <div>{company.name}</div>
                  <div
                    className="caption"
                    style={{ marginTop: 4, textTransform: "none" }}
                  >
                    {company.legalForm
                      ? getLegalFormShortLabel(company.legalForm)
                      : "ОПФ не указана"}
                    {company.brandName ? ` · ${company.brandName}` : ""}
                  </div>
                </td>
                <td data-label="Контакт" className="mobile-hide">
                  {company.ownerName ?? "—"}
                </td>
                <td data-label="Email" className="mobile-hide mono muted">
                  {company.ownerEmail ?? "—"}
                </td>
                <td data-label="Статус" className="status-cell">
                  <Status tone={statusTones[company.status]}>
                    {statusLabels[company.status]}
                  </Status>
                </td>
                <td
                  data-label="Регистрация"
                  className="mobile-hide mono muted"
                >
                  {formatDate(company.createdAt)}
                </td>
                <td className="text-right">
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="btn-link mono"
                    style={{ fontSize: 12 }}
                  >
                    {company.status === "pending_moderation"
                      ? "проверить →"
                      : "карточка →"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </EditorialTable>
      )}
    </div>
  );
}
