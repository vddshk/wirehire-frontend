"use client";

// Profile-report в карточке кандидата; отдельный раздел «Отчеты» убран.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentRole } from "@/lib/api/session";

export default function ReportsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    const role = getCurrentRole();
    router.replace(
      role === "candidate" ? "/candidate/dashboard" : "/candidates"
    );
  }, [router]);
  return null;
}
