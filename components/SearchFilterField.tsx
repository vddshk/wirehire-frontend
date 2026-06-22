"use client";

import type { ChangeEvent } from "react";
import { FormDropdown } from "@/components/FormDropdown";

type FilterOption = {
  value: string;
  label: string;
};

type SearchFilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Значение «фильтр не задан» — для подсветки активного состояния */
  inactiveValue?: string;
  id?: string;
};

export function SearchFilterSelect({
  label,
  value,
  onChange,
  options,
  inactiveValue = "all",
  id,
}: SearchFilterSelectProps) {
  const inactiveOption = options.find(
    (option) => option.value === inactiveValue
  );

  return (
    <div className="search-filter">
      <label className="search-filter__label" htmlFor={id}>
        {label}
      </label>
      <FormDropdown
        id={id}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={inactiveOption?.label ?? "Выберите"}
        inactiveValue={inactiveValue}
        hideClearOption
        className="form-dropdown--filter"
      />
    </div>
  );
}

type SearchFilterInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
};

type SearchFilterToggleProps = {
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
  /** Текст внутри контрола, когда выключено */
  offLabel?: string;
  /** Текст внутри контрола, когда включено */
  onLabel?: string;
  id?: string;
};

export function SearchFilterToggle({
  label,
  active,
  onChange,
  offLabel = "Все",
  onLabel = "Только выбранные",
  id,
}: SearchFilterToggleProps) {
  return (
    <button
      type="button"
      id={id}
      className="search-filter search-filter--toggle"
      onClick={() => onChange(!active)}
      aria-pressed={active}
    >
      <span className="search-filter__label">{label}</span>
      <div className={`search-filter__control${active ? " is-active" : ""}`}>
        <span className="search-filter__toggle-value">
          {active ? onLabel : offLabel}
        </span>
      </div>
    </button>
  );
}

export function SearchFilterInput({
  label,
  value,
  onChange,
  placeholder,
  id,
}: SearchFilterInputProps) {
  const active = value.trim().length > 0;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <label className="search-filter" htmlFor={id}>
      <span className="search-filter__label">{label}</span>
      <div className={`search-filter__control${active ? " is-active" : ""}`}>
        <input
          id={id}
          type="text"
          className="search-filter__input"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}
