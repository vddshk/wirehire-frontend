"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
