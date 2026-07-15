import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoTestAI — AI Quality Engineering Platform",
  description:
    "Agentic multi-agent platform for autonomous software testing, root cause analysis, automated program repair, and continuous validation using RAG and Knowledge Graphs.",
  keywords: [
    "AutoTestAI",
    "AI Testing",
    "Automated Program Repair",
    "RAG",
    "Knowledge Graph",
    "Software Quality",
    "Multi-Agent",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#09090B] text-[#F9FAFB] antialiased">
        <div className="ambient-bg" />
        {children}
      </body>
    </html>
  );
}
