import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import SessionProvider from "@/components/SessionProvider";
import { TRPCProvider } from "@/components/TRPCProvider";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payroll Pro - Gestion de paie",
  description: "Application SaaS de gestion de paie",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider>
            <TRPCProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </TRPCProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
