import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sizzling Aroma — Products Monitoring", template: "%s · Sizzling Aroma" },
  description: "Restaurant products monitoring system for Sizzling Aroma — Fried Chicken & Crispy Pata.",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#FF5A1F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ className: "!rounded-3xl !font-sans !font-semibold" }}
        />
      </body>
    </html>
  );
}
