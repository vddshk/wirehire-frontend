"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthField, AuthInput } from "@/components/auth/AuthField";
import {
  PasswordConfirmFields,
  passwordsAreValid,
} from "@/components/auth/PasswordConfirmFields";
import { RegisterLayout } from "@/components/auth/RegisterLayout";
import { PersonalDataConsentField } from "@/components/auth/PersonalDataConsentField";
import { FormDropdown } from "@/components/FormDropdown";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { registerCompany } from "@/lib/api/session";
import {
  COMPANY_LEGAL_FORM_REGISTRATION_OPTIONS,
  type CompanyLegalForm,
  extractCompanyBrandName,
  formatCompanyLegalName,
  validateCompanyBrandName,
} from "@/lib/utils/companyLegalForm";
import { validateEmail, validateFullName } from "@/lib/validation";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [legalForm, setLegalForm] = useState<CompanyLegalForm>("ooo");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [companyNameTouched, setCompanyNameTouched] = useState(false);
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personalDataConsent, setPersonalDataConsent] = useState(false);

  const companyNameError = companyNameTouched
    ? validateCompanyBrandName(companyName)
    : null;
  const brandName = useMemo(
    () => extractCompanyBrandName(companyName),
    [companyName]
  );
  const legalPreview = brandName
    ? formatCompanyLegalName(brandName, legalForm)
    : "";

  const legalFormHint =
    legalForm === "ip"
      ? "Для ИП укажите ФИО предпринимателя или торговое имя"
      : "Укажите название без префикса ОПФ и кавычек";

  const fullNameError = fullNameTouched
    ? validateFullName(fullName, { emptyMessage: "Укажите имя и фамилию" })
    : null;
  const emailError = emailTouched ? validateEmail(email) : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    setCompanyNameTouched(true);
    setFullNameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);
    setPasswordConfirmTouched(true);

    if (
      validateCompanyBrandName(companyName) ||
      validateFullName(fullName) !== null ||
      validateEmail(email) !== null ||
      !passwordsAreValid(password, passwordConfirm) ||
      !personalDataConsent
    ) {
      return;
    }

    const brand = extractCompanyBrandName(companyName);
    const publicName = formatCompanyLegalName(brand, legalForm);

    setIsSubmitting(true);
    try {
      await registerCompany({
        fullName: fullName.trim(),
        email: email.trim(),
        companyBrandName: brand,
        companyLegalForm: legalForm,
        companyName: publicName,
        password,
        passwordConfirmation: passwordConfirm,
      });
      router.replace("/dashboard?company_registered=1");
    } catch (err) {
      setServerError(
        getErrorText(err, "Не удалось создать кабинет, попробуйте еще раз")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RegisterLayout
      activeTab="company"
      wide
      title={
        <>
          Кабинет <em>компании</em>
        </>
      }
      subtitle="Регистрация для HR и hiring manager. Кабинет откроется сразу, полный доступ — после модерации."
      aside={
        <>
          <p className="auth-aside__title">Как это работает</p>
          <ol className="auth-aside__steps">
            <li>
              <strong>ОПФ и бренд</strong>
              <span>Выберите форму (ООО, ИП, АО) — соберем полное имя</span>
            </li>
            <li>
              <strong>Сразу в работу</strong>
              <span>Можно настроить компанию и готовить вакансии</span>
            </li>
            <li>
              <strong>Модерация</strong>
              <span>Администратор проверит документы и снимет ограничения</span>
            </li>
          </ol>
          <div className="auth-callout">
            До подтверждения публикация вакансий и часть функций будут недоступны.
          </div>
        </>
      }
    >
      {serverError && (
        <div className="placeholder auth-error">{serverError}</div>
      )}

      <form className="auth-form-grid" onSubmit={handleSubmit}>
        <section className="auth-form-section">
          <h2 className="auth-form-section__title">Компания</h2>

          <AuthField label="Организационно-правовая форма">
            <FormDropdown
              value={legalForm}
              onChange={(value) => setLegalForm(value as CompanyLegalForm)}
              options={COMPANY_LEGAL_FORM_REGISTRATION_OPTIONS.map((item) => ({
                value: item.value,
                label: item.short,
                menuLabel: item.label,
              }))}
              placeholder="Выберите форму"
              hideClearOption
              className="form-dropdown--field auth-legal-form-dropdown"
            />
          </AuthField>

          <AuthField
            label="Название / бренд"
            error={companyNameError}
            hint={!companyNameError ? legalFormHint : undefined}
          >
            <AuthInput
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              onBlur={() => setCompanyNameTouched(true)}
              placeholder={legalForm === "ip" ? "Иванов Иван Иванович" : "TechCorp"}
              autoComplete="organization"
            />
          </AuthField>

          {legalPreview && !companyNameError && (
            <div className="auth-preview-card" aria-live="polite">
              <span className="auth-preview-card__label">В системе</span>
              <strong>{legalPreview}</strong>
            </div>
          )}
        </section>

        <section className="auth-form-section">
          <h2 className="auth-form-section__title">Контакт</h2>

          <AuthField label="Имя и фамилия" error={fullNameError}>
            <AuthInput
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              onBlur={() => setFullNameTouched(true)}
              placeholder="Анна Иванова"
              autoComplete="name"
            />
          </AuthField>

          <AuthField label="Корпоративный email" error={emailError}>
            <AuthInput
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              type="email"
              placeholder="hr@company.com"
              autoComplete="email"
            />
          </AuthField>
        </section>

        <section className="auth-form-section">
          <h2 className="auth-form-section__title">Доступ</h2>

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
          id="company-personal-data-consent"
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
            {isSubmitting ? "Создаем…" : "Создать кабинет →"}
          </button>
        </div>
      </form>
    </RegisterLayout>
  );
}
