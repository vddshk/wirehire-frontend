"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAdminCandidates } from "@/lib/api/admin";
import { AdminCandidateListItem } from "@/types/adminCandidate";
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

const statusLabels: Record<string, string> = {
  draft: "черновик",
  incomplete: "неполный профиль",
  published: "опубликован",
  awaiting_verification_threshold: "ожидает верификации",
  admitted_to_talent_pool: "в talent pool",
};

const statusTones: Record<string, "good" | "warn" | "muted" | "risk"> = {
  draft: "muted",
  incomplete: "warn",
  published: "muted",
  awaiting_verification_threshold: "warn",
  admitted_to_talent_pool: "good",
};

type StatusFilter = "all" | string;

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<AdminCandidateListItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminCandidates();
        setCandidates(data);
      } catch {
        setLoadError("Не удалось загрузить кандидатов. Проверьте API и роль platform_admin.");
      } finally {
        setIsLoaded(true);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const matchesSearch =
        !s ||
        candidate.fullName.toLowerCase().includes(s) ||
        candidate.email.toLowerCase().includes(s) ||
        candidate.headline?.toLowerCase().includes(s);
      const matchesStatus =
        statusFilter === "all" || candidate.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [candidates, search, statusFilter]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(candidates.map((c) => c.status)));
    return unique.sort();
  }, [candidates]);

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем кандидатов." />;
  }

  const pendingRefs = candidates.filter((c) => c.pendingReferencesCount > 0).length;
  const admittedCount = candidates.filter(
    (c) => c.status === "admitted_to_talent_pool"
  ).length;
  const awaitingCount = candidates.filter(
    (c) => c.status === "awaiting_verification_threshold"
  ).length;

  return (
    <div data-screen-label="Admin · Кандидаты">
      <Crumb>
        <Link href="/audit">← Платформа</Link>
        {" · "}Кандидаты
      </Crumb>
      <PageHeader
        eyebrow="Платформа"
        title="Кандидаты"
        lead="Подтверждение опыта вместо референта и ручной допуск в talent pool."
      />

      {loadError ? (
        <Placeholder>{loadError}</Placeholder>
      ) : (
        <>
          <div style={{ marginBottom: 32 }}>
            <StatGrid cols={3}>
              <Stat value={pendingRefs} label="Ждут ответа референта" />
              <Stat value={awaitingCount} label="Ожидают верификации" />
              <Stat value={admittedCount} label="В talent pool" />
            </StatGrid>
          </div>

          <div style={{ marginBottom: 32 }}>
            <input
              className="input search"
              placeholder="Имя, email, headline…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="filters" style={{ marginTop: 24 }}>
              <button
                type="button"
                className={`f ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                <span className="k">статус:</span>{" "}
                <span className="v">все</span>
              </button>
              {statusOptions.map((status) => (
                <button
                  type="button"
                  key={status}
                  className={`f ${statusFilter === status ? "active" : ""}`}
                  onClick={() => setStatusFilter(status)}
                >
                  <span className="k">статус:</span>{" "}
                  <span className="v">{statusLabels[status] ?? status}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Placeholder>Кандидаты под фильтр не найдены</Placeholder>
          ) : (
            <EditorialTable>
              <thead>
                <tr>
                  <th>Кандидат</th>
                  <th className="mobile-hide">Email</th>
                  <th>Статус</th>
                  <th className="mobile-hide">Референсы</th>
                  <th className="mobile-hide">Обновлён</th>
                  <th aria-label="Действия">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((candidate) => (
                  <tr key={candidate.id}>
                    <td>
                      <div>{candidate.fullName}</div>
                      {candidate.headline ? (
                        <div className="caption muted" style={{ marginTop: 4 }}>
                          {candidate.headline}
                        </div>
                      ) : null}
                    </td>
                    <td className="mobile-hide mono muted">{candidate.email}</td>
                    <td>
                      <Status tone={statusTones[candidate.status] ?? "muted"}>
                        {statusLabels[candidate.status] ?? candidate.status}
                      </Status>
                    </td>
                    <td className="mobile-hide mono">
                      {candidate.pendingReferencesCount > 0 ? (
                        <Status tone="warn">
                          {candidate.pendingReferencesCount} ожидают
                        </Status>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mobile-hide mono muted">
                      {formatDate(candidate.updatedAt)}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/candidates/${candidate.id}`}
                        className="btn-link mono"
                        style={{ fontSize: 12 }}
                      >
                        карточка →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </EditorialTable>
          )}
        </>
      )}
    </div>
  );
}
