"use client";

type PersonalDataConsentFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
};

export function PersonalDataConsentField({
  checked,
  onChange,
  id = "personal-data-consent",
}: PersonalDataConsentFieldProps) {
  return (
    <label className="auth-consent" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="auth-consent__input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="auth-consent__box" aria-hidden />
      <span className="auth-consent__text">
        Даю согласие на{" "}
        <strong>обработку персональных данных</strong> для регистрации и работы
        в сервисе WireHire.
      </span>
    </label>
  );
}
