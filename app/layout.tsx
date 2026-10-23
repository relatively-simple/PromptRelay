import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PromptRelay | AI Subscription Arbitrage & Task Marketplace",
  description:
    "Human-in-the-Loop AI Task Marketplace connecting heavy model prompt requirements (Claude 3.7 Sonnet, OpenAI o3, DeepSeek R1, Grok 3) with active subscriber capacity at $0 infrastructure cost.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200`}>
        <AppProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
