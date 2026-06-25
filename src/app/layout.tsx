import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { DbInitializer } from "@/components/DbInitializer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { APP_DESCRIPTION, BRAND_COLORS, COMPANY_NAME, COMPANY_SHORT_NAME } from "@/lib/branding";
import "./globals.css";

export const metadata: Metadata = {
  title: COMPANY_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: COMPANY_SHORT_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLORS.navy,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <DbInitializer>
          <ServiceWorkerRegister />
          <AppShell>{children}</AppShell>
        </DbInitializer>
      </body>
    </html>
  );
}
