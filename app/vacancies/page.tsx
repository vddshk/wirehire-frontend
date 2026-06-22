"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser, setCurrentUser } from "@/lib/api/session";
import { getMyCompany } from "@/lib/api/company";
import {
  archiveVacancy,
  createVacancy,
  getMyVacancies,
  publishVacancy,
} from "@/lib/api/vacancies";
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
  Status,
  EditorialTable,
  Placeholder,
} from "@/components/ui/editorial";
import { SkillPicker } from "@/components/SkillPicker";
import { FormSheet } from "@/components/ui/FormSheet";
import { FormDropdown } from "@/components/FormDropdown";
import { SearchFilterSelect } from "@/components/SearchFilterField";
import { formatDate } from "@/lib/utils/date";
import {
  EMPLOYMENT_TYPE_LABELS as employmentTypeLabels,
  SALARY_MAX,
  SALARY_MIN,
  SENIORITY_LABELS as seniorityLabels,
  WORK_FORMAT_LABELS as workFormatLabels,
  buildSalaryRange,
  formatVacancyLocation,
  validateSalaryRange,
  VACANCY_DESCRIPTION_MAX,
  VACANCY_LIST_FORMAT_FILTER_OPTIONS,
  VACANCY_LIST_STATUS_FILTER_OPTIONS,
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

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VacancyStatus>(
    "all"
  );
  const [workFormatFilter, setWorkFormatFilter] = useState<
    "all" | VacancyWorkFormat
  >("all");

  const [accountCompanyName, setAccountCompanyName] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [locationCountry, setLocationCountry] = useState("Россия");
  const [locationCity, setLocationCity] = useState("");
  const [seniority, setSeniority] = useState<VacancySeniority>("middle");
  const [workFormat, setWorkFormat] = useState<VacancyWorkFormat>("remote");
  const [employmentType, setEmploymentType] =
    useState<VacancyEmploymentType>("full_time");
  const [salaryFromInput, setSalaryFromInput] = useState("100000");
  const [salaryToInput, setSalaryToInput] = useState("200000");
  const [salaryTouched, setSalaryTouched] = useState(false);

  const salaryError = salaryTouched
    ? validateSalaryRange(salaryFromInput, salaryToInput)
    : null;
  const [status, setStatus] = useState<VacancyStatus>("draft");
  const [skillSlots, setSkillSlots] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function loadAccountCompany() {
      const user = getCurrentUser();
      if (!user || (user.role !== "hr" && user.role !== "hiring_manager")) {
        return;
      }

      if (user.companyName?.trim()) {
        setAccountCompanyName(user.companyName);
        setCompanyName(user.companyName);
        return;
      }

      try {
        const company = await getMyCompany();
        const name = company.name.trim();
        if (!name) return;
        setAccountCompanyName(name);
        setCompanyName(name);
        setCurrentUser({ ...user, companyName: name });
      } catch {
        // Компания недоступна — поле останется редактируемым.
      }
    }

    loadAccountCompany();
  }, []);

  const SKILLS_MAX = 6;

  useEffect(() => {
    let cancelled = false;
    async function loadVacancies() {
      try {
        const myVacancies = await getMyVacancies();
        if (!cancelled) setVacancies(myVacancies);
      } catch {
        if (!cancelled) setVacancies([]);
      }
    }
    loadVacancies();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVacancies = vacancies.filter((vacancy) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      !searchText ||
      vacancy.title.toLowerCase().includes(searchText) ||
      vacancy.companyName.toLowerCase().includes(searchText) ||
      vacancy.skills.some((skill) =>
        skill.toLowerCase().includes(searchText)
      );

    const matchesStatus =
      statusFilter === "all" || vacancy.status === statusFilter;

    const matchesWorkFormat =
      workFormatFilter === "all" || vacancy.workFormat === workFormatFilter;

    return matchesSearch && matchesStatus && matchesWorkFormat;
  });

  const totalApplications = vacancies.reduce(
    (acc, vacancy) => acc + vacancy.applicationsCount,
    0
  );
  const publishedCount = vacancies.filter(
    (vacancy) => vacancy.status === "published"
  ).length;

  async function ensureAccountCompany(): Promise<string> {
    if (accountCompanyName.trim()) {
      return accountCompanyName;
    }

    const user = getCurrentUser();
    if (user?.companyName?.trim()) {
      setAccountCompanyName(user.companyName);
      setCompanyName(user.companyName);
      return user.companyName;
    }

    try {
      const company = await getMyCompany();
      const name = company.name.trim();
      if (!name) return "";
      setAccountCompanyName(name);
      setCompanyName(name);
      if (user) {
        setCurrentUser({ ...user, companyName: name });
      }
      return name;
    } catch {
      return "";
    }
  }

  async function openCreateModal() {
    const resolvedCompany = await ensureAccountCompany();
    resetForm(resolvedCompany);
    setIsModalOpen(true);
  }

  function resetForm(resolvedCompany?: string) {
    setTitle("");
    setCompanyName(resolvedCompany ?? accountCompanyName);
    setDescription("");
    setLocationCountry("Россия");
    setLocationCity("");
    setSeniority("middle");
    setWorkFormat("remote");
    setEmploymentType("full_time");
    setSalaryFromInput("100000");
    setSalaryToInput("200000");
    setSalaryTouched(false);
    setStatus("draft");
    setSkillSlots([]);
    setFormError("");
  }

  async function handleCreateVacancy() {
    const skills = skillSlots
      .map((slot) => slot.trim())
      .filter(Boolean);

    if (!title.trim()) {
      setFormError("Укажите название.");
      return;
    }
    if (!companyName.trim()) {
      setFormError("Укажите компанию.");
      return;
    }
    if (!description.trim()) {
      setFormError("Добавьте описание.");
      return;
    }
    if (!locationCountry.trim()) {
      setFormError("Укажите страну.");
      return;
    }
    if (skills.length === 0) {
      setFormError("Добавьте хотя бы один навык");
      return;
    }
    setSalaryTouched(true);
    const salaryValidationError = validateSalaryRange(
      salaryFromInput,
      salaryToInput
    );
    if (salaryValidationError) {
      setFormError(salaryValidationError);
      return;
    }

    try {
      const created = await createVacancy({
        title: title.trim(),
        description: description.trim(),
        locationCountry: locationCountry.trim(),
        locationCity: locationCity.trim() || undefined,
        seniority,
        workType: workFormat,
        employmentType,
        salaryRange: buildSalaryRange(salaryFromInput, salaryToInput),
        status: status === "closed" ? "draft" : status,
      });
      // Бэк не знает про skills/applicationsCount в карточке —
      // дополняем тем, что ввел пользователь.
      const enriched: Vacancy = {
        ...created,
        skills,
        companyName: created.companyName || companyName.trim(),
      };
      setVacancies((prev) => [...prev, enriched]);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Не удалось создать вакансию"
      );
    }
  }

  async function handlePublish(vacancyId: string) {
    try {
      const updated = await publishVacancy(vacancyId);
      setVacancies((prev) =>
        prev.map((v) => (v.id === vacancyId ? updated : v))
      );
    } catch (err) {
      // 422 — обязательные поля незаполнены; пока выводим в alert
      alert(
        err instanceof Error
          ? err.message
          : "Не удалось опубликовать вакансию"
      );
    }
  }

  async function handleArchive(vacancyId: string) {
    try {
      const updated = await archiveVacancy(vacancyId);
      setVacancies((prev) =>
        prev.map((v) => (v.id === vacancyId ? updated : v))
      );
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Не удалось архивировать вакансию"
      );
    }
  }

  return (
    <>
      <PageHeader
        wideTitle
        eyebrow="Вакансии"
        title="Управление вакансиями"
        lead={`${vacancies.length} ${vacancies.length === 1 ? "вакансия" : "вакансий"} · ${publishedCount} опубликованных · ${totalApplications} откликов суммарно`}
        actions={
          <button className="btn btn-primary" onClick={openCreateModal}>
            + создать вакансию
          </button>
        }
      />

      <div style={{ marginBottom: 56 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="input search"
          placeholder="Название, компания, навык…"
        />

        <div
          className="vacancy-list__filters"
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 200px))",
            gap: 12,
          }}
        >
          <SearchFilterSelect
            id="vacancy-status-filter"
            label="Статус"
            value={statusFilter}
            inactiveValue="all"
            onChange={(value) =>
              setStatusFilter(value as "all" | VacancyStatus)
            }
            options={VACANCY_LIST_STATUS_FILTER_OPTIONS}
          />
          <SearchFilterSelect
            id="vacancy-format-filter"
            label="Формат"
            value={workFormatFilter}
            inactiveValue="all"
            onChange={(value) =>
              setWorkFormatFilter(value as "all" | VacancyWorkFormat)
            }
            options={VACANCY_LIST_FORMAT_FILTER_OPTIONS}
          />
        </div>
      </div>

      {filteredVacancies.length === 0 ? (
        <Placeholder>Вакансий под текущий фильтр нет</Placeholder>
      ) : (
        <EditorialTable>
            <thead>
              <tr>
                <th>Название</th>
                <th>Компания</th>
                <th>Формат</th>
                <th>Откликов</th>
                <th>Статус</th>
                <th className="mobile-hide">Создана</th>
                <th aria-label="Действия">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {filteredVacancies.map((vacancy) => (
                <tr key={vacancy.id} className="row-clickable">
                  <td
                    data-label="Название"
                    style={{
                      fontSize: 18,
                      fontWeight: 500,
                      letterSpacing: "-0.012em",
                    }}
                  >
                    <Link href={`/vacancies/${vacancy.id}`}>
                      {vacancy.title}
                    </Link>
                    <div
                      className="caption"
                      style={{ marginTop: 4, textTransform: "none" }}
                    >
                      {seniorityLabels[vacancy.seniority]} ·{" "}
                      {employmentTypeLabels[vacancy.employmentType]}
                    </div>
                    <div
                      className="caption"
                      style={{ marginTop: 2, textTransform: "none" }}
                    >
                      {vacancy.salaryRange}
                    </div>
                  </td>
                  <td data-label="Компания" className="muted">
                    {vacancy.companyName}
                    <div
                      className="caption"
                      style={{ marginTop: 4, textTransform: "none" }}
                    >
                      {formatVacancyLocation(vacancy)}
                    </div>
                  </td>
                  <td data-label="Формат" className="mono muted">
                    {workFormatLabels[vacancy.workFormat]}
                  </td>
                  <td data-label="Откликов" className="mono">
                    {vacancy.applicationsCount}
                  </td>
                  <td data-label="Статус">
                    <Status tone={statusTones[vacancy.status]}>
                      {statusLabels[vacancy.status]}
                    </Status>
                  </td>
                  <td
                    data-label="Создана"
                    className="mono muted mobile-hide"
                  >
                    {formatDate(vacancy.createdAt)}
                  </td>
                  <td className="text-right">
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        justifyContent: "flex-end",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {vacancy.status === "draft" && (
                        <button
                          type="button"
                          className="btn-link mono"
                          style={{ fontSize: 12, whiteSpace: "nowrap" }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handlePublish(vacancy.id);
                          }}
                        >
                          опубликовать
                        </button>
                      )}
                      {vacancy.status === "published" && (
                        <button
                          type="button"
                          className="btn-link mono"
                          style={{ fontSize: 12, whiteSpace: "nowrap" }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleArchive(vacancy.id);
                          }}
                        >
                          в архив
                        </button>
                      )}
                      <Link
                        href={`/vacancies/${vacancy.id}`}
                        className="btn-link mono"
                        style={{ fontSize: 12, whiteSpace: "nowrap" }}
                      >
                        открыть →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </EditorialTable>
      )}

      <FormSheet
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        eyebrow="Новая вакансия"
        title="Создать"
        error={formError || undefined}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateVacancy}
            >
              Создать →
            </button>
          </>
        }
      >
        <div className="fieldgrid">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Название *</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="input"
                  style={{ fontSize: 24, letterSpacing: "-0.018em" }}
                  placeholder="Frontend Developer"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">
                  Компания *{" "}
                </span>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="input"
                  readOnly={Boolean(accountCompanyName)}
                  style={{
                    color: accountCompanyName ? "var(--muted)" : "var(--ink)",
                    cursor: accountCompanyName ? "not-allowed" : "text",
                  }}
                  title={
                    accountCompanyName
                      ? "Подтягивается из твоего аккаунта компании"
                      : undefined
                  }
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Описание *</span>
                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
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
                      description.length >= VACANCY_DESCRIPTION_MAX
                        ? "var(--warn)"
                        : "var(--muted)",
                  }}
                >
                  {description.length} / {VACANCY_DESCRIPTION_MAX}
                </div>
              </div>
              <div className="field">
                <span className="field-label">Страна *</span>
                <input
                  value={locationCountry}
                  onChange={(event) => setLocationCountry(event.target.value)}
                  className="input"
                />
              </div>
              <div className="field">
                <span className="field-label">Город</span>
                <input
                  value={locationCity}
                  onChange={(event) => setLocationCity(event.target.value)}
                  className="input"
                  placeholder="Можно оставить пустым"
                />
              </div>
              <div className="field">
                <span className="field-label">Статус</span>
                <FormDropdown
                  value={status}
                  onChange={(v) => setStatus(v as VacancyStatus)}
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
                  value={seniority}
                  onChange={(v) => setSeniority(v as VacancySeniority)}
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
                  value={workFormat}
                  onChange={(v) => setWorkFormat(v as VacancyWorkFormat)}
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
                  value={employmentType}
                  onChange={(v) =>
                    setEmploymentType(v as VacancyEmploymentType)
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
                  slots={skillSlots}
                  onChange={setSkillSlots}
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
                      value={salaryFromInput}
                      onChange={(event) =>
                        setSalaryFromInput(
                          event.target.value.replace(/[^\d]/g, "")
                        )
                      }
                      onBlur={() => setSalaryTouched(true)}
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
                      value={salaryToInput}
                      onChange={(event) =>
                        setSalaryToInput(
                          event.target.value.replace(/[^\d]/g, "")
                        )
                      }
                      onBlur={() => setSalaryTouched(true)}
                      className="input"
                      inputMode="numeric"
                      placeholder={`${SALARY_MAX}`}
                    />
                  </div>
                </div>
                {salaryError && (
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
                    {salaryError}
                  </span>
                )}
              </div>
        </div>
      </FormSheet>
    </>
  );
}
