"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthField, AuthInput } from "@/components/auth/AuthField";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { loginWithEmail } from "@/lib/api/session";
import { UserRole } from "@/types/user";
import { validateEmail } from "@/lib/validation";

const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  candidate: "/candidate/dashboard",
  hr: "/dashboard",
  hiring_manager: "/dashboard",
  admin: "/audit",
  reference_provider: "/",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailError = emailTouched ? validateEmail(email) : null;
  const passwordError = passwordTouched && !password ? "Укажите пароль" : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    setEmailTouched(true);
    setPasswordTouched(true);

    const emailBad = validateEmail(email) !== null;
    const passwordBad = !password;
    if (emailBad || passwordBad) {
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await loginWithEmail({
        email: email.trim(),
        password,
      });
      if (!user) {
        setServerError("Не удалось войти, проверьте email и пароль");
        return;
      }
      router.replace(DASHBOARD_BY_ROLE[user.role]);
    } catch (err) {
      setServerError(
        getErrorText(err, "Не удалось подключиться к серверу, попробуйте еще раз")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <header className="auth-topbar">
        <Link href="/" className="brand">
          <span className="logo">WireHire</span>
        </Link>
        <Link href="/register" className="auth-link">
          Нет аккаунта? Зарегистрироваться →
        </Link>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          <h1 className="h-display auth-title">
            Войти <em>в WireHire</em>
          </h1>

          {serverError && (
            <div className="placeholder auth-error">{serverError}</div>
          )}

          <form className="auth-form-grid" onSubmit={handleSubmit}>
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

            <AuthField label="Пароль" error={passwordError}>
              <AuthInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setPasswordTouched(true)}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </AuthField>

            <div className="auth-actions">
              <Link href="/register" className="btn">
                Создать аккаунт
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Входим…" : "Войти →"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
