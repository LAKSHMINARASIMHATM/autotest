import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "AutoTestAI — AI Quality Engineering Platform",
  description:
    "Agentic multi-agent platform for autonomous software testing, root cause analysis, automated program repair, and continuous validation using Knowledge Graphs.",
  keywords: [
    "AutoTestAI",
    "AI Testing",
    "Automated Program Repair",
    "Knowledge Graph",
    "Software Quality",
    "Multi-Agent",
  ],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased bg-black text-white selection:bg-white/20 selection:text-white" style={{ backgroundColor: "#000000", color: "var(--color-text-primary)" }}>
        <ThemeProvider>
          <AuthProvider>
            <div className="ambient-bg" />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
