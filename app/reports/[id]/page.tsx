"use client";

// Старые ссылки /reports/{id} → profile-report в карточке кандидата.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentRole } from "@/lib/api/session";

export default function ReportRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    const role = getCurrentRole();
    router.replace(
      role === "candidate" ? "/candidate/dashboard" : "/candidates"
    );
  }, [router]);
  return null;
}
