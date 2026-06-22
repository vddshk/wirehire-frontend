import { AuthField, AuthInput } from "@/components/auth/AuthField";
import {
  validatePassword,
  validatePasswordConfirm,
} from "@/lib/validation";

type PasswordConfirmFieldsProps = {
  password: string;
  passwordConfirm: string;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  passwordTouched: boolean;
  passwordConfirmTouched: boolean;
  onPasswordBlur: () => void;
  onPasswordConfirmBlur: () => void;
};

export function PasswordConfirmFields({
  password,
  passwordConfirm,
  onPasswordChange,
  onPasswordConfirmChange,
  passwordTouched,
  passwordConfirmTouched,
  onPasswordBlur,
  onPasswordConfirmBlur,
}: PasswordConfirmFieldsProps) {
  const showConfirmCheck =
    passwordConfirmTouched || passwordConfirm.length > 0;

  const passwordError = passwordTouched
    ? validatePassword(password)
    : null;
  const passwordConfirmError = showConfirmCheck
    ? validatePasswordConfirm(password, passwordConfirm)
    : null;

  function handlePasswordChange(value: string) {
    onPasswordChange(value);
  }

  return (
    <div className="auth-password-fields">
      <AuthField
        label="Пароль"
        error={passwordError}
        hint={!passwordError ? "Минимум 8 символов" : undefined}
      >
        <AuthInput
          value={password}
          onChange={(event) => handlePasswordChange(event.target.value)}
          onBlur={onPasswordBlur}
          type="password"
          name="password"
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </AuthField>

      <AuthField
        label="Повторите пароль"
        error={passwordConfirmError}
        hint={
          !passwordConfirmError && passwordConfirm.length > 0
            ? "Должен совпадать с паролем выше"
            : undefined
        }
      >
        <AuthInput
          value={passwordConfirm}
          onChange={(event) => onPasswordConfirmChange(event.target.value)}
          onBlur={onPasswordConfirmBlur}
          type="password"
          name="password_confirmation"
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </AuthField>
    </div>
  );
}

export function passwordsAreValid(password: string, passwordConfirm: string) {
  return (
    validatePassword(password) === null &&
    validatePasswordConfirm(password, passwordConfirm) === null
  );
}
