"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Candidate, EvidenceType } from "@/types/candidate";
import { Vacancy } from "@/types/vacancy";
import {
  ConsentStatus,
  VerificationRun,
  VerificationRunStatus,
  VerificationScope,
} from "@/types/verification";
import { VerificationReport } from "@/types/report";
import { addAuditEvent } from "@/lib/api/audit";
import { getCandidateById } from "@/lib/api/candidates";
import { getCandidateById as getRemoteCandidateById } from "@/lib/api/adapters/remote/candidates";
import { USE_REMOTE_API } from "@/lib/api/config";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { getVacancyById } from "@/lib/api/vacancies";
import {
  getVerificationRunById,
  reviewVerificationRun,
  updateVerificationRun as saveVerificationRun,
} from "@/lib/api/verification";
import { getSkillVerificationsForRun } from "@/lib/api/skillVerifications";
import { SkillVerificationList } from "@/components/SkillVerificationList";
import type { SkillVerification } from "@/types/skillVerification";
import {
  getReportSnapshotForRun,
  overrideReportSnapshot,
  clearReportSnapshotOverride,
} from "@/lib/api/reportSnapshots";
import { ReportSnapshotView } from "@/components/ReportSnapshotView";
import type {
  ReportSnapshot,
  ReportOverallStatus,
} from "@/types/reportSnapshot";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Status,
  Crumb,
  Placeholder,
} from "@/components/ui/editorial";
import { FormDropdown } from "@/components/FormDropdown";

const scopeLabels: Record<VerificationScope, string> = {
  trust_only: "только опыт",
  skills_only: "только навыки",
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

const evidenceTypeLabels: Record<EvidenceType, string> = {
  portfolio: "Портфолио",
  repository: "Репозиторий",
  certificate: "Сертификат",
  document: "Документ",
  other: "Другое",
};

import { formatVacancyLocation as getVacancyLocation } from "@/lib/utils/vacancy";

function getSavedReports(): VerificationReport[] {
  const savedReportsRaw = localStorage.getItem("wirehire-reports");
  return savedReportsRaw ? JSON.parse(savedReportsRaw) : [];
}

export default function VerificationPage() {
  const params = useParams();
  const verificationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [verificationRun, setVerificationRun] =
    useState<VerificationRun | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [generatedReport, setGeneratedReport] =
    useState<VerificationReport | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [skillVerifications, setSkillVerifications] = useState<
    SkillVerification[]
  >([]);
  const [reportSnapshot, setReportSnapshot] = useState<ReportSnapshot | null>(
    null
  );
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] =
    useState<ReportOverallStatus>("verified");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState<"approve" | "reject" | null>(
    null
  );
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerificationPage() {
      if (!verificationId) {
        setIsLoaded(true);
        return;
      }

      const foundRun = await getVerificationRunById(verificationId);

      if (!foundRun) {
        setVerificationRun(null);
        setIsLoaded(true);
        return;
      }

      // HR имеет доступ к /candidates/{id}; кандидата тянем из бэка, иначе
      // (мок-режим/ошибка) — из local. Без этого реальные прогоны показывали
      // «неполные данные».
      const candidatePromise = USE_REMOTE_API
        ? getRemoteCandidateById(foundRun.candidateId, "all_visible").catch(
            () => getCandidateById(foundRun.candidateId)
          )
        : getCandidateById(foundRun.candidateId);

      const [foundCandidate, foundVacancy] = await Promise.all([
        candidatePromise,
        foundRun.vacancyId
          ? getVacancyById(foundRun.vacancyId)
          : Promise.resolve(null),
      ]);

      const savedReports = getSavedReports();
      const foundReport =
        savedReports.find(
          (report) => report.verificationRunId === verificationId
        ) ?? null;

      // Проверки навыков + сводный отчет (после assessment) — best-effort.
      try {
        setSkillVerifications(await getSkillVerificationsForRun(foundRun.id));
      } catch {
        setSkillVerifications([]);
      }
      try {
        setReportSnapshot(await getReportSnapshotForRun(foundRun.id));
      } catch {
        setReportSnapshot(null);
      }

      setVerificationRun(foundRun);
      setCandidate(foundCandidate);
      setVacancy(foundVacancy);
      setGeneratedReport(foundReport);
      setIsLoaded(true);
    }

    loadVerificationPage();
  }, [verificationId]);

  async function handleReview(decision: "approve" | "reject") {
    if (!verificationRun) return;
    setReviewBusy(decision);
    setReviewError(null);
    try {
      const updated = await reviewVerificationRun(verificationRun.id, {
        decision,
        comment: reviewComment.trim() || undefined,
      });
      setVerificationRun(updated);
      setReviewComment("");
    } catch (err) {
      setReviewError(getErrorText(err, "Не удалось сохранить решение"));
    } finally {
      setReviewBusy(null);
    }
  }

  function openOverride() {
    if (reportSnapshot) {
      setOverrideStatus(reportSnapshot.effectiveOverallStatus);
    }
    setOverrideReason("");
    setOverrideError(null);
    setOverrideOpen(true);
  }

  async function handleApplyOverride() {
    if (!reportSnapshot) return;
    if (overrideReason.trim().length < 3) {
      setOverrideError("Укажите причину (минимум 3 символа).");
      return;
    }
    setOverrideBusy(true);
    setOverrideError(null);
    try {
      const updated = await overrideReportSnapshot(reportSnapshot.id, {
        status: overrideStatus,
        reason: overrideReason.trim(),
      });
      setReportSnapshot(updated);
      setOverrideOpen(false);
    } catch (err) {
      setOverrideError(getErrorText(err, "Не удалось переопределить статус"));
    } finally {
      setOverrideBusy(false);
    }
  }

  async function handleClearOverride() {
    if (!reportSnapshot) return;
    setOverrideBusy(true);
    setOverrideError(null);
    try {
      const updated = await clearReportSnapshotOverride(reportSnapshot.id);
      setReportSnapshot(updated);
    } catch (err) {
      setOverrideError(getErrorText(err, "Не удалось сбросить override"));
    } finally {
      setOverrideBusy(false);
    }
  }

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем проверку." />;
  }

  if (!verificationRun) {
    return (
      <>
        <Crumb>
          <Link href="/verification">← Проверки</Link>
        </Crumb>
        <PageHeader
          eyebrow="Не найдено"
          title="Проверка не найдена"
          lead="Возможно, она не была создана или данные очищены."
          actions={
            <Link href="/applications" className="btn btn-primary">
              В pipeline →
            </Link>
          }
        />
      </>
    );
  }

  if (!candidate || !vacancy) {
    return (
      <>
        <Crumb>
          <Link href="/verification">← Проверки</Link>
        </Crumb>
        <PageHeader
          eyebrow="Неполные данные"
          title="Данные проверки неполные"
          lead="Кандидат или вакансия для этой проверки не найдены."
          actions={
            <Link href="/applications" className="btn btn-primary">
              В pipeline →
            </Link>
          }
        />
      </>
    );
  }

  const candidateExperience = candidate.experience ?? [];

  const isTrustScope =
    verificationRun.scope === "trust_only" || verificationRun.scope === "full";

  async function updateCurrentVerificationRun(updatedRun: VerificationRun) {
    const savedRun = await saveVerificationRun(updatedRun);
    setVerificationRun(savedRun);
  }

  async function handleRequestConsent() {
    if (!verificationRun || !candidate || !vacancy) {
      return;
    }

    const updatedRun: VerificationRun = {
      ...verificationRun,
      consentStatus: "requested",
      status: "waiting_consent",
    };

    await updateCurrentVerificationRun(updatedRun);

    addAuditEvent({
      type: "consent_requested",
      title: "Компания запросила согласие кандидата",
      description: `Запрошено согласие на проверку кандидата ${candidate.fullName} под вакансию ${vacancy.title}.`,
      actorRole: "HR",
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      vacancyId: vacancy.id,
      vacancyTitle: vacancy.title,
      verificationRunId: verificationRun.id,
    });
  }

  return (
    <>
      <Crumb>
        <Link href="/verification">← Проверки</Link>
        {" · "}
        {candidate.fullName}
      </Crumb>

      <PageHeader
        eyebrow={
          <>
            ID {verificationRun.id} ·{" "}
            <Status tone={verificationStatusTones[verificationRun.status]}>
              {verificationStatusLabels[verificationRun.status]}
            </Status>
          </>
        }
        title="Проверка кандидата"
        lead={`${candidate.fullName} · ${vacancy.title} · ${vacancy.companyName}`}
        actions={
          <>
            <Link href={`/candidates/${candidate.id}`} className="btn">
              Профиль
            </Link>
            <Link href={`/vacancies/${vacancy.id}`} className="btn">
              Вакансия
            </Link>
            {generatedReport && candidate && (
              <Link
                href={`/candidates/${candidate.id}/report`}
                className="btn btn-primary"
              >
                Открыть отчет →
              </Link>
            )}
          </>
        }
      />

      <StatGrid>
        <Stat value={scopeLabels[verificationRun.scope]} label="Объем" />
        <Stat
          value={
            <Status tone={consentTones[verificationRun.consentStatus]}>
              {consentLabels[verificationRun.consentStatus]}
            </Status>
          }
          label="Consent"
        />
        <Stat value={formatDate(verificationRun.dueAt)} label="Дедлайн" />
        <Stat
          value={verificationRun.proctoringEnabled ? "включен" : "выключен"}
          label="Прокторинг"
        />
      </StatGrid>

      {verificationRun.rawStatus === "awaiting_review" && (
        <Section num="00" label="Решение по проверке">
          <p className="lead" style={{ marginTop: 0, fontSize: 15 }}>
            Проверка завершена и ждет вашего решения. Подтвердите результат или
            отклоните с комментарием.
          </p>
          <textarea
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            className="input"
            placeholder="Комментарий (необязательно)"
            rows={3}
            maxLength={2000}
            style={{ marginTop: 16, width: "100%", resize: "vertical" }}
          />
          {reviewError && (
            <p style={{ color: "var(--risk)", fontSize: 14, marginTop: 12 }}>
              {reviewError}
            </p>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleReview("approve")}
              disabled={reviewBusy !== null}
            >
              {reviewBusy === "approve" ? "Сохранение…" : "Подтвердить →"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => handleReview("reject")}
              disabled={reviewBusy !== null}
              style={{ color: "var(--risk)", borderColor: "var(--risk)" }}
            >
              {reviewBusy === "reject" ? "Сохранение…" : "Отклонить"}
            </button>
          </div>
        </Section>
      )}

      {skillVerifications.length > 0 && (
        <Section num="01" label="Проверка навыков">
          <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
            Результаты по навыкам из пройденного assessment.
          </div>
          <SkillVerificationList items={skillVerifications} />
        </Section>
      )}

      <Section num="02" label="Контекст">
        <div className="split-equal">
          <div>
            <div className="caption" style={{ marginBottom: 12 }}>
              Кандидат
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.015em",
              }}
            >
              {candidate.fullName}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              {candidate.headline} · {candidate.location}
            </div>
            <div className="chips" style={{ marginTop: 14, gap: "0 16px" }}>
              {candidate.skills.map((skill) => (
                <span key={skill} className="chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="caption" style={{ marginBottom: 12 }}>
              Вакансия
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.015em",
              }}
            >
              {vacancy.title}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              {vacancy.companyName} · {getVacancyLocation(vacancy)}
            </div>
            <div className="chips" style={{ marginTop: 14, gap: "0 16px" }}>
              {vacancy.skills.map((skill) => (
                <span key={skill} className="chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {verificationRun.status === "waiting_consent" && (
        <Section num="03" label="Согласие">
          <div
            className="placeholder"
            style={{
              borderColor: "var(--warn)",
              color: "var(--warn)",
              marginBottom: 24,
            }}
          >
            Проверка не активна без отдельного согласия кандидата. Сначала
            HR запрашивает согласие, затем кандидат принимает его.
          </div>

          {verificationRun.consentStatus === "not_requested" && (
            <button className="btn btn-primary" onClick={handleRequestConsent}>
              Запросить согласие →
            </button>
          )}

          {verificationRun.consentStatus === "requested" && (
            <Link
              href={`/consents/${verificationRun.id}`}
              className="btn btn-primary"
            >
              Открыть страницу согласия →
            </Link>
          )}

          {verificationRun.consentStatus === "revoked" && (
            <div
              className="placeholder"
              style={{
                borderColor: "var(--risk)",
                color: "var(--risk)",
              }}
            >
              Кандидат отозвал согласие. Проверка не должна продолжаться.
            </div>
          )}
        </Section>
      )}

      {verificationRun.status === "active" && (
        <Section num="03" label="Активные действия">
          <div className="lead" style={{ marginTop: 0, marginBottom: 24 }}>
            Общую AI-оценку навыков кандидат проходит самостоятельно из
            личного кабинета. Компания не может ее назначить или отменить,
            но видит результат на странице кандидата.
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={`/assessment-results/${verificationRun.id}`}
              className="btn"
            >
              Ответы кандидата
            </Link>
          </div>
        </Section>
      )}

      {isTrustScope && (
        <Section num="04" label="Опыт и материалы">
          {candidateExperience.length === 0 ? (
            <Placeholder>
              У кандидата нет карточек опыта. Вернитесь в профиль и добавьте хотя бы
              одну карточку.
            </Placeholder>
          ) : (
            <div>
              {candidateExperience.map((experience) => {
                const evidenceItems = experience.evidence ?? [];

                return (
                  <div className="entry" key={experience.id}>
                    <div className="when">{experience.period}</div>
                    <div className="what">
                      <div className="role">{experience.role}</div>
                      <div className="co">
                        {experience.company} · {experience.employmentType}
                      </div>
                      <div className="scope">
                        {experience.responsibilities}
                      </div>
                      <div className="chips" style={{ marginTop: 14 }}>
                        {experience.stack.map((tech) => (
                          <span key={tech} className="chip">
                            {tech}
                          </span>
                        ))}
                      </div>

                      {evidenceItems.length > 0 && (
                        <div style={{ marginTop: 18 }}>
                          <div className="caption" style={{ marginBottom: 8 }}>
                            Evidence ({evidenceItems.length})
                          </div>
                          <div className="dl">
                            {evidenceItems.map((evidence) => (
                              <div key={evidence.id}>
                                <span className="k">
                                  {evidenceTypeLabels[evidence.type]}
                                </span>
                                <span className="v">
                                  <a
                                    href={evidence.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      borderBottom: "1px solid var(--ink)",
                                    }}
                                  >
                                    {evidence.title}
                                  </a>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="caption" style={{ marginBottom: 12 }}>
                        материалов · {evidenceItems.length}
                      </div>
                      <button
                        className="btn-link mono"
                        style={{ fontSize: 11 }}
                      >
                        запрос референту →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      <Section num="05" label="Итоговый отчет" id="report">
        {reportSnapshot ? (
          <>
            <ReportSnapshotView snapshot={reportSnapshot} />

            {reportSnapshot.vacancyId && (
              <div
                style={{
                  marginTop: 24,
                  borderTop: "1px solid var(--line-soft)",
                  paddingTop: 24,
                }}
              >
                {overrideError && (
                  <div
                    className="placeholder"
                    style={{
                      borderColor: "var(--risk)",
                      color: "var(--risk)",
                      marginBottom: 16,
                    }}
                  >
                    {overrideError}
                  </div>
                )}

                {!overrideOpen ? (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={openOverride}
                      disabled={overrideBusy}
                    >
                      {reportSnapshot.overrideStatus
                        ? "Изменить статус"
                        : "Переопределить статус"}
                    </button>
                    {reportSnapshot.overrideStatus && (
                      <button
                        type="button"
                        className="btn"
                        onClick={handleClearOverride}
                        disabled={overrideBusy}
                        style={{
                          color: "var(--risk)",
                          borderColor: "var(--risk)",
                        }}
                      >
                        {overrideBusy ? "…" : "Сбросить к AI-оценке"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="field">
                      <span className="field-label">Новый статус</span>
                      <FormDropdown
                        value={overrideStatus}
                        onChange={(v) =>
                          setOverrideStatus(v as ReportOverallStatus)
                        }
                        options={[
                          { value: "verified", label: "подтвержден" },
                          {
                            value: "partially_verified",
                            label: "частично подтвержден",
                          },
                          { value: "questionable", label: "под вопросом" },
                          {
                            value: "insufficient_data",
                            label: "недостаточно данных",
                          },
                        ]}
                        placeholder="подтвержден"
                        hideClearOption
                        className="form-dropdown--field"
                      />
                    </div>
                    <div className="field" style={{ marginTop: 16 }}>
                      <span className="field-label">Причина *</span>
                      <textarea
                        value={overrideReason}
                        onChange={(event) =>
                          setOverrideReason(event.target.value)
                        }
                        rows={3}
                        maxLength={2000}
                        className="textarea"
                        placeholder="Обоснование для аудита (минимум 3 символа)…"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleApplyOverride}
                        disabled={overrideBusy}
                      >
                        {overrideBusy ? "Сохранение…" : "Применить"}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setOverrideOpen(false)}
                        disabled={overrideBusy}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div
            className="placeholder"
            style={{ borderColor: "var(--warn)", color: "var(--warn)" }}
          >
            Отчет еще не сформирован. Он появится автоматически после
            прохождения кандидатом проверки (assessment / референты).
          </div>
        )}
      </Section>
    </>
  );
}
