import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppFooter } from "@/components/appFooter";
import { TopNav } from "@/components/topNav";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Model Helper",
  description: "Modeling for the rest of us.",
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
