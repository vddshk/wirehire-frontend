"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuditEvents, clearAuditEvents } from "@/lib/api/audit";
import { AuditEvent, AuditEventType } from "@/types/audit";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Status,
  StatusTone,
  EditorialTable,
  Placeholder,
} from "@/components/ui/editorial";

const eventTypeLabels: Record<AuditEventType, string> = {
  candidate_created: "Кандидат создан",
  experience_added: "Опыт добавлен",
  evidence_added: "Evidence добавлен",
  verification_created: "Проверка создана",
  consent_requested: "Consent запрошен",
  consent_accepted: "Consent принят",
  consent_revoked: "Consent отозван",
  consent_expired: "Consent истек",
  report_generated: "Отчет сформирован",
  profile_report_generated: "Отчет профиля сформирован",
  application_created: "Отклик создан",
  application_moved: "Отклик переведен по pipeline",
  application_rejected: "Отклик отклонен",
  assessment_submitted: "Assessment отправлен",
  assessment_package_assigned: "Задание назначено",
  manager_decision_created: "Решение менеджера",
  profile_admitted: "Профиль допущен в базу",
  reference_requested: "Запрос референту отправлен",
  reference_response_received: "Ответ референта получен",
  skill_status_updated: "Статус навыка обновлен",
  notification_sent: "Уведомление отправлено",
};

const eventTypeTones: Record<AuditEventType, StatusTone> = {
  candidate_created: "muted",
  experience_added: "muted",
  evidence_added: "muted",
  verification_created: "warn",
  consent_requested: "warn",
  consent_accepted: "good",
  consent_revoked: "risk",
  consent_expired: "risk",
  report_generated: "good",
  profile_report_generated: "good",
  application_created: "muted",
  application_moved: "muted",
  application_rejected: "risk",
  assessment_submitted: "muted",
  assessment_package_assigned: "muted",
  manager_decision_created: "muted",
  profile_admitted: "good",
  reference_requested: "warn",
  reference_response_received: "good",
  skill_status_updated: "muted",
  notification_sent: "muted",
};

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AuditEventType>("all");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setEvents(getAuditEvents().slice().reverse());
    setIsLoaded(true);
  }, []);

  const filteredEvents = events.filter((event) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      !searchText ||
      event.title.toLowerCase().includes(searchText) ||
      event.description.toLowerCase().includes(searchText) ||
      event.candidateName?.toLowerCase().includes(searchText) ||
      event.vacancyTitle?.toLowerCase().includes(searchText) ||
      event.verificationRunId?.toLowerCase().includes(searchText) ||
      event.reportId?.toLowerCase().includes(searchText);

    const matchesType = typeFilter === "all" || event.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const consentEventsCount = events.filter(
    (event) =>
      event.type === "consent_requested" ||
      event.type === "consent_accepted" ||
      event.type === "consent_revoked"
  ).length;

  const verificationEventsCount = events.filter(
    (event) => event.type === "verification_created"
  ).length;

  const reportEventsCount = events.filter(
    (event) => event.type === "report_generated"
  ).length;

  const evidenceEventsCount = events.filter(
    (event) => event.type === "evidence_added"
  ).length;

  function handleClearAudit() {
    clearAuditEvents();
    setEvents([]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Audit log"
        title="Журнал действий"
        lead={`${events.length} событий · ${consentEventsCount} consent · ${verificationEventsCount} проверок`}
        actions={
          <button className="btn" onClick={handleClearAudit}>
            Очистить журнал
          </button>
        }
      />

      <StatGrid>
        <Stat value={events.length} label="Всего событий" />
        <Stat value={consentEventsCount} label="Consent events" />
        <Stat value={verificationEventsCount} label="Проверки" />
        <Stat value={reportEventsCount + evidenceEventsCount} label="Отчеты / evidence" />
      </StatGrid>

      <Section num="01" label="Фильтры">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input search"
          placeholder="Событие, кандидат, вакансия, проверка…"
        />

        <div className="filters" style={{ marginTop: 28 }}>
          <button
            className={`f ${typeFilter === "all" ? "active" : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            <span className="k">тип:</span> <span className="v">все</span>
          </button>
          <button
            className={`f ${typeFilter === "consent_requested" ? "active" : ""}`}
            onClick={() => setTypeFilter("consent_requested")}
          >
            <span className="k">тип:</span> <span className="v">consent</span>
          </button>
          <button
            className={`f ${typeFilter === "verification_created" ? "active" : ""}`}
            onClick={() => setTypeFilter("verification_created")}
          >
            <span className="k">тип:</span> <span className="v">проверка</span>
          </button>
          <button
            className={`f ${typeFilter === "report_generated" ? "active" : ""}`}
            onClick={() => setTypeFilter("report_generated")}
          >
            <span className="k">тип:</span> <span className="v">отчет</span>
          </button>
          <button
            className={`f ${typeFilter === "evidence_added" ? "active" : ""}`}
            onClick={() => setTypeFilter("evidence_added")}
          >
            <span className="k">тип:</span> <span className="v">evidence</span>
          </button>
        </div>

        <div className="caption" style={{ marginTop: 24 }}>
          Найдено · {filteredEvents.length} из {events.length}
        </div>
      </Section>

      <Section num="02" label="События">
        {!isLoaded ? (
          <Placeholder>Загрузка…</Placeholder>
        ) : filteredEvents.length === 0 ? (
          <Placeholder>
            {events.length === 0
              ? "Журнал пуст. Выполните действия в продукте: добавьте evidence, запросите consent или сформируйте отчет."
              : "Нет событий по фильтру."}
          </Placeholder>
        ) : (
          <EditorialTable>
            <thead>
              <tr>
                <th>Тип</th>
                <th>Событие</th>
                <th>Кандидат</th>
                <th>Вакансия</th>
                <th>Роль</th>
                <th>Дата</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td>
                    <Status tone={eventTypeTones[event.type]}>
                      {eventTypeLabels[event.type]}
                    </Status>
                  </td>
                  <td style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em" }}>
                    {event.title}
                    <div className="caption" style={{ marginTop: 4, textTransform: "none" }}>
                      {event.description}
                    </div>
                  </td>
                  <td className="muted">{event.candidateName ?? "—"}</td>
                  <td className="muted">{event.vacancyTitle ?? "—"}</td>
                  <td className="mono muted" style={{ textTransform: "none" }}>{event.actorRole}</td>
                  <td className="mono muted">{formatDate(event.createdAt)}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {event.verificationRunId && (
                        <Link
                          href={`/verification/${event.verificationRunId}`}
                          className="btn-link mono"
                          style={{ fontSize: 11 }}
                        >
                          проверка →
                        </Link>
                      )}
                      {event.reportId && event.candidateId && (
                        <Link
                          href={`/candidates/${event.candidateId}/report`}
                          className="btn-link mono"
                          style={{ fontSize: 11 }}
                        >
                          отчет →
                        </Link>
                      )}
                      {event.candidateId && (
                        <Link
                          href={`/candidates/${event.candidateId}`}
                          className="btn-link mono"
                          style={{ fontSize: 11 }}
                        >
                          профиль →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </EditorialTable>
        )}
      </Section>
    </>
  );
}
