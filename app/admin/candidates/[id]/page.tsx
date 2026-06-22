"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  adminAdmitCandidate,
  adminConfirmReference,
  getAdminCandidateById,
} from "@/lib/api/admin";
import {
  AdminCandidateDetail,
  ReferenceVerdict,
} from "@/types/adminCandidate";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Section,
  Status,
  Crumb,
  Placeholder,
  EditorialTable,
} from "@/components/ui/editorial";

const statusLabels: Record<string, string> = {
  draft: "черновик",
  incomplete: "неполный профиль",
  published: "опубликован",
  awaiting_verification_threshold: "ожидает верификации",
  admitted_to_talent_pool: "в talent pool",
};

const experienceStatusLabels: Record<string, string> = {
  not_verified: "не проверен",
  awaiting_reference: "ждёт референта",
  verified: "подтверждён",
  partially_verified: "частично",
  questionable: "сомнительный",
};

const refStatusLabels: Record<string, string> = {
  pending: "ожидает",
  opened: "открыт",
  answered_positive: "положительный",
  answered_partial: "частичный",
  answered_negative: "отрицательный",
  expired: "истёк",
};

export default function AdminCandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = params.id;

  const [candidate, setCandidate] = useState<AdminCandidateDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function reload() {
    const data = await getAdminCandidateById(candidateId);
    setCandidate(data);
    return data;
  }

  useEffect(() => {
    async function load() {
      await reload();
      setLoaded(true);
    }
    void load();
  }, [candidateId]);

  async function handleAdmit() {
    if (!candidate?.canAdmit) return;
    setBusy("admit");
    setMessage("");
    try {
      await adminAdmitCandidate(candidate.id);
      const updated = await reload();
      setMessage(
        updated?.status === "admitted_to_talent_pool"
          ? "Кандидат допущен в talent pool."
          : "Запрос отправлен."
      );
    } catch {
      setMessage("Не удалось допустить кандидата.");
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirm(requestId: string, verdict: ReferenceVerdict) {
    setBusy(`confirm-${requestId}-${verdict}`);
    setMessage("");
    try {
      await adminConfirmReference(requestId, verdict, note.trim() || undefined);
      await reload();
      setMessage(
        verdict === "positive"
          ? "Опыт подтверждён. При положительном ответе кандидат может автоматически попасть в pool."
          : "Ответ записан от имени администратора."
      );
    } catch {
      setMessage("Не удалось подтвердить опыт.");
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) {
    return <PageHeader title="Загрузка..." lead="Открываем карточку кандидата." />;
  }

  if (!candidate) {
    return (
      <>
        <Crumb>
          <Link href="/admin/candidates">← Кандидаты</Link>
        </Crumb>
        <Placeholder>Кандидат не найден</Placeholder>
      </>
    );
  }

  const pendingRefs = candidate.referenceRequests.filter((r) => r.canConfirm);

  return (
    <div data-screen-label="Admin · Кандидат">
      <Crumb>
        <Link href="/admin/candidates">← Кандидаты</Link>
        {" · "}
        {candidate.fullName}
      </Crumb>

      <PageHeader
        eyebrow="Кандидат"
        title={candidate.fullName}
        lead={candidate.headline ?? candidate.email}
      />

      {message ? (
        <p className="caption" style={{ marginBottom: 24 }}>
          {message}
        </p>
      ) : null}

      <Section label="Профиль">
        <div className="stack" style={{ gap: 12 }}>
          <div>
            <span className="caption">Email</span>
            <div className="mono">{candidate.email}</div>
          </div>
          <div>
            <span className="caption">Статус</span>
            <div>
              <Status
                tone={
                  candidate.status === "admitted_to_talent_pool" ? "good" : "warn"
                }
              >
                {statusLabels[candidate.status] ?? candidate.status}
              </Status>
            </div>
          </div>
          {candidate.visibilityMode ? (
            <div>
              <span className="caption">Видимость</span>
              <div className="mono">{candidate.visibilityMode}</div>
            </div>
          ) : null}
          <div>
            <span className="caption">Обновлён</span>
            <div className="mono muted">{formatDate(candidate.updatedAt)}</div>
          </div>
          {candidate.canAdmit ? (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn"
                disabled={busy === "admit"}
                onClick={() => void handleAdmit()}
              >
                {busy === "admit" ? "Допускаем…" : "Допустить в talent pool"}
              </button>
              <p className="caption muted" style={{ marginTop: 8 }}>
                Обходит ожидание ответа референта. Для демо и ручной модерации.
              </p>
            </div>
          ) : null}
        </div>
      </Section>

      <Section label="Опыт">
        {candidate.experiences.length === 0 ? (
          <Placeholder>Опыт не добавлен</Placeholder>
        ) : (
          <EditorialTable>
            <thead>
              <tr>
                <th>Роль / проект</th>
                <th className="mobile-hide">Компания</th>
                <th>Статус</th>
                <th className="mobile-hide">Референт</th>
              </tr>
            </thead>
            <tbody>
              {candidate.experiences.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.roleTitle ?? exp.projectName ?? "—"}</td>
                  <td className="mobile-hide muted">
                    {exp.companyName ?? exp.projectName ?? "—"}
                  </td>
                  <td>
                    <Status tone="muted">
                      {experienceStatusLabels[exp.verificationStatus] ??
                        exp.verificationStatus}
                    </Status>
                  </td>
                  <td className="mobile-hide mono muted">
                    {exp.referrerName ?? exp.referrerEmail ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </EditorialTable>
        )}
      </Section>

      <Section label="Запросы референтам">
        {candidate.referenceRequests.length === 0 ? (
          <Placeholder>Запросов нет</Placeholder>
        ) : (
          <div className="stack" style={{ gap: 24 }}>
            {candidate.referenceRequests.map((ref) => (
              <div
                key={ref.id}
                style={{
                  borderTop: "1px solid var(--line)",
                  paddingTop: 16,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <strong>{ref.companyName ?? ref.experienceTitle ?? "Опыт"}</strong>
                  <div className="caption muted" style={{ marginTop: 4 }}>
                    {ref.recipientEmail}
                  </div>
                </div>
                <Status tone={ref.canConfirm ? "warn" : "muted"}>
                  {refStatusLabels[ref.status] ?? ref.status}
                  {ref.verdict ? ` · ${ref.verdict}` : ""}
                </Status>
                {ref.canConfirm ? (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Комментарий (необязательно)"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      style={{ width: "100%", marginBottom: 12 }}
                    />
                    <div className="filters">
                      <button
                        type="button"
                        className="btn"
                        disabled={busy !== null}
                        onClick={() => void handleConfirm(ref.id, "positive")}
                      >
                        {busy === `confirm-${ref.id}-positive`
                          ? "…"
                          : "Подтвердить (положительно)"}
                      </button>
                      <button
                        type="button"
                        className="f"
                        disabled={busy !== null}
                        onClick={() => void handleConfirm(ref.id, "partial")}
                      >
                        частично
                      </button>
                      <button
                        type="button"
                        className="f"
                        disabled={busy !== null}
                        onClick={() => void handleConfirm(ref.id, "negative")}
                      >
                        отклонить
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>

      {pendingRefs.length > 0 && candidate.canAdmit ? (
        <p className="caption muted" style={{ marginTop: 24 }}>
          {pendingRefs.length} запрос(ов) можно закрыть от имени референта или
          сразу допустить кандидата в pool.
        </p>
      ) : null}

      <div style={{ marginTop: 32 }}>
        <Link href={`/candidates/${candidate.id}`} className="btn-link mono">
          открыть профиль HR →
        </Link>
      </div>
    </div>
  );
}
