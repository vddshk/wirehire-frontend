import type { Metadata } from "next";
import "./tailwind.css";
import "./globals.scss";
import { AppShell } from "@/components/AppShell";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "WireHire",
  description: "Платформа проверки кандидатов",
  themeColor: "#0d0d0d",
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: "/brand-mark.svg",
  },
  appleWebApp: {
    capable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <ClientProviders>
          <AppShell>{children}</AppShell>
        </ClientProviders>
      </body>
    </html>
  );
}
