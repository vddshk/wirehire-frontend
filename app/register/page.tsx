"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthField, AuthInput } from "@/components/auth/AuthField";
import {
  PasswordConfirmFields,
  passwordsAreValid,
} from "@/components/auth/PasswordConfirmFields";
import { RegisterLayout } from "@/components/auth/RegisterLayout";
import { PersonalDataConsentField } from "@/components/auth/PersonalDataConsentField";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { registerCandidate } from "@/lib/api/session";
import { validateEmail, validateFullName } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personalDataConsent, setPersonalDataConsent] = useState(false);

  const fullNameError = fullNameTouched ? validateFullName(fullName) : null;
  const emailError = emailTouched ? validateEmail(email) : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    setFullNameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);
    setPasswordConfirmTouched(true);

    if (
      validateFullName(fullName) !== null ||
      validateEmail(email) !== null ||
      !passwordsAreValid(password, passwordConfirm) ||
      !personalDataConsent
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await registerCandidate({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        passwordConfirmation: passwordConfirm,
      });
      router.replace("/candidate/consents?welcome=1");
    } catch (err) {
      setServerError(
        getErrorText(err, "Не удалось создать аккаунт, попробуйте еще раз")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RegisterLayout
      activeTab="candidate"
      title={
        <>
          Аккаунт <em>кандидата</em>
        </>
      }
      subtitle="Профиль, AI-оценка навыков и отклики на вакансии."
    >
      {serverError && (
        <div className="placeholder auth-error">{serverError}</div>
      )}

      <form className="auth-form-grid" onSubmit={handleSubmit}>
        <section className="auth-form-section">
          <AuthField label="Имя и фамилия" error={fullNameError}>
            <AuthInput
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              onBlur={() => setFullNameTouched(true)}
              placeholder="Никита Орлов"
              autoComplete="name"
            />
          </AuthField>

          <AuthField label="Email" error={emailError}>
            <AuthInput
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              type="email"
              placeholder="user@example.com"
              autoComplete="email"
            />
          </AuthField>
        </section>

        <section className="auth-form-section">
          <PasswordConfirmFields
            password={password}
            passwordConfirm={passwordConfirm}
            onPasswordChange={setPassword}
            onPasswordConfirmChange={setPasswordConfirm}
            passwordTouched={passwordTouched}
            passwordConfirmTouched={passwordConfirmTouched}
            onPasswordBlur={() => setPasswordTouched(true)}
            onPasswordConfirmBlur={() => setPasswordConfirmTouched(true)}
          />
        </section>

        <PersonalDataConsentField
          checked={personalDataConsent}
          onChange={setPersonalDataConsent}
        />

        <div className="auth-actions auth-actions--register">
          <Link href="/login" className="btn">
            Уже есть аккаунт
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !personalDataConsent}
          >
            {isSubmitting ? "Создаем…" : "Создать аккаунт →"}
          </button>
        </div>
      </form>
    </RegisterLayout>
  );
}
