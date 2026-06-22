import type {
  Vacancy,
  VacancyEmploymentType,
  VacancySeniority,
  VacancyWorkFormat,
} from "@/types/vacancy";

// Русские подписи для шапок и карточек вакансий. Совпадают с выпадающими
// списками в форме создания, чтобы выбранное HR значение так же и отображалось.
export const WORK_FORMAT_LABELS: Record<VacancyWorkFormat, string> = {
  remote: "Удаленно",
  office: "Офис",
  hybrid: "Гибрид",
};

export const VACANCY_LIST_STATUS_FILTER_OPTIONS: Array<{
  value: string;
  label: string;
}> = [
  { value: "all", label: "Все" },
  { value: "published", label: "Опубликованные" },
  { value: "draft", label: "Черновики" },
  { value: "closed", label: "Закрытые" },
];

export const VACANCY_LIST_FORMAT_FILTER_OPTIONS: Array<{
  value: string;
  label: string;
}> = [
  { value: "all", label: "Любой" },
  { value: "remote", label: WORK_FORMAT_LABELS.remote },
  { value: "hybrid", label: WORK_FORMAT_LABELS.hybrid },
  { value: "office", label: WORK_FORMAT_LABELS.office },
];

export const SENIORITY_LABELS: Record<VacancySeniority, string> = {
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

export const EMPLOYMENT_TYPE_LABELS: Record<VacancyEmploymentType, string> = {
  full_time: "Полная",
  part_time: "Частичная",
  contract: "Контракт",
};

// Локация = страна + город. Формат работы (удаленка/офис/гибрид) — отдельное
// поле, поэтому без города показываем только страну: дописывать «удаленно»
// сюда нельзя, иначе это путается с форматом занятости.
export function formatVacancyLocation(
  vacancy: Pick<Vacancy, "locationCountry" | "locationCity">
): string {
  return vacancy.locationCity
    ? `${vacancy.locationCountry}, ${vacancy.locationCity}`
    : vacancy.locationCountry;
}

/** Совпадение по навыку: теги вакансии или упоминание в названии/описании. */
export function vacancyMatchesSkill(
  vacancy: Pick<
    Vacancy,
    "skills" | "title" | "description" | "descriptionPreview"
  >,
  skill: string
): boolean {
  const needle = skill.trim().toLowerCase();
  if (!needle) return true;

  if (
    vacancy.skills.some(
      (item) =>
        item.toLowerCase() === needle || item.toLowerCase().includes(needle)
    )
  ) {
    return true;
  }

  const text = [
    vacancy.title,
    vacancy.description,
    vacancy.descriptionPreview ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return text.includes(needle);
}

export const SALARY_MIN = 30000;
export const SALARY_MAX = 1000000;

/** Лимит описания вакансии в формах создания и редактирования. */
export const VACANCY_DESCRIPTION_MAX = 3000;

export function formatRouble(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

// from / to — строки из инпутов (только цифры). null = ок, иначе текст ошибки.
export function validateSalaryRange(from: string, to: string): string | null {
  const fromNum = Number(from);
  const toNum = Number(to);
  if (!from || !to) return "Укажите диапазон зарплаты";
  if (Number.isNaN(fromNum) || Number.isNaN(toNum))
    return "Введите числа без пробелов";
  if (fromNum < SALARY_MIN || toNum < SALARY_MIN)
    return `Минимум ${SALARY_MIN.toLocaleString("ru-RU")} ₽`;
  if (fromNum > SALARY_MAX || toNum > SALARY_MAX)
    return `Максимум ${SALARY_MAX.toLocaleString("ru-RU")} ₽`;
  if (fromNum > toNum) return "«От» должно быть не больше «До»";
  return null;
}

export function buildSalaryRange(from: string, to: string): string {
  const lo = Math.min(Number(from), Number(to));
  const hi = Math.max(Number(from), Number(to));
  return lo === hi ? formatRouble(lo) : `${formatRouble(lo)} — ${formatRouble(hi)}`;
}

// Разобрать строку зарплаты («100 000 ₽ — 200 000 ₽») обратно в from / to,
// чтобы предзаполнить форму редактирования. «Не указано» → пустые поля.
export function parseSalaryRange(range: string): { from: string; to: string } {
  const groups = range.match(/\d[\d\s]*/g);
  if (!groups || groups.length === 0) return { from: "", to: "" };
  const clean = groups.map((g) => g.replace(/\s/g, ""));
  return { from: clean[0], to: clean[1] ?? clean[0] };
}
