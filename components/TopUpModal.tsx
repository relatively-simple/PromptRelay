"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  X,
  Zap,
  Sparkles,
  CreditCard,
  ShieldCheck,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Loader2,
} from "lucide-react";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TopUpModal({ isOpen, onClose }: TopUpModalProps) {
  const { user, topUpCredits, transactions } = useApp();
  const [activeTab, setActiveTab] = useState<"packs" | "history">("packs");
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTopUp = async (amount: number, label: string) => {
    try {
      setLoadingAmount(amount);
      await topUpCredits(amount);
      setSuccessMsg(`Successfully added ${amount} credits!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to top up credits");
    } finally {
      setLoadingAmount(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                PromptRelay Wallet & Escrow
              </h3>
              <p className="text-xs text-slate-400">
                100 Credits = $0.50 USD • Atomic escrow hold on task post
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Current Available Balance
            </span>
            <div className="text-2xl font-extrabold text-white flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <span>{user?.credits_balance ?? 0}</span>
              <span className="text-sm font-normal text-slate-400">
                (~${(((user?.credits_balance ?? 0) * 0.5) / 100).toFixed(2)} USD)
              </span>
            </div>
          </div>
          <div className="flex gap-1 p-1 bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab("packs")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === "packs"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Add Credits
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {successMsg}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === "packs" ? (
            <>
              {/* Free MVP Test Credits Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 relative overflow-hidden">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  MVP Developer Testing
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Instant 1-Click Starter Top-Up
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-sm">
                      Top up 500 test credits immediately to test posting large tasks, locking bounties, and running worker workflows.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTopUp(500, "MVP Test Credits")}
                    disabled={loadingAmount !== null}
                    className="shrink-0 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {loadingAmount === 500 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 fill-white" />
                    )}
                    +500 Free Credits
                  </button>
                </div>
              </div>

              {/* Commercial Packs */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Production Credit Packages (Dodo / Lemon Squeezy Ready)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Pack 1 */}
                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400">
                        Starter Pack
                      </div>
                      <div className="text-xl font-bold text-white mt-1">
                        1,000 <span className="text-xs font-normal text-slate-400">Credits</span>
                      </div>
                      <div className="text-sm font-semibold text-emerald-400 mt-1">
                        $5.00 USD
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Good for 10-15 standard Claude 3.7 Sonnet tasks.
                      </p>
                    </div>
                    <button
                      onClick={() => handleTopUp(1000, "Starter Pack")}
                      disabled={loadingAmount !== null}
                      className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {loadingAmount === 1000 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5" />
                      )}
                      Buy with Card
                    </button>
                  </div>

                  {/* Pack 2 - Featured */}
                  <div className="p-4 rounded-2xl bg-indigo-950/40 border-2 border-indigo-500/60 hover:border-indigo-400 transition flex flex-col justify-between relative shadow-lg shadow-indigo-950/50">
                    <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500 text-white uppercase tracking-wider">
                      Most Popular
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-indigo-300">
                        Pro Pack
                      </div>
                      <div className="text-xl font-bold text-white mt-1">
                        5,000 <span className="text-xs font-normal text-slate-400">Credits</span>
                      </div>
                      <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-2">
                        <span>$22.00 USD</span>
                        <span className="text-[10px] text-slate-400 line-through">$25.00</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-2">
                        Ideal for high-context Claude 3.7, OpenAI o3, and DeepSeek R1 tasks with large files.
                      </p>
                    </div>
                    <button
                      onClick={() => handleTopUp(5000, "Pro Pack")}
                      disabled={loadingAmount !== null}
                      className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                    >
                      {loadingAmount === 5000 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 fill-white" />
                      )}
                      Buy with Card
                    </button>
                  </div>

                  {/* Pack 3 */}
                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400">
                        Power Pack
                      </div>
                      <div className="text-xl font-bold text-white mt-1">
                        20,000 <span className="text-xs font-normal text-slate-400">Credits</span>
                      </div>
                      <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-2">
                        <span>$80.00 USD</span>
                        <span className="text-[10px] text-slate-400 line-through">$100.00</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Bulk volume for engineering teams and heavy researchers.
                      </p>
                    </div>
                    <button
                      onClick={() => handleTopUp(20000, "Power Pack")}
                      disabled={loadingAmount !== null}
                      className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {loadingAmount === 20000 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5" />
                      )}
                      Buy with Card
                    </button>
                  </div>
                </div>
              </div>

              {/* Escrow Guarantee Footer Note */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 leading-relaxed">
                  <span className="text-slate-200 font-semibold">100% Escrow Protection:</span> When you post a task, credits are safely locked in PostgreSQL escrow. Workers only receive the 90% payout when you verify the proof link and approve the deliverable.
                </div>
              </div>
            </>
          ) : (
            /* Transaction History Tab */
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No credit transactions recorded yet.
                </div>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
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
                          <div className="text-xs font-semibold text-white">
                            {tx.description || tx.transaction_type}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(tx.created_at).toLocaleString()} •{" "}
                            <span className="capitalize">{tx.transaction_type.replace("_", " ")}</span>
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${tx.amount}` : tx.amount} credits
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
