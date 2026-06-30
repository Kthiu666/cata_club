import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Cata Club Admin";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Cata Club — Table tennis (Tenis de Mesa) club administration system. Manage memberships, payments, schedules, and court reservations.",
  icons: {
    icon: "/brand/cata-club-logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-cata-cream bg-subtle-dot font-sans text-cata-charcoal antialiased">
        <Header />
        <main className="mx-auto max-w-8xl px-4 py-10 sm:px-8 lg:px-12">
          {children}
        </main>
      </body>
    </html>
  );
}
