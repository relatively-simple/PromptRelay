"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  FileText,
  Clock,
  Sparkles,
  Bot,
  Coins,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Lock,
  Layers,
  FileCode,
  Presentation,
  Check,
  PlusCircle,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useApp();

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_65%)] pointer-events-none" />
        <div className="absolute top-1/4 right-5 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Human-in-the-Loop AI Quota Arbitrage</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
            Run Pro AI Models on Demand. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              Or Monetize Your Idle Quota.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Need a 40-page PDF analyzed by <strong>Claude 3.7 Sonnet</strong> or complex logic solved by <strong>OpenAI o3 or DeepSeek R1</strong>? Stop paying $200+/month in subscriptions. Outsource heavy prompts to active subscribers with 100% escrow protection.
          </p>

          {/* Hero Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            {user ? (
              <>
                <Link
                  href="/marketplace"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
                >
                  Go to Task Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/post-task"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  Ask for a Job (Post Task)
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={signInWithGoogle}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  Sign In with Google (500 Starter Credits)
                </button>

                <Link
                  href="/marketplace"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Browse Doable Tasks
                </Link>
              </>
            )}
          </div>

          {/* Trust Guarantees */}
          <div className="mt-10 pt-8 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span>100% Escrow Protection</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <span>Client Google Drive Storage</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span>30-Min Exclusivity Lock</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Proof-of-Model Verification</span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Sided Value Proposition: Requester vs Subscriber */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              How the Marketplace Works
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Engineered for Both Requesters & Subscribers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Requesters */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 uppercase tracking-wider mb-2">
                  For Requesters (Ask for a Job)
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Need a heavy prompt run on Claude 3.7, OpenAI o3, or DeepSeek R1?
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Don&apos;t pay $20–$200/month across multiple platforms just to run occasional large prompts, analyze code repositories, or convert PDFs into presentations.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Client-Side Token Extraction:</strong> PDFs and Word documents parsed in your browser with zero latency.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Your Own Google Drive:</strong> Large source files stay in your Google Drive via direct OAuth.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Proof-of-Model Verification:</strong> Inspect the official Claude, ChatGPT, DeepSeek, Gemini, or Grok share link before releasing escrow.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>1 Follow-Up Revision:</strong> If minor tweaks are needed, request a revision before approving.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <Link
                  href="/post-task"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20"
                >
                  Post a Task (Ask for a Job)
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: Workers */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                  <Coins className="w-6 h-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 uppercase tracking-wider mb-2">
                  For Subscribers (Do a Job & Earn)
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Have an active AI subscription with unused quota?
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Your ChatGPT Plus/Pro, Claude Pro, DeepSeek, or Grok message limits reset periodically. Monetize your idle message quota during your work downtime.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>30-Minute Exclusivity Lock:</strong> Lock a task exclusively for 30 minutes while running the prompt.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>One-Click Workflow:</strong> Copy prompt in one click, download source files, drop them in your model tab.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>90% Net Payout:</strong> Keep 90% of the locked escrow bounty credited directly to your balance.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Seamless Google Drive Delivery:</strong> Upload generated code or slides directly from your browser.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <Link
                  href="/marketplace"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
                >
                  Explore Doable Tasks (Earn Credits)
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Execution Workflow */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Simple & Safe
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              The 3-Step Escrow Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Protected by atomic PostgreSQL transactions in Supabase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-extrabold text-sm flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-base text-white">Post & Lock Escrow</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The Requester drafts the prompt and attaches files. Pricing is calculated transparently based on token volume, and credits are securely locked in escrow.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-base text-white">Claim & Execute (30m)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A Worker claims the task, locking it for 30 minutes. They run the prompt on frontier models like Claude 3.7 Sonnet, OpenAI o3, or DeepSeek R1, upload the output files, and submit the share link.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-extrabold text-sm flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-base text-white">Verify & Payout</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The Requester verifies the AI share link to confirm model integrity, downloads deliverables, and releases the credits. The Worker receives 90% payout instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Zero Infrastructure Cost Advantage Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/20 via-slate-900 to-purple-950/20">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <HardDrive className="w-3.5 h-3.5" />
            Zero-Cost Infrastructure Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Why PromptRelay Charges 0 Hosting Markups
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            By storing task files directly in users&apos; personal Google Drives and parsing tokens client-side via WebAssembly PDF.js and Mammoth, PromptRelay incurs $0 cloud file hosting expenses.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              ✓ Client Browser Token Counting
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              ✓ Direct OAuth drive.file Scope
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              ✓ Atomic PostgreSQL Escrow
            </span>
          </div>
        </div>
      </section>

      {/* Bottom Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to Outsource Heavy Prompts or Monetize Your Daily Quota?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Sign up in seconds with Google. Every new account receives 500 free test credits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {user ? (
              <>
                <Link
                  href="/marketplace"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
                >
                  Go to Task Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/post-task"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  Ask for a Job (Post Task)
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={signInWithGoogle}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  Sign In with Google (500 Starter Credits)
                </button>

                <Link
                  href="/marketplace"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Browse Doable Tasks
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
        PromptRelay © 2026 • AI Subscription Arbitrage & Task Marketplace • Zero-Cost Cloud Infrastructure
      </footer>
    </div>
  );
}
