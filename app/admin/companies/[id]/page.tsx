"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCompanyById, moderateCompany } from "@/lib/api/companies";
import { Company, CompanyStatus } from "@/types/company";
import { getLegalFormLabel } from "@/lib/utils/companyLegalForm";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Section,
  Status,
  Crumb,
  Placeholder,
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

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [company, setCompany] = useState<Company | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | "docs" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const data = await getCompanyById(companyId);
      setCompany(data);
      setNote(data?.moderationNote ?? "");
      setRejectionReason(data?.rejectionReason ?? "");
      setLoaded(true);
    }
    void load();
  }, [companyId]);

  async function runModeration(
    status: CompanyStatus,
    action: "approve" | "reject" | "docs"
  ) {
    if (!company) return;
    setBusy(action);
    setMessage("");
    try {
      const updated = await moderateCompany(company.id, {
        status,
        moderationNote: note.trim() || undefined,
        rejectionReason:
          status === "suspended" ? rejectionReason.trim() || undefined : undefined,
        requestDocuments: action === "docs",
      });
      setCompany(updated);
      setMessage(
        action === "approve"
          ? "Компания подтверждена. HR получит полный доступ."
          : action === "reject"
            ? "Компания отклонена."
            : "Запрос документов отмечен. Свяжитесь с контактом по email."
      );
    } catch {
      setMessage("Не удалось сохранить решение. Повторите позже.");
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) {
    return <PageHeader title="Загрузка..." lead="Открываем карточку компании." />;
  }

  if (!company) {
    return (
      <>
        <Crumb>
          <Link href="/admin/companies">← Компании</Link>
        </Crumb>
        <Placeholder>Компания не найдена</Placeholder>
      </>
    );
  }

  return (
    <div data-screen-label="Admin · Компания">
      <Crumb>
        <Link href="/admin/companies">← Модерация компаний</Link>
        {" · "}
        {company.name}
      </Crumb>

      <PageHeader
        eyebrow="Проверка регистрации"
        title={company.name}
        lead="Свяжитесь с контактом, запросите учредительные документы и подтвердите юридическое лицо перед полным доступом HR."
        actions={
          <Status tone={statusTones[company.status]}>
            {statusLabels[company.status]}
          </Status>
        }
      />

      <div className="admin-company-grid">
        <Section num="01" label="Контакт регистрации">
          <dl className="admin-company-facts">
            <div>
              <dt>Контактное лицо</dt>
              <dd>{company.ownerName ?? "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd className="mono">{company.ownerEmail ?? "—"}</dd>
            </div>
            <div>
              <dt>Дата регистрации</dt>
              <dd>{formatDate(company.createdAt)}</dd>
            </div>
            <div>
              <dt>ОПФ</dt>
              <dd>
                {company.legalForm
                  ? getLegalFormLabel(company.legalForm)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Бренд</dt>
              <dd>{company.brandName ?? "—"}</dd>
            </div>
            <div>
              <dt>Юридическое имя</dt>
              <dd>{company.legalName ?? company.name}</dd>
            </div>
            {company.documentsRequestedAt && (
              <div>
                <dt>Документы запрошены</dt>
                <dd>{formatDate(company.documentsRequestedAt)}</dd>
              </div>
            )}
            {company.moderatedAt && (
              <div>
                <dt>Последнее решение</dt>
                <dd>{formatDate(company.moderatedAt)}</dd>
              </div>
            )}
          </dl>
        </Section>

        <Section num="02" label="Решение модератора">
          <p className="admin-company-lead">
            После одобрения компания переходит в статус «подтверждена» — HR
            сможет публиковать вакансии и работать с базой. До этого кабинет
            остается в ограниченном режиме.
          </p>

          <label className="field" style={{ display: "block", marginTop: 20 }}>
            <span className="field-label">Заметка для команды</span>
            <textarea
              className="textarea"
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Что уточнили по телефону, какие документы ждем…"
            />
          </label>

          {company.status !== "active" && (
            <label className="field" style={{ display: "block", marginTop: 16 }}>
              <span className="field-label">Причина отклонения</span>
              <textarea
                className="textarea"
                rows={3}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Только если отклоняете заявку"
              />
            </label>
          )}

          {message && (
            <div className="placeholder" style={{ marginTop: 20 }}>
              {message}
            </div>
          )}

          <div className="admin-company-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy !== null}
              onClick={() => void runModeration("pending_moderation", "docs")}
            >
              {busy === "docs" ? "Сохранение…" : "Запросить документы"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy !== null}
              onClick={() => void runModeration("suspended", "reject")}
            >
              {busy === "reject" ? "Сохранение…" : "Отклонить"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => void runModeration("active", "approve")}
            >
              {busy === "approve" ? "Сохранение…" : "Подтвердить компанию →"}
            </button>
          </div>
        </Section>
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.push("/admin/companies")}
        >
          ← К списку
        </button>
      </div>
    </div>
  );
}
