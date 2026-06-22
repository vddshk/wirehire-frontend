"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Crumb,
  EditorialTable,
  Placeholder,
} from "@/components/ui/editorial";
import {
  getSavedCandidates,
  deleteSavedCandidate,
} from "@/lib/api/savedCandidates";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import type { SavedCandidate } from "@/types/savedCandidate";

function countLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} кандидат`;
  if (
    n % 10 >= 2 &&
    n % 10 <= 4 &&
    (n % 100 < 10 || n % 100 >= 20)
  ) {
    return `${n} кандидата`;
  }
  return `${n} кандидатов`;
}

export default function SavedCandidatesPage() {
  const [items, setItems] = useState<SavedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSavedCandidates()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorText(err, "Не удалось загрузить сохраненных кандидатов"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteSavedCandidate(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(getErrorText(err, "Не удалось удалить кандидата из списка"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div data-screen-label="HR · Сохраненные">
      <Crumb>
        <Link href="/candidates">← База кандидатов</Link>
        {" · "}Сохраненные
      </Crumb>
      <PageHeader
        wideTitle
        title="Сохраненные кандидаты"
        lead={loading ? "загрузка…" : countLabel(items.length)}
        actions={
          <Link href="/candidates" className="btn btn-primary">
            К базе кандидатов →
          </Link>
        }
      />

      {error && (
        <Placeholder>
          {error}
        </Placeholder>
      )}

      {!error && !loading && items.length === 0 && (
        <Placeholder>
          Список пока пуст. Откройте карточку кандидата и нажмите
          «Сохранить», чтобы добавить сюда.
        </Placeholder>
      )}

      {!loading && items.length > 0 && (
        <EditorialTable>
          <thead>
            <tr>
              <th>Кандидат</th>
              <th className="mobile-hide">Локация</th>
              <th>Заметка</th>
              <th className="mobile-hide">Сохранен</th>
              <th aria-label="Действия">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const c = s.candidate;
              return (
                <tr key={s.id}>
                  <td
                    style={{
                      fontSize: 18,
                      fontWeight: 500,
                      letterSpacing: "-0.012em",
                    }}
                  >
                    {c ? (
                      <>
                        <Link href={`/candidates/${s.candidateId}`}>
                          {c.fullName || "(без имени)"}
                        </Link>
                        {c.headline && (
                          <div
                            className="muted"
                            style={{ fontSize: 14, fontWeight: 400, marginTop: 2 }}
                          >
                            {c.headline}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="muted">
                        Кандидат недоступен (скрыл профиль)
                      </span>
                    )}
                  </td>
                  <td className="muted mobile-hide">{c?.location ?? "—"}</td>
                  <td className="muted" style={{ maxWidth: 320 }}>
                    {s.note ?? "—"}
                  </td>
                  <td className="mono muted mobile-hide">
                    {s.savedAt ? formatDate(s.savedAt) : "—"}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-link mono"
                      style={{ fontSize: 12, color: "var(--risk)" }}
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                    >
                      {deletingId === s.id ? "удаление…" : "удалить"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </EditorialTable>
      )}
    </div>
  );
}
