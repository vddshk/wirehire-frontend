"use client";

import { useEffect, useId, useRef, useState } from "react";

export type FormDropdownOption = {
  value: string;
  label: string;
  /** Длинный текст в выпадающем списке (в кнопке — `label`). */
  menuLabel?: string;
};

type FormDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: FormDropdownOption[];
  placeholder: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  className?: string;
  /** Значение «не выбрано» — для подсветки и placeholder */
  inactiveValue?: string;
  /** Не добавлять отдельный пункт сброса — все варианты в options */
  hideClearOption?: boolean;
};

function ChevronDown() {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 1.5L6 6.5L11 1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FormDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  ariaLabel,
  id: idProp,
  className,
  inactiveValue = "",
  hideClearOption = false,
}: FormDropdownProps) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selected = options.find((option) => option.value === value);
  const isInactive = value === inactiveValue;
  const displayLabel =
    selected?.label ?? (isInactive ? placeholder : value || placeholder);
  const isActive = !isInactive && Boolean(value || selected);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function selectOption(next: string) {
    onChange(next);
    setIsOpen(false);
  }

  const showClearRow = !hideClearOption;

  return (
    <div
      ref={rootRef}
      className={`form-dropdown${isOpen ? " is-open" : ""}${
        disabled ? " is-disabled" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        id={inputId}
        className={`form-dropdown__trigger${isActive ? " is-active" : ""}`}
        onClick={() => {
          if (!disabled) setIsOpen((open) => !open);
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
      >
        <span
          className={`form-dropdown__value${
            isActive ? "" : " is-placeholder"
          }`}
        >
          {displayLabel}
        </span>
        <span className="form-dropdown__chevron" aria-hidden="true">
          <ChevronDown />
        </span>
      </button>

      {isOpen && !disabled && (
        <ul className="form-dropdown__menu" id={listboxId} role="listbox">
          {showClearRow && (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={isInactive}
                className={`form-dropdown__option${
                  isInactive ? " is-active" : ""
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(inactiveValue)}
              >
                {placeholder}
              </button>
            </li>
          )}
          {options
            .filter(
              (option) =>
                !showClearRow || option.value !== inactiveValue
            )
            .map((option) => (
              <li key={`${option.value}-${option.label}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`form-dropdown__option${
                    option.value === value ? " is-active" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option.value)}
                >
                  {option.menuLabel ?? option.label}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
