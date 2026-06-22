"use client";

import { useEffect, useMemo, useState } from "react";
import { FormDropdown } from "@/components/FormDropdown";
import { validateRuPeriod } from "@/lib/utils/date";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

const CURRENT_LABEL = "По настоящее время";

type DateRangePickerProps = {
  value: string;
  onChange: (value: string) => void;
  minYear?: number;
};

type Parsed = {
  fromMonth: string;
  fromYear: string;
  toMonth: string;
  toYear: string;
  isCurrent: boolean;
};

function parseRange(value: string): Parsed {
  const empty: Parsed = {
    fromMonth: "",
    fromYear: "",
    toMonth: "",
    toYear: "",
    isCurrent: false,
  };
  if (!value.trim()) return empty;

  const parts = value.split(/\s*[—–-]\s*/);
  const fromRaw = parts[0]?.trim() ?? "";
  const toRaw = parts[1]?.trim() ?? "";

  const fromTokens = fromRaw.split(/\s+/);
  const toTokens = toRaw.split(/\s+/);

  const findMonth = (tokens: string[]) =>
    tokens.find((t) =>
      MONTHS.some((m) => m.toLowerCase() === t.toLowerCase())
    ) ?? "";
  const findYear = (tokens: string[]) =>
    tokens.find((t) => /^\d{4}$/.test(t)) ?? "";

  const fromMonth = findMonth(fromTokens);
  const fromYear = findYear(fromTokens);
  const isCurrent =
    toRaw.toLowerCase().includes("настоящ") || toRaw.toLowerCase() === "сейчас";
  const toMonth = isCurrent ? "" : findMonth(toTokens);
  const toYear = isCurrent ? "" : findYear(toTokens);

  return {
    fromMonth: MONTHS.find((m) => m.toLowerCase() === fromMonth.toLowerCase()) ?? "",
    fromYear,
    toMonth: MONTHS.find((m) => m.toLowerCase() === toMonth.toLowerCase()) ?? "",
    toYear,
    isCurrent,
  };
}

function buildRange(p: Parsed): string {
  const from = [p.fromMonth, p.fromYear].filter(Boolean).join(" ");
  if (!from) return "";
  if (p.isCurrent) return `${from} — ${CURRENT_LABEL}`;
  const to = [p.toMonth, p.toYear].filter(Boolean).join(" ");
  if (!to) return from;
  return `${from} — ${to}`;
}

export function DateRangePicker({
  value,
  onChange,
  minYear = 1980,
}: DateRangePickerProps) {
  const [state, setState] = useState<Parsed>(() => parseRange(value));

  useEffect(() => {
    setState(parseRange(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const list: string[] = [];
    for (let y = now; y >= minYear; y -= 1) list.push(String(y));
    return list;
  }, [minYear]);

  function patch(next: Partial<Parsed>) {
    const merged = { ...state, ...next };
    setState(merged);
    onChange(buildRange(merged));
  }

  const rangeError = validateRuPeriod(buildRange(state));

  return (
    <div className="date-range">
      <div className="date-range__grid">
        <div className="date-range__col">
          <span className="date-range__label caption">От</span>
          <div className="date-range__pickers">
            <FormDropdown
              value={state.fromMonth}
              onChange={(fromMonth) => patch({ fromMonth })}
              options={MONTHS.map((month) => ({ value: month, label: month }))}
              placeholder="Месяц"
              ariaLabel="Месяц начала"
              className="date-range__dropdown"
            />
            <FormDropdown
              value={state.fromYear}
              onChange={(fromYear) => patch({ fromYear })}
              options={years.map((year) => ({ value: year, label: year }))}
              placeholder="Год"
              ariaLabel="Год начала"
              className="date-range__dropdown date-range__dropdown--year"
            />
          </div>
        </div>

        <div
          className={`date-range__col${
            state.isCurrent ? " date-range__col--blocked" : ""
          }`}
        >
          <span className="date-range__label caption">До</span>
          <div className="date-range__pickers">
            <FormDropdown
              value={state.isCurrent ? "" : state.toMonth}
              onChange={(toMonth) => patch({ toMonth })}
              options={MONTHS.map((month) => ({ value: month, label: month }))}
              placeholder="Месяц"
              disabled={state.isCurrent}
              ariaLabel="Месяц окончания"
              className="date-range__dropdown"
            />
            <FormDropdown
              value={state.isCurrent ? "" : state.toYear}
              onChange={(toYear) => patch({ toYear })}
              options={years.map((year) => ({ value: year, label: year }))}
              placeholder="Год"
              disabled={state.isCurrent}
              ariaLabel="Год окончания"
              className="date-range__dropdown date-range__dropdown--year"
            />
          </div>
        </div>
      </div>

      <div className="date-range__footer">
        {rangeError ? (
          <span className="date-range__error caption">{rangeError}</span>
        ) : (
          <span />
        )}
        <label className="date-range__current">
          <input
            type="checkbox"
            checked={state.isCurrent}
            onChange={(event) =>
              patch({
                isCurrent: event.target.checked,
                ...(event.target.checked ? { toMonth: "", toYear: "" } : {}),
              })
            }
          />
          <span>{CURRENT_LABEL}</span>
        </label>
      </div>
    </div>
  );
}
