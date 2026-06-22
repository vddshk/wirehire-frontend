"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getApplicationsForVacancy,
  updateApplicationStatus,
} from "@/lib/api/applications";
import {
  getCandidateById,
  searchCandidates,
} from "@/lib/api/candidates";
import { getCandidateById as getRemoteCandidateById } from "@/lib/api/adapters/remote/candidates";
import { USE_REMOTE_API } from "@/lib/api/config";
import { getVacancyById, updateVacancy } from "@/lib/api/vacancies";
import {
  Application,
  ApplicationStatus,
  PIPELINE_COLUMN_BY_STATUS,
  PIPELINE_COLUMN_LABEL,
} from "@/types/application";
import { Candidate } from "@/types/candidate";
import { formatDate } from "@/lib/utils/date";
import {
  Vacancy,
  VacancyEmploymentType,
  VacancySeniority,
  VacancyStatus,
  VacancyWorkFormat,
} from "@/types/vacancy";
import {
  PageHeader,
  Section,
  Stat,
  StatGrid,
  Status,
  Crumb,
  Placeholder,
} from "@/components/ui/editorial";
import { SkillPicker } from "@/components/SkillPicker";
import { FormSheet } from "@/components/ui/FormSheet";
import { FormDropdown } from "@/components/FormDropdown";
import {
  EMPLOYMENT_TYPE_LABELS as employmentTypeLabels,
  SALARY_MAX,
  SALARY_MIN,
  SENIORITY_LABELS as seniorityLabels,
  WORK_FORMAT_LABELS as workFormatLabels,
  buildSalaryRange,
  formatVacancyLocation as getVacancyLocation,
  parseSalaryRange,
  validateSalaryRange,
  VACANCY_DESCRIPTION_MAX,
} from "@/lib/utils/vacancy";

const statusLabels: Record<VacancyStatus, string> = {
  draft: "черновик",
  published: "опубликована",
  closed: "закрыта",
};

const statusTones: Record<VacancyStatus, "good" | "warn" | "muted" | "risk"> = {
  draft: "muted",
  published: "good",
  closed: "risk",
};

const PIPELINE_STAGES = [
  "Подан",
  "Просмотрен",
  "Скрининг",
  "Проверка",
  "Интервью",
];

export default function VacancyDetailsPage() {
  const params = useParams();
  const vacancyId = Array.isArray(params.id) ? params.id[0] : params.id;

  const router = useRouter();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [candidatesById, setCandidatesById] = useState<
    Record<string, Candidate>
  >({});
  const [matchedCandidates, setMatchedCandidates] = useState<Candidate[]>([]);
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);

  // Edit modal state — same fields as create
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocationCountry, setEditLocationCountry] = useState("Россия");
  const [editLocationCity, setEditLocationCity] = useState("");
  const [editSeniority, setEditSeniority] =
    useState<VacancySeniority>("middle");
  const [editWorkFormat, setEditWorkFormat] =
    useState<VacancyWorkFormat>("remote");
  const [editEmploymentType, setEditEmploymentType] =
    useState<VacancyEmploymentType>("full_time");
  const [editSalaryFrom, setEditSalaryFrom] = useState("");
  const [editSalaryTo, setEditSalaryTo] = useState("");
  const [editSalaryTouched, setEditSalaryTouched] = useState(false);
  const [editStatus, setEditStatus] = useState<VacancyStatus>("published");
  const [editSkillSlots, setEditSkillSlots] = useState<string[]>([]);
  const [editError, setEditError] = useState("");

  const SKILLS_MAX = 6;
  const editSalaryError = editSalaryTouched
    ? validateSalaryRange(editSalaryFrom, editSalaryTo)
    : null;

  function openEditModal() {
    if (!vacancy) return;
    setEditTitle(vacancy.title);
    setEditDescription(vacancy.description);
    setEditLocationCountry(vacancy.locationCountry);
    setEditLocationCity(vacancy.locationCity ?? "");
    setEditSeniority(vacancy.seniority);
    setEditWorkFormat(vacancy.workFormat);
    setEditEmploymentType(vacancy.employmentType);
    const parsedSalary = parseSalaryRange(vacancy.salaryRange);
    setEditSalaryFrom(parsedSalary.from);
    setEditSalaryTo(parsedSalary.to);
    setEditSalaryTouched(false);
    setEditStatus(vacancy.status);
    setEditSkillSlots(vacancy.skills.length > 0 ? [...vacancy.skills] : []);
    setEditError("");
    setIsEditModalOpen(true);
  }

  async function handleSaveEdit() {
    if (!vacancy) return;
    if (!editTitle.trim()) {
      setEditError("Укажите название.");
      return;
    }
    if (!editDescription.trim()) {
      setEditError("Добавьте описание.");
      return;
    }
    const skills = editSkillSlots.map((slot) => slot.trim()).filter(Boolean);
    if (skills.length === 0) {
      setEditError("Добавьте хотя бы один навык");
      return;
    }
    setEditSalaryTouched(true);
    const salaryValidationError = validateSalaryRange(
      editSalaryFrom,
      editSalaryTo
    );
    if (salaryValidationError) {
      setEditError(salaryValidationError);
      return;
    }

    try {
      // PUT /vacancies/{id} — обновляем на бэке.
      // Бэк не хранит skills в карточке, поэтому их подмешиваем локально.
      const updated = await updateVacancy(vacancy.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        locationCountry: editLocationCountry.trim(),
        locationCity: editLocationCity.trim() || undefined,
        seniority: editSeniority,
        workType: editWorkFormat,
        employmentType: editEmploymentType,
        salaryRange: buildSalaryRange(editSalaryFrom, editSalaryTo),
        status: editStatus,
      });
      setVacancy({ ...updated, skills });
      setIsEditModalOpen(false);
      setEditError("");
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Не удалось сохранить вакансию"
      );
    }
  }

  useEffect(() => {
    if (!vacancyId) {
      setIsLoaded(true);
      return;
    }
    const id = vacancyId;
    let cancelled = false;
    async function load() {
      try {
        // Сначала идем в бэк (через фасад). Если он не ответил —
        // подхватываем локальные mock + localStorage.
        const remote = await getVacancyById(id);
        if (cancelled) return;
        if (remote) {
          setVacancy(remote);
        } else if (!USE_REMOTE_API) {
          const savedVacanciesRaw =
            localStorage.getItem("wirehire-vacancies");
          const savedVacancies: Vacancy[] = savedVacanciesRaw
            ? JSON.parse(savedVacanciesRaw)
            : [];
          setVacancy(
            savedVacancies.find((item) => item.id === id) ?? null
          );
        } else {
          setVacancy(null);
        }
      } catch {
        if (!cancelled) setVacancy(null);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [vacancyId]);

  useEffect(() => {
    if (!vacancyId) return;

    async function loadApplications() {
      const forThisVacancy = await getApplicationsForVacancy(vacancyId!);
      setApplications(forThisVacancy);

      // Имя кандидата приходит вложенным в Application (поле candidateName).
      // /candidates/{id} ходим только за подробностями, которые нужны воронке
      // (skills для match-блока, headline). Если бэк отвечает 404 — это
      // нормально (профиль не в публичном пуле); используем имя из отклика.
      const candidatesMap: Record<string, Candidate> = {};
      await Promise.all(
        forThisVacancy.map(async (application) => {
          if (!application.candidateId) return;
          let candidate: Candidate | null = null;
          if (USE_REMOTE_API) {
            try {
              candidate = await getRemoteCandidateById(
                application.candidateId,
                "all_visible"
              );
            } catch {
              // 404 — профиль не в публичном пуле, это нормально.
              candidate = null;
            }
          }
          if (!candidate) {
            candidate = await getCandidateById(application.candidateId);
          }
          if (candidate) candidatesMap[application.candidateId] = candidate;
        })
      );
      setCandidatesById(candidatesMap);
    }

    loadApplications();
  }, [vacancyId]);

  useEffect(() => {
    if (!vacancy || vacancy.skills.length === 0) {
      setMatchedCandidates([]);
      return;
    }

    let cancelled = false;
    async function loadMatched() {
      try {
        const result = await searchCandidates({ pool: "admitted", perPage: 50 });
        if (cancelled) return;
        const matched = result.candidates.filter((candidate) =>
          candidate.skills.some((skill) => vacancy!.skills.includes(skill))
        );
        setMatchedCandidates(matched);
      } catch {
        if (!cancelled) setMatchedCandidates([]);
      }
    }

    void loadMatched();
    return () => {
      cancelled = true;
    };
  }, [vacancy]);

  async function handleChangeApplicationStatus(
    application: Application,
    nextStatus: ApplicationStatus
  ) {
    await updateApplicationStatus(application.id, nextStatus);
    setApplications((previous) =>
      previous.map((a) =>
        a.id === application.id ? { ...a, status: nextStatus } : a
      )
    );
  }

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем вакансию." />;
  }

  if (!vacancy) {
    return (
      <>
        <Crumb>
          <Link href="/vacancies">← Вакансии</Link>
        </Crumb>
        <PageHeader
          eyebrow="Не найдено"
          title="Вакансия не найдена"
          lead="Такой вакансии нет в базе."
          actions={
            <Link href="/vacancies" className="btn btn-primary">
              К списку →
            </Link>
          }
        />
      </>
    );
  }

  const inWorkCount = applications.filter(
    (application) =>
      PIPELINE_COLUMN_BY_STATUS[application.status] !== "closed" &&
      application.status !== "submitted"
  ).length;

  function getMatchPercent(candidate: Candidate | undefined): number {
    if (!candidate || !vacancy || vacancy.skills.length === 0) return 0;
    const overlap = candidate.skills.filter((skill) =>
      vacancy.skills.includes(skill)
    ).length;
    return Math.round((overlap / vacancy.skills.length) * 100);
  }

  return (
    <>
      <Crumb>
        <Link href="/vacancies">← Вакансии</Link>
        {" · "}
        {vacancy.title}
      </Crumb>

      <PageHeader
        eyebrow={
          <>
            {vacancy.companyName} ·{" "}
            <Status tone={statusTones[vacancy.status]}>
              {statusLabels[vacancy.status]}
            </Status>
          </>
        }
        title={vacancy.title}
        lead={`${getVacancyLocation(vacancy)} · ${workFormatLabels[vacancy.workFormat]} · ${seniorityLabels[vacancy.seniority]} · ${employmentTypeLabels[vacancy.employmentType]} · ${vacancy.salaryRange}`}
        actions={
          <>
            <button
              type="button"
              className="btn"
              onClick={openEditModal}
            >
              Редактировать
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsApplicationsModalOpen(true)}
            >
              Отклики →
            </button>
          </>
        }
      />

      <StatGrid>
        <Stat
          value={applications.length || vacancy.applicationsCount}
          label="Откликов"
        />
        <Stat value={inWorkCount} label="В работе" />
        <Stat
          value={
            <span
              style={{
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: "-0.015em",
                color:
                  vacancy.status === "published"
                    ? "var(--ink)"
                    : vacancy.status === "closed"
                      ? "var(--risk)"
                      : "var(--muted)",
              }}
            >
              {statusLabels[vacancy.status]}
            </span>
          }
          label="Статус"
        />
        <Stat
          value={
            <span
              style={{
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: "-0.015em",
                fontFamily: "var(--font-mono)",
              }}
            >
              {formatDate(vacancy.createdAt)}
            </span>
          }
          label="Создана"
        />
      </StatGrid>

      <Section num="01" label="Описание">
        <div className="job-prose" style={{ marginBottom: 32 }}>
          {vacancy.description}
        </div>

        <div className="caption" style={{ marginBottom: 16 }}>
          Ключевые навыки
        </div>
        <div className="chips" style={{ gap: "0 16px" }}>
          {vacancy.skills.map((skill) => (
            <span key={skill} className="chip">
              {skill}
            </span>
          ))}
        </div>
      </Section>

      <Section num="02" label="Pipeline воронки">
        <div className="kanban">
          {PIPELINE_STAGES.map((stage, index) => (
            <div className="col" key={stage}>
              <h4>
                {stage}
                <span className="n">
                  {index === 0 ? vacancy.applicationsCount : 0}
                </span>
              </h4>
              <div className="caption" style={{ marginTop: 16 }}>
                {index === 0 && vacancy.applicationsCount > 0
                  ? "входящий поток"
                  : "—"}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        num="03"
        label={
          <div className="between" style={{ alignItems: "baseline" }}>
            <span>Подходящие кандидаты</span>
            <Link
              href={`/candidates?vacancyId=${vacancy.id}`}
              className="btn-link mono"
              style={{ fontSize: 12 }}
            >
              все →
            </Link>
          </div>
        }
      >
        {matchedCandidates.length === 0 ? (
          <Placeholder>Подходящие кандидаты не найдены</Placeholder>
        ) : (
          <div>
            {matchedCandidates.map((candidate) => {
              const matchedSkills = candidate.skills.filter((skill) =>
                vacancy.skills.includes(skill)
              );

              return (
                <Link
                  href={`/candidates/${candidate.id}`}
                  key={candidate.id}
                  className="entry"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="when">{candidate.location}</div>
                  <div className="what">
                    <div className="role">{candidate.fullName}</div>
                    <div className="co">{candidate.headline}</div>
                    <div className="scope">
                      Совпавшие навыки: {matchedSkills.join(", ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="match-num">
                      <span className="tnum">
                        {Math.round(
                          (matchedSkills.length / vacancy.skills.length) * 100
                        )}
                      </span>
                      <span className="pct">%</span>
                    </div>
                    <div className="caption" style={{ marginTop: 6 }}>
                      match
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {isApplicationsModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsApplicationsModalOpen(false);
            }
          }}
        >
          <div
            style={{
              maxHeight: "90vh",
              width: "100%",
              maxWidth: 880,
              overflowY: "auto",
              background: "#fff",
              padding: 48,
            }}
          >
            <div className="between" style={{ marginBottom: 32 }}>
              <div>
                <div className="eyebrow">Воронка</div>
                <h2 className="h-section">
                  Отклики · {applications.length}
                </h2>
              </div>
              <button
                className="btn-link mono"
                onClick={() => setIsApplicationsModalOpen(false)}
                style={{ fontSize: 12 }}
              >
                закрыть ×
              </button>
            </div>

            {applications.length === 0 ? (
              <Placeholder>
                По этой вакансии пока нет откликов.
              </Placeholder>
            ) : (
              <div>
                {applications.map((application) => {
                  const candidate = candidatesById[application.candidateId];
                  const stageColumn =
                    PIPELINE_COLUMN_BY_STATUS[application.status];
                  const stageLabel =
                    stageColumn === "closed"
                      ? application.status === "rejected"
                        ? "Отказ"
                        : application.status === "hired"
                          ? "Нанят"
                          : application.status === "withdrawn"
                            ? "Отозван"
                            : "Архив"
                      : PIPELINE_COLUMN_LABEL[stageColumn];
                  const stageTone =
                    application.status === "rejected"
                      ? "risk"
                      : stageColumn === "interview" ||
                          stageColumn === "offer" ||
                          application.status === "hired"
                        ? "good"
                        : "muted";
                  const canReject =
                    application.status !== "rejected" &&
                    application.status !== "hired";
                  // Кнопка «В pipeline» переводит отклик в статус reviewed
                  // (колонка «Новые»). Не показываем, если уже в работе
                  // или закрыт.
                  const canPipeline =
                    application.status !== "reviewed" &&
                    application.status !== "shortlist" &&
                    application.status !== "in_progress" &&
                    application.status !== "rejected" &&
                    application.status !== "hired";

                  const matchPercent = getMatchPercent(candidate);

                  return (
                    <div
                      key={application.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        gap: 24,
                        padding: "22px 0",
                        borderTop: "1px solid var(--line-soft)",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ minWidth: 56 }}>
                        <div
                          style={{
                            fontSize: 26,
                            fontWeight: 500,
                            letterSpacing: "-0.025em",
                            fontFeatureSettings: '"tnum"',
                          }}
                        >
                          {matchPercent}
                          <span
                            className="muted"
                            style={{ fontSize: 12, marginLeft: 2 }}
                          >
                            %
                          </span>
                        </div>
                        <div
                          className="caption"
                          style={{ marginTop: 2, textTransform: "none" }}
                        >
                          match
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 500,
                            letterSpacing: "-0.012em",
                          }}
                        >
                          {candidate?.fullName ??
                            application.candidateName ??
                            "Кандидат не найден"}
                        </div>
                        {candidate && (candidate.headline || candidate.location) && (
                          <div
                            className="muted"
                            style={{ fontSize: 13, marginTop: 4 }}
                          >
                            {[candidate.headline, candidate.location]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <Status tone={stageTone as "good" | "warn" | "muted" | "risk"}>
                            {stageLabel}
                          </Status>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => router.push("/messages")}
                        >
                          Написать
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={!canPipeline}
                          onClick={() =>
                            handleChangeApplicationStatus(
                              application,
                              "reviewed"
                            )
                          }
                        >
                          В pipeline
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={!canReject}
                          onClick={() =>
                            handleChangeApplicationStatus(
                              application,
                              "rejected"
                            )
                          }
                          style={{
                            color: canReject ? "var(--risk)" : undefined,
                            borderColor: canReject ? "var(--risk)" : undefined,
                          }}
                        >
                          Отказать
                        </button>
                        {candidate && (
                          <Link
                            href={`/candidates/${candidate.id}`}
                            className="btn btn-sm btn-primary"
                          >
                            Профиль →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <FormSheet
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        eyebrow="Вакансия"
        title="Редактировать"
        error={editError || undefined}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setIsEditModalOpen(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveEdit}
            >
              Сохранить →
            </button>
          </>
        }
      >
        <div className="fieldgrid">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Название *</span>
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="input"
                  style={{ fontSize: 24, letterSpacing: "-0.018em" }}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Описание *</span>
                <textarea
                  value={editDescription}
                  onChange={(event) =>
                    setEditDescription(
                      event.target.value.slice(0, VACANCY_DESCRIPTION_MAX)
                    )
                  }
                  rows={8}
                  maxLength={VACANCY_DESCRIPTION_MAX}
                  className="textarea"
                />
                <div
                  className="caption"
                  style={{
                    marginTop: 6,
                    textAlign: "right",
                    textTransform: "none",
                    color:
                      editDescription.length >= VACANCY_DESCRIPTION_MAX
                        ? "var(--warn)"
                        : "var(--muted)",
                  }}
                >
                  {editDescription.length} / {VACANCY_DESCRIPTION_MAX}
                </div>
              </div>
              <div className="field">
                <span className="field-label">Страна *</span>
                <input
                  value={editLocationCountry}
                  onChange={(event) => setEditLocationCountry(event.target.value)}
                  className="input"
                />
              </div>
              <div className="field">
                <span className="field-label">Город</span>
                <input
                  value={editLocationCity}
                  onChange={(event) => setEditLocationCity(event.target.value)}
                  className="input"
                  placeholder="Можно оставить пустым"
                />
              </div>
              <div className="field">
                <span className="field-label">Статус</span>
                <FormDropdown
                  value={editStatus}
                  onChange={(v) => setEditStatus(v as VacancyStatus)}
                  options={[
                    { value: "draft", label: "Черновик" },
                    { value: "published", label: "Опубликована" },
                    { value: "closed", label: "Закрыта" },
                  ]}
                  placeholder="Черновик"
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>
              <div className="field">
                <span className="field-label">Грейд</span>
                <FormDropdown
                  value={editSeniority}
                  onChange={(v) => setEditSeniority(v as VacancySeniority)}
                  options={[
                    { value: "junior", label: seniorityLabels.junior },
                    { value: "middle", label: seniorityLabels.middle },
                    { value: "senior", label: seniorityLabels.senior },
                  ]}
                  placeholder={seniorityLabels.junior}
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>
              <div className="field">
                <span className="field-label">Формат</span>
                <FormDropdown
                  value={editWorkFormat}
                  onChange={(v) => setEditWorkFormat(v as VacancyWorkFormat)}
                  options={[
                    { value: "remote", label: "Удаленно" },
                    { value: "office", label: "Офис" },
                    { value: "hybrid", label: "Гибрид" },
                  ]}
                  placeholder="Удаленно"
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>
              <div className="field">
                <span className="field-label">Занятость</span>
                <FormDropdown
                  value={editEmploymentType}
                  onChange={(v) =>
                    setEditEmploymentType(v as VacancyEmploymentType)
                  }
                  options={[
                    { value: "full_time", label: "Полная" },
                    { value: "part_time", label: "Частичная" },
                    { value: "contract", label: "Контракт" },
                  ]}
                  placeholder="Полная"
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Навыки *</span>
                <SkillPicker
                  slots={editSkillSlots}
                  onChange={setEditSkillSlots}
                  max={SKILLS_MAX}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Зарплата, ₽ в месяц</span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      className="caption"
                      style={{
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      От
                    </div>
                    <input
                      value={editSalaryFrom}
                      onChange={(event) =>
                        setEditSalaryFrom(
                          event.target.value.replace(/[^\d]/g, "")
                        )
                      }
                      onBlur={() => setEditSalaryTouched(true)}
                      className="input"
                      inputMode="numeric"
                      placeholder={`${SALARY_MIN}`}
                    />
                  </div>
                  <div>
                    <div
                      className="caption"
                      style={{
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      До
                    </div>
                    <input
                      value={editSalaryTo}
                      onChange={(event) =>
                        setEditSalaryTo(
                          event.target.value.replace(/[^\d]/g, "")
                        )
                      }
                      onBlur={() => setEditSalaryTouched(true)}
                      className="input"
                      inputMode="numeric"
                      placeholder={`${SALARY_MAX}`}
                    />
                  </div>
                </div>
                {editSalaryError && (
                  <span
                    className="caption"
                    style={{
                      marginTop: 6,
                      color: "var(--risk)",
                      textTransform: "none",
                      letterSpacing: 0,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {editSalaryError}
                  </span>
                )}
              </div>
        </div>
      </FormSheet>
    </>
  );
}
