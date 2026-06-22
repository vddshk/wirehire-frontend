/** Код организационно-правовой формы (хранится в API как `legal_form`). */
export type CompanyLegalForm =
  | "ooo"
  | "ao"
  | "pao"
  | "nao"
  | "zao"
  | "ip"
  | "kfh"
  | "ano"
  | "gup"
  | "mup";

export type CompanyLegalFormOption = {
  value: CompanyLegalForm;
  label: string;
  short: string;
};

const LEGAL_FORM_META: Record<
  CompanyLegalForm,
  { label: string; short: string }
> = {
  ooo: {
    short: "ООО",
    label: "ООО — общество с ограниченной ответственностью",
  },
  ip: {
    short: "ИП",
    label: "ИП — индивидуальный предприниматель",
  },
  ao: {
    short: "АО",
    label: "АО — акционерное общество",
  },
  pao: {
    short: "ПАО",
    label: "ПАО — публичное акционерное общество",
  },
  nao: {
    short: "НАО",
    label: "НАО — непубличное акционерное общество",
  },
  zao: {
    short: "ЗАО",
    label: "ЗАО — закрытое акционерное общество",
  },
  kfh: {
    short: "КФХ",
    label: "КФХ — крестьянское (фермерское) хозяйство",
  },
  ano: {
    short: "АНО",
    label: "АНО — автономная некоммерческая организация",
  },
  gup: {
    short: "ГУП",
    label: "ГУП — государственное унитарное предприятие",
  },
  mup: {
    short: "МУП",
    label: "МУП — муниципальное унитарное предприятие",
  },
};

/** ОПФ для регистрации — типичные формы IT-компаний и подрядчиков. */
export const COMPANY_LEGAL_FORM_REGISTRATION_OPTIONS: CompanyLegalFormOption[] =
  (["ooo", "ip", "ao"] as const).map((value) => ({
    value,
    label: LEGAL_FORM_META[value].label,
    short: LEGAL_FORM_META[value].short,
  }));

/** @deprecated Используйте COMPANY_LEGAL_FORM_REGISTRATION_OPTIONS. */
export const COMPANY_LEGAL_FORM_OPTIONS = COMPANY_LEGAL_FORM_REGISTRATION_OPTIONS;

const PREFIX_BY_FORM: Record<CompanyLegalForm, string> = Object.fromEntries(
  Object.entries(LEGAL_FORM_META).map(([key, meta]) => [key, meta.short])
) as Record<CompanyLegalForm, string>;

const STRIP_PREFIX_RE =
  /^(ООО|АО|ПАО|НАО|ЗАО|ИП|КФХ|АНО|ГУП|МУП)\s*/i;

export function getLegalFormShortLabel(form: CompanyLegalForm): string {
  return PREFIX_BY_FORM[form];
}

export function getLegalFormLabel(form: CompanyLegalForm): string {
  return LEGAL_FORM_META[form]?.label ?? form;
}

export function isCompanyLegalForm(value: string): value is CompanyLegalForm {
  return value in LEGAL_FORM_META;
}

/** Краткое имя без префикса ОПФ и кавычек. */
export function extractCompanyBrandName(input: string): string {
  let value = input.trim();
  value = value.replace(STRIP_PREFIX_RE, "");
  const quoted = value.match(/^«(.+)»$/);
  if (quoted) return quoted[1].trim();
  const wrapped = value.match(/^[А-ЯA-ZЁ]+\s*«(.+)»$/i);
  if (wrapped) return wrapped[1].trim();
  return value;
}

/** Публичное юридическое имя для профиля и API. */
export function formatCompanyLegalName(
  brandInput: string,
  form: CompanyLegalForm = "ooo"
): string {
  const brand = extractCompanyBrandName(brandInput);
  const prefix = PREFIX_BY_FORM[form];
  if (form === "ip" && brand.includes(" ")) {
    return `${prefix} ${brand}`;
  }
  return `${prefix} «${brand}»`;
}

export function validateCompanyBrandName(value: string): string | null {
  const brand = extractCompanyBrandName(value);
  if (!brand) return "Укажите название компании";
  if (brand.length < 2) return "Минимум 2 символа";
  if (brand.length > 80) return "Слишком длинное название";
  if (!/^[A-Za-zА-Яа-яЁё0-9]/.test(brand)) {
    return "Название должно начинаться с буквы или цифры";
  }
  if (!/[A-Za-zА-Яа-яЁё0-9]$/.test(brand)) {
    return "Название должно заканчиваться буквой или цифрой";
  }
  if (!/^[A-Za-zА-Яа-яЁё0-9 .\-]+$/.test(brand)) {
    return "Только буквы, цифры, пробелы и дефис";
  }
  return null;
}
