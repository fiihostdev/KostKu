import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { KostProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "KOSTKU - Multi-Tenant SaaS Platform",
  description: "Platform Manajemen Kost & Properti Modern Multi-Tenant",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-sans min-h-screen bg-surface text-on-surface antialiased overflow-x-hidden">
        <KostProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </KostProvider>
      </body>
    </html>
  );
}
