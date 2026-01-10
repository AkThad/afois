import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AFOIS - Federal Opportunity Intelligence",
  description: "AI-Powered Bid/No-Bid Analysis",
};

import Nav from "@/components/Dashboard/Nav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const APP_VERSION = "V1.012"; // Copy-friendly ingestion reports

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background selection:bg-blue-500/30 selection:text-blue-200`}
        suppressHydrationWarning
      >
        <Nav />
        {children}
        <footer className="fixed bottom-2 right-2 text-xs text-gray-500/50">
          {APP_VERSION}
        </footer>
      </body>
    </html>
  );
}
