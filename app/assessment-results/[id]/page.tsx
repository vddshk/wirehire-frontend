"use client";

// Старый мок-экран результатов assessment заменен страницей проверки
// /assessments/[runId] и отчетом внутри проверки. Перенаправляем в кабинет кандидата.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssessmentResultsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/candidate/dashboard");
  }, [router]);
  return null;
}
