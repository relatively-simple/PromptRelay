"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { TargetModel, OutputFormat } from "@/types";
import {
  Search,
  Zap,
  Bot,
  FileCode,
  FileText,
  Presentation,
  FileUp,
  Clock,
  ArrowRight,
  PlusCircle,
  Lock,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function MarketplacePage() {
  const { tasks, user } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("All");
  const [selectedFormat, setSelectedFormat] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"reward" | "tokens" | "newest">("reward");

  const models: (TargetModel | "All")[] = [
    "All",
    "Claude 3.7 Sonnet",
    "OpenAI o3",
    "ChatGPT Pro (o1 / o3)",
    "DeepSeek R1",
    "Gemini 2.0 Pro",
    "Grok 3 (Think Mode)",
    "GPT-4.5 / 4o",
  ];

  const formats: (OutputFormat | "All")[] = [
    "All",
    "Markdown / Text",
    "Code / Zip",
    "PDF Document",
    "PowerPoint / Slides",
  ];

  // Filter tasks: include open tasks and claimable tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const isExpiredLock =
          task.status === "locked" &&
          task.locked_until &&
          new Date(task.locked_until).getTime() < Date.now();

        const isOpenOrAvailable =
          task.status === "open" ||
          isExpiredLock ||
          task.status === "locked" ||
          task.status === "submitted";

        if (!isOpenOrAvailable) return false;

        if (selectedModel !== "All" && task.target_model !== selectedModel) {
          return false;
        }

        if (selectedFormat !== "All" && task.output_format !== selectedFormat) {
          return false;
        }

        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchPrompt = task.prompt_text.toLowerCase().includes(q);
          if (!matchTitle && !matchPrompt) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "reward") {
          return b.reward_credits - a.reward_credits;
        }
        if (sortBy === "tokens") {
          return a.estimated_tokens - b.estimated_tokens;
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [tasks, selectedModel, selectedFormat, searchQuery, sortBy]);

  const activeOpenCount = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.status === "open" ||
        (t.status === "locked" &&
          t.locked_until &&
          new Date(t.locked_until).getTime() < Date.now())
    ).length;
  }, [tasks]);

  const getModelBadge = (model: string) => {
    if (model.includes("Claude")) {
      return "bg-orange-500/10 text-orange-400 border-orange-500/30";
    }
    if (model.includes("OpenAI") || model.includes("ChatGPT")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
    if (model.includes("DeepSeek")) {
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    }
    if (model.includes("Gemini")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
    if (model.includes("Grok")) {
      return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30";
    }
    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "Code / Zip":
        return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
      case "PDF Document":
        return <FileText className="w-3.5 h-3.5 text-rose-400" />;
      case "PowerPoint / Slides":
        return <Presentation className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* Clean Dashboard Top Bar (No Promo Fluff) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Doable Tasks
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {activeOpenCount} Available
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Claim open prompt tasks, execute them in your AI subscription, and submit deliverables.
          </p>
        </div>

        {/* Task Posting Button: Asking for a job to be done */}
        <Link
          href="/post-task"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ask for a Job (Post Task)</span>
        </Link>
      </div>

      {/* Compact Quick Guidelines Chips */}
      <div className="my-5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>30-Minute Exclusive Lock per Claim</span>
        </span>
        <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Requires Claude or ChatGPT Share Link</span>
        </span>
        <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Instant Wallet Payout upon Approval</span>
        </span>
      </div>

      {/* Search & Sort Row */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search doable tasks by prompt, keywords, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 shrink-0">
            Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="reward">Highest Payout (⚡)</option>
            <option value="tokens">Lowest Token Count (Fastest)</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Model & Format Filters */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Model Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
            Model:
          </span>
          {models.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedModel(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedModel === m
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Format Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
            Format:
          </span>
          {formats.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFormat(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedFormat === f
                  ? "bg-slate-700 text-white font-semibold"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Task Grid */}
      <div className="mt-6">
        {filteredTasks.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {tasks.length === 0 ? "The Task Board is Ready" : "No Matching Tasks Found"}
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              {tasks.length === 0
                ? "No prompt tasks are currently in the queue. Need a heavy prompt run on Claude 3.7 Sonnet, OpenAI o3, or DeepSeek R1? Post the first job to the marketplace!"
                : "No tasks matched your active search or filters. Try resetting the model and format filters to see all available tasks."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/post-task"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/20"
              >
                <PlusCircle className="w-4 h-4" />
                Ask for a Job (Post Task)
              </Link>
              {tasks.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedModel("All");
                    setSelectedFormat("All");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => {
              const netWorkerPayout = Math.floor(task.reward_credits * 0.9);
              const isLockedExpired =
                task.status === "locked" &&
                task.locked_until &&
                new Date(task.locked_until).getTime() < Date.now();
              const isClaimable = task.status === "open" || isLockedExpired;

              return (
                <div
                  key={task.id}
                  className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition shadow-lg flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getModelBadge(
                          task.target_model
                        )}`}
                      >
                        {task.target_model}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isClaimable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Available
                          </span>
                        ) : task.status === "locked" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Locked (30m)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {task.status.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm text-white line-clamp-2 group-hover:text-indigo-300 transition leading-snug">
                      {task.title}
                    </h3>

                    {/* Prompt Preview */}
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {task.prompt_text}
                    </p>

                    {/* Metadata Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-800">
                        {getFormatIcon(task.output_format)}
                        <span>{task.output_format}</span>
                      </div>

                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-800">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>
                          {(task.estimated_tokens / 1000).toFixed(1)}k tokens
                        </span>
                      </div>

                      {task.source_files && task.source_files.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-800">
                          <FileUp className="w-3 h-3 text-slate-400" />
                          <span>{task.source_files.length} files</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Payout & CTA */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        Worker Payout
                      </div>
                      <div className="text-base font-extrabold text-emerald-400 flex items-center gap-1 font-mono">
                        <Zap className="w-4 h-4 fill-emerald-400" />
                        <span>{netWorkerPayout}</span>
                        <span className="text-xs font-normal text-slate-400">
                          Credits (~${((netWorkerPayout * 0.5) / 100).toFixed(2)})
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/tasks/${task.id}`}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                        isClaimable
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {isClaimable ? "Claim & Do Job" : "View Task"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
