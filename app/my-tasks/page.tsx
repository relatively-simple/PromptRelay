"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  FileText,
  FileCheck2,
  Zap,
  ArrowRight,
  Clock,
  History,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function MyTasksPage() {
  const { user, tasks, transactions, cancelTask } = useApp();
  const [activeTab, setActiveTab] = useState<"posted" | "claimed" | "ledger">(
    "posted"
  );
  const [cancelStatus, setCancelStatus] = useState<string | null>(null);

  const postedTasks = tasks.filter((t) => t.requester_id === user?.id);
  const claimedTasks = tasks.filter((t) => t.worker_id === user?.id);

  const handleCancelTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to cancel this task and refund all escrow credits?")) {
      return;
    }
    try {
      await cancelTask(taskId);
      setCancelStatus("Task cancelled and escrow credits refunded to your balance!");
      setTimeout(() => setCancelStatus(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to cancel task");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-white transition">
          Home
        </Link>
        <span className="text-slate-600">/</span>
        <Link href="/marketplace" className="hover:text-white transition">
          Task Board
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-white font-medium">My Tasks</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-2">
            <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Task Management & Financial Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Tasks & Submissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track tasks you requested, review deliverables, manage claimed work, and inspect your escrow transactions.
          </p>
        </div>

        <Link
          href="/post-task"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition self-start md:self-auto shadow-md shadow-indigo-600/20"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>Post New Task</span>
        </Link>
      </div>

      {cancelStatus && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{cancelStatus}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Credits in Wallet
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1 flex items-baseline gap-1">
            <span>⚡ {user?.credits_balance ?? 0}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ~${(((user?.credits_balance ?? 0) * 0.5) / 100).toFixed(2)} USD
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tasks Posted
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            {postedTasks.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            As Requester
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tasks Worked
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">
            {claimedTasks.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Completed / Claimed
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Earned
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-400 mt-1">
            ⚡ {user?.total_earned ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            From worker payouts
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 mb-6">
        <button
          onClick={() => setActiveTab("posted")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === "posted"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Tasks Posted ({postedTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("claimed")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === "claimed"
              ? "border-emerald-500 text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>Tasks Claimed & Worked ({claimedTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === "ledger"
              ? "border-amber-500 text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4 text-amber-400" />
          <span>Escrow & Credit Ledger</span>
        </button>
      </div>

      {/* TAB 1: Tasks Posted */}
      {activeTab === "posted" && (
        <div className="space-y-4">
          {postedTasks.length === 0 ? (
            <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-white text-base">No tasks posted yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Need a pro model to run a large prompt or analyze a complex document? Post your first task in seconds.
              </p>
              <Link
                href="/post-task"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl transition"
              >
                Post a Task
              </Link>
            </div>
          ) : (
            postedTasks.map((t) => {
              const canCancel =
                t.status === "open" ||
                ((t.status === "locked" || t.status === "revision_requested") &&
                  t.locked_until &&
                  new Date(t.locked_until).getTime() < Date.now());

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {t.target_model}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {t.output_format}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          t.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : t.status === "submitted"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : t.status === "locked"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-white">
                      {t.title}
                    </h3>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>Escrow: ⚡ {t.reward_credits} cr</span>
                      <span>•</span>
                      <span>Tokens: {(t.estimated_tokens / 1000).toFixed(1)}k</span>
                      <span>•</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    {canCancel && (
                      <button
                        onClick={() => handleCancelTask(t.id)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Cancel & Refund
                      </button>
                    )}

                    <Link
                      href={`/tasks/${t.id}`}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      {t.status === "submitted" ? "Review Deliverable" : "Open Workspace"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Tasks Claimed & Worked */}
      {activeTab === "claimed" && (
        <div className="space-y-4">
          {claimedTasks.length === 0 ? (
            <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800">
              <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-white text-base">
                No claimed tasks yet
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Have an active Claude 3.7 Sonnet, OpenAI o3, or DeepSeek R1 subscription? Visit the marketplace to claim tasks and earn 90% net payouts.
              </p>
              <Link
                href="/marketplace"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl transition"
              >
                Browse Available Tasks
              </Link>
            </div>
          ) : (
            claimedTasks.map((t) => {
              const netPayout = Math.floor(t.reward_credits * 0.9);
              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        {t.target_model}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {t.output_format}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                        {t.status.replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-white">
                      {t.title}
                    </h3>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">
                        Net Payout: ⚡ {netPayout} credits (~${((netPayout * 0.5) / 100).toFixed(2)})
                      </span>
                      <span>•</span>
                      <span>Tokens: {(t.estimated_tokens / 1000).toFixed(1)}k</span>
                    </div>
                  </div>

                  <Link
                    href={`/tasks/${t.id}`}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition self-end md:self-center"
                  >
                    {t.status === "locked" ? "Work & Submit" : "View Details"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: Escrow & Credit Ledger */}
      {activeTab === "ledger" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Wallet Transaction History
              </h3>
              <p className="text-xs text-slate-400">
                Immutable ledger of all escrow locks, worker payouts, refunds, and top-ups.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Transactions</span>
              <span className="text-lg font-bold text-white font-mono">
                {transactions.length}
              </span>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No ledger entries recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {tx.description || tx.transaction_type}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(tx.created_at).toLocaleString()} •{" "}
                          <span className="capitalize">{tx.transaction_type.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-sm font-extrabold font-mono ${
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isPositive ? `+${tx.amount}` : tx.amount} credits
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
