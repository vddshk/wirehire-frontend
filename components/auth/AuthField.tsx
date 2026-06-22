import type { InputHTMLAttributes, ReactNode } from "react";

type AuthFieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
};

export function AuthField({ label, hint, error, children }: AuthFieldProps) {
  return (
    <div className="auth-field">
      <label className="auth-field__label">{label}</label>
      {children}
      {error ? (
        <span className="auth-field__error">{error}</span>
      ) : hint ? (
        <span className="auth-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

type AuthInputProps = InputHTMLAttributes<HTMLInputElement>;

export function AuthInput({ className, ...props }: AuthInputProps) {
  return (
    <input
      {...props}
      className={className ? `auth-input ${className}` : "auth-input"}
    />
  );
}
