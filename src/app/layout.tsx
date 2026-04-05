import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppFooter } from "@/components/appFooter";
import { TopNav } from "@/components/topNav";
import { APP_NAME, APP_TAGLINE } from "@/constants/app";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen flex flex-col`}
      >
        <TopNav />
        <div className="flex-1">{children}</div>
        <AppFooter />
      </body>
    </html>
  );
}
