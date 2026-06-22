"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ConsentStatus,
  VerificationRun,
  VerificationRunStatus,
  VerificationScope,
} from "@/types/verification";
import { Vacancy } from "@/types/vacancy";
import { formatDate } from "@/lib/utils/date";
import { getMyVacancies } from "@/lib/api/vacancies";
import { getVerificationRunsForVacancy } from "@/lib/api/verification";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Status,
  EditorialTable,
  Placeholder,
} from "@/components/ui/editorial";
import { FormDropdown } from "@/components/FormDropdown";
import { SearchFilterSelect } from "@/components/SearchFilterField";

const scopeLabels: Record<VerificationScope, string> = {
  trust_only: "опыт",
  skills_only: "навыки",
  full: "полная",
};

const consentLabels: Record<ConsentStatus, string> = {
  not_requested: "не запрошено",
  requested: "запрошено",
  active: "активно",
  revoked: "отозвано",
};

const consentTones: Record<ConsentStatus, "good" | "warn" | "muted" | "risk"> =
  {
    not_requested: "muted",
    requested: "warn",
    active: "good",
    revoked: "risk",
  };

const verificationStatusLabels: Record<VerificationRunStatus, string> = {
  created: "создана",
  waiting_consent: "ждет согласие",
  active: "активна",
  completed: "завершена",
  cancelled: "отменена",
};

const verificationStatusTones: Record<
  VerificationRunStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  created: "muted",
  waiting_consent: "warn",
  active: "good",
  completed: "good",
  cancelled: "risk",
};

export default function VerificationListPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>("");
  const [verificationRuns, setVerificationRuns] = useState<VerificationRun[]>(
    []
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | VerificationRunStatus
  >("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | VerificationScope>(
    "all"
  );
  const [search, setSearch] = useState("");
  const [vacanciesLoaded, setVacanciesLoaded] = useState(false);
  const [runsLoading, setRunsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Список своих вакансий — для выбора. У бэка нет «все проверки компании
  // разом», только по одной вакансии, поэтому страница вакансийно-ориентирована.
  useEffect(() => {
    let cancelled = false;
    getMyVacancies()
      .then((data) => {
        if (cancelled) return;
        setVacancies(data);
        if (data.length > 0) setSelectedVacancyId(data[0].id);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorText(err, "Не удалось загрузить вакансии"));
      })
      .finally(() => {
        if (!cancelled) setVacanciesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Прогоны выбранной вакансии.
  useEffect(() => {
    let cancelled = false;
    async function loadRuns() {
      if (!selectedVacancyId) {
        setVerificationRuns([]);
        return;
      }
      setRunsLoading(true);
      setError(null);
      try {
        const data = await getVerificationRunsForVacancy(selectedVacancyId);
        if (!cancelled) setVerificationRuns(data);
      } catch (err) {
        if (!cancelled)
          setError(
            getErrorText(err, "Не удалось загрузить проверки вакансии")
          );
      } finally {
        if (!cancelled) setRunsLoading(false);
      }
    }
    loadRuns();
    return () => {
      cancelled = true;
    };
  }, [selectedVacancyId]);

  function getCandidateName(run: VerificationRun): string {
    return run.candidateName ?? "—";
  }

  function getCandidateHeadline(run: VerificationRun): string {
    return run.candidateHeadline ?? "";
  }

  const filteredRuns = verificationRuns.filter((run) => {
    const searchText = search.toLowerCase();
    const matchesSearch =
      !searchText ||
      getCandidateName(run).toLowerCase().includes(searchText) ||
      getCandidateHeadline(run).toLowerCase().includes(searchText);
    const matchesStatus = statusFilter === "all" || run.status === statusFilter;
    const matchesScope = scopeFilter === "all" || run.scope === scopeFilter;
    return matchesSearch && matchesStatus && matchesScope;
  });

  const activeCount = verificationRuns.filter(
    (run) => run.status === "active"
  ).length;
  const waitingConsentCount = verificationRuns.filter(
    (run) => run.status === "waiting_consent"
  ).length;
  const completedCount = verificationRuns.filter(
    (run) => run.status === "completed"
  ).length;
  const cancelledCount = verificationRuns.filter(
    (run) => run.status === "cancelled"
  ).length;

  const selectedVacancy = vacancies.find((v) => v.id === selectedVacancyId);

  return (
    <>
      <PageHeader
        wideTitle
        eyebrow="Верификация"
        title="Проверки кандидатов"
        lead={
          selectedVacancy
            ? `${selectedVacancy.title} · ${verificationRuns.length} ${verificationRuns.length === 1 ? "проверка" : "проверок"}`
            : "Выберите вакансию"
        }
        actions={
          <Link href="/applications" className="btn">
            Открыть воронку
          </Link>
        }
      />

      <Section num="01" label="Вакансия">
        {!vacanciesLoaded ? (
          <Placeholder>Загрузка…</Placeholder>
        ) : vacancies.length === 0 ? (
          <Placeholder>
            У вас пока нет вакансий. Создайте вакансию, чтобы запускать и видеть
            проверки кандидатов.
          </Placeholder>
        ) : (
          <FormDropdown
            value={selectedVacancyId}
            onChange={setSelectedVacancyId}
            options={vacancies.map((vacancy) => ({
              value: vacancy.id,
              label: vacancy.title,
            }))}
            placeholder="Выберите вакансию"
            hideClearOption
            className="form-dropdown--field"
          />
        )}
      </Section>

      {selectedVacancyId && (
        <>
          <StatGrid>
            <Stat value={activeCount} label="Активные" />
            <Stat value={waitingConsentCount} label="Ждут согласие" />
            <Stat value={completedCount} label="Завершены" />
            <Stat value={cancelledCount} label="Отменены" />
          </StatGrid>

          <Section num="02" label="Фильтры">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input search"
              placeholder="Кандидат, роль…"
            />

            <div className="filters verification-filters">
              <SearchFilterSelect
                id="verification-status-filter"
                label="Статус"
                value={statusFilter}
                onChange={(v) =>
                  setStatusFilter(v as "all" | VerificationRunStatus)
                }
                options={[
                  { value: "all", label: "Все" },
                  { value: "active", label: "Активные" },
                  { value: "waiting_consent", label: "Ждут согласие" },
                  { value: "completed", label: "Завершены" },
                  { value: "cancelled", label: "Отменены" },
                ]}
              />

              <SearchFilterSelect
                id="verification-scope-filter"
                label="Объем"
                value={scopeFilter}
                onChange={(v) =>
                  setScopeFilter(v as "all" | VerificationScope)
                }
                options={[
                  { value: "all", label: "Все" },
                  { value: "trust_only", label: "Только опыт" },
                  { value: "skills_only", label: "Только навыки" },
                  { value: "full", label: "Полная" },
                ]}
              />
            </div>

            <div className="caption" style={{ marginTop: 24 }}>
              Найдено · {filteredRuns.length} из {verificationRuns.length}
            </div>
          </Section>

          <Section num="03" label="Список проверок">
            {error ? (
              <Placeholder>{error}</Placeholder>
            ) : runsLoading ? (
              <Placeholder>Загрузка…</Placeholder>
            ) : filteredRuns.length === 0 ? (
              <Placeholder>
                Проверок по этой вакансии нет. Запустите проверку из профиля
                кандидата.
              </Placeholder>
            ) : (
              <EditorialTable>
                <thead>
                  <tr>
                    <th>Кандидат</th>
                    <th>Объем</th>
                    <th>Статус</th>
                    <th>Согласие</th>
                    <th>Дедлайн</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((run) => (
                    <tr key={run.id} className="row-clickable">
                      <td
                        style={{
                          fontSize: 17,
                          fontWeight: 500,
                          letterSpacing: "-0.012em",
                        }}
                      >
                        <Link href={`/candidates/${run.candidateId}`}>
                          {getCandidateName(run)}
                        </Link>
                        <div
                          className="caption"
                          style={{ marginTop: 4, textTransform: "none" }}
                        >
                          {getCandidateHeadline(run)}
                        </div>
                      </td>
                      <td className="mono muted">{scopeLabels[run.scope]}</td>
                      <td>
                        <Status tone={verificationStatusTones[run.status]}>
                          {verificationStatusLabels[run.status]}
                        </Status>
                      </td>
                      <td>
                        <Status tone={consentTones[run.consentStatus]}>
                          {consentLabels[run.consentStatus]}
                        </Status>
                      </td>
                      <td className="mono muted">
                        {run.dueAt ? formatDate(run.dueAt) : "—"}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/verification/${run.id}`}
                          className="btn-link mono"
                          style={{ fontSize: 11 }}
                        >
                          открыть →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </EditorialTable>
            )}
          </Section>
        </>
      )}
    </>
  );
}
