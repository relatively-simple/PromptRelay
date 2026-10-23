"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Task, DriveFile } from "@/types";
import { uploadFileToUserDrive } from "@/lib/googleDrive";
import {
  Clock,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  FileCode,
  Presentation,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Sparkles,
  Zap,
  HardDrive,
  UploadCloud,
  Loader2,
  Trash2,
  UserCheck,
  RefreshCw,
  Send,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

export default function TaskWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const {
    user,
    providerToken,
    getTaskById,
    claimTask,
    submitDeliverable,
    requestRevision,
    approveTask,
    cancelTask,
    signInWithGoogle,
    loading,
  } = useApp();

  const [task, setTask] = useState<Task | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [deliverableNotes, setDeliverableNotes] = useState("");
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  // Deliverable file uploading state
  const [uploadedFiles, setUploadedFiles] = useState<
    {
      id: string;
      name: string;
      size: number;
      progress: number;
      data?: DriveFile;
      error?: string;
    }[]
  >([]);

  const [isClaiming, setIsClaiming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingRev, setIsRequestingRev] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 30-Minute Countdown Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch / Sync task
  useEffect(() => {
    const found = getTaskById(taskId);
    if (found) {
      setTask(found);
      if (found.proof_share_url) setProofUrl(found.proof_share_url);
      if (found.deliverable_notes) setDeliverableNotes(found.deliverable_notes);
    }
  }, [taskId, getTaskById]);

  // Handle countdown timer when task is locked
  useEffect(() => {
    if (!task?.locked_until || task.status !== "locked") {
      setTimeLeftSeconds(null);
      return;
    }

    const updateTimer = () => {
      const remainingMs = new Date(task.locked_until!).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeftSeconds(0);
      } else {
        setTimeLeftSeconds(Math.floor(remainingMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [task?.locked_until, task?.status]);

  if (!task) {
    if (loading) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white">Loading Task Workspace...</h2>
          <p className="text-xs text-slate-400 mt-1">Retrieving task details and escrow state...</p>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-sm">
          <AlertCircle className="w-7 h-7 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Task Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">
          The task you are looking for does not exist, was cancelled, or you don&apos;t have permission to view it.
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition shadow-lg shadow-indigo-600/20"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Task Board
        </Link>
      </div>
    );
  }

  // Perspective determination
  const isRequester = Boolean(user && user.id === task.requester_id);
  const isWorker = Boolean(user && user.id === task.worker_id);
  const isExpiredLock =
    (task.status === "locked" || task.status === "revision_requested") &&
    task.locked_until &&
    new Date(task.locked_until).getTime() < Date.now();
  const isClaimable = task.status === "open" || (task.status === "locked" && isExpiredLock);
  const canRequesterCancel =
    isRequester &&
    (task.status === "open" ||
      ((task.status === "locked" || task.status === "revision_requested") && isExpiredLock));

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(task.prompt_text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCancelTask = async () => {
    if (!task) return;
    try {
      setIsCancelling(true);
      setStatusMsg(null);
      const updated = await cancelTask(task.id);
      setTask(updated);
      setStatusMsg({ type: "success", text: "Task cancelled and escrow credits refunded to your wallet." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to cancel task." });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClaim = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (user.id === task.requester_id) {
      setStatusMsg({ type: "error", text: "You cannot claim your own task." });
      return;
    }
    try {
      setIsClaiming(true);
      setStatusMsg(null);
      const updated = await claimTask(task.id);
      setTask(updated);
      setStatusMsg({
        type: "success",
        text: "Task locked! You have 30 minutes of exclusive access to complete it.",
      });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to claim task" });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDeliverableDrop = async (files: File[]) => {
    const fileEntries = files.map((file) => ({
      id: "deliv-" + Math.random().toString(36).substring(2, 8),
      file,
    }));

    setUploadedFiles((prev) => [
      ...prev,
      ...fileEntries.map(({ id, file }) => ({
        id,
        name: file.name,
        size: file.size,
        progress: 15,
      })),
    ]);

    await Promise.all(
      fileEntries.map(async ({ id: fileId, file }) => {
        try {
          const result = await uploadFileToUserDrive(
            file,
            providerToken,
            (pct) => {
              setUploadedFiles((prev) =>
                prev.map((f) => (f.id === fileId ? { ...f, progress: pct } : f))
              );
            }
          );

          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    progress: 100,
                    data: result,
                  }
                : f
            )
          );
        } catch (err: any) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, error: err.message || "Upload failed" }
                : f
            )
          );
        }
      })
    );
  };

  const handleDeliverableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const validProof =
      proofUrl.startsWith("https://claude.ai/share/") ||
      proofUrl.startsWith("https://chatgpt.com/share/") ||
      proofUrl.startsWith("https://chat.deepseek.com/share/") ||
      proofUrl.startsWith("https://gemini.google.com/share/") ||
      proofUrl.startsWith("https://grok.com/share/") ||
      proofUrl.startsWith("https://x.com/i/grok/");

    if (!validProof) {
      setStatusMsg({
        type: "error",
        text: "Proof-of-Model link must start with https://claude.ai/share/, https://chatgpt.com/share/, https://chat.deepseek.com/share/, https://gemini.google.com/share/, or https://grok.com/share/",
      });
      return;
    }

    const filesToSubmit: DriveFile[] = uploadedFiles
      .map((f) => f.data)
      .filter((d): d is DriveFile => Boolean(d));

    try {
      setIsSubmitting(true);
      const updated = await submitDeliverable(
        task.id,
        filesToSubmit,
        proofUrl.trim(),
        deliverableNotes.trim()
      );
      setTask(updated);
      setStatusMsg({
        type: "success",
        text: "Deliverable successfully submitted for Requester review!",
      });
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to submit deliverable",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setStatusMsg(null);
      const updated = await approveTask(task.id);
      setTask(updated);
      setStatusMsg({
        type: "success",
        text: "Task approved! Escrow released: 90% payout credited to the Worker.",
      });
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to approve task",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestRevisionSubmit = async () => {
    if (!revisionPrompt.trim()) return;
    try {
      setIsRequestingRev(true);
      setStatusMsg(null);
      const updated = await requestRevision(task.id, revisionPrompt.trim());
      setTask(updated);
      setShowRevisionModal(false);
      setStatusMsg({
        type: "success",
        text: "Revision requested. Worker has been notified to make adjustments.",
      });
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to request revision",
      });
    } finally {
      setIsRequestingRev(false);
    }
  };

  const netWorkerPayout = Math.floor(task.reward_credits * 0.9);
  const platformFee = task.reward_credits - netWorkerPayout;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Navigation & Status Stepper */}
      <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Task Board</span>
          </Link>
          <span className="text-slate-600">•</span>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Home
          </Link>
        </div>
      </div>

      {/* Status Stepper Bar */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Task Stage:</span>
          <span
            className={`px-2.5 py-1 rounded-lg font-bold text-xs uppercase tracking-wider ${
              task.status === "completed"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : task.status === "submitted"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : task.status === "revision_requested"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : task.status === "locked"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}
          >
            {task.status.replace("_", " ")}
          </span>
        </div>

        {/* 15-Min Timer Countdown Pill */}
        {task.status === "locked" && timeLeftSeconds !== null && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${
              timeLeftSeconds > 180
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Lock Expires: {formatTimer(timeLeftSeconds)}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Escrow Bounty:</span>
          <span className="text-amber-400 font-extrabold text-sm flex items-center gap-1 font-mono">
            ⚡ {task.reward_credits} Credits
          </span>
          <span className="text-[11px] text-slate-500">
            (~${((task.reward_credits * 0.5) / 100).toFixed(2)})
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mt-4 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3 ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Task Specs, Prompt & Source Files */}
        <div className="lg:col-span-7 space-y-6">
          {/* Title & Metadata */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-md space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Target: {task.target_model}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Format: {task.output_format}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-amber-400 bg-slate-950 border border-slate-800">
                ⚡ {(task.estimated_tokens / 1000).toFixed(1)}k tokens
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
              {task.title}
            </h1>

            <div className="text-xs text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <span>Posted by:</span>
              <span className="text-white font-semibold">
                {task.requester?.full_name || "Requester"}
              </span>
              <span>•</span>
              <span>{new Date(task.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* AI Prompt Section with One-Click Copy */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Prompt Instructions (Run in {task.target_model})
              </h3>
              <button
                onClick={copyPromptToClipboard}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Prompt!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>One-Click Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {task.prompt_text}
            </div>

            {/* Revision Prompt Notice if Revision Requested */}
            {task.revision_prompt && (
              <div className="mt-4 p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Requester Revision Request:</span>
                </div>
                <div className="text-xs text-purple-100 font-mono whitespace-pre-wrap bg-purple-950/60 p-3 rounded-xl border border-purple-800">
                  {task.revision_prompt}
                </div>
              </div>
            )}
          </div>

          {/* Attached Source Files Card */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              Source Context Files ({task.source_files?.length || 0})
            </h3>
            <p className="text-xs text-slate-400">
              Download and attach these source files to Claude/ChatGPT prompt window. Files are served directly from the Requester&apos;s Google Drive.
            </p>

            {(!task.source_files || task.source_files.length === 0) ? (
              <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-xl border border-slate-800">
                No external files attached. The prompt instructions contain all necessary context.
              </div>
            ) : (
              <div className="space-y-2.5">
                {task.source_files.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-sm">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB • {file.mimeType}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={file.name}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      {file.viewUrl && (
                        <a
                          href={file.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="View on Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Dynamic Execution & Review Workspace */}
        <div className="lg:col-span-5 space-y-6">
          {/* Worker Payout Summary Box */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Financial Escrow Breakdown
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                100% Escrow Protected
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Escrow Locked:</span>
                <span className="font-mono text-white">⚡ {task.reward_credits} cr</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Platform Operational Fee (10%):</span>
                <span className="font-mono text-slate-500">-{platformFee} cr</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline font-bold">
                <span className="text-emerald-400">Net Worker Payout (90%):</span>
                <div className="text-right">
                  <div className="text-xl text-emerald-400 font-mono">
                    ⚡ {netWorkerPayout} cr
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    ~${((netWorkerPayout * 0.5) / 100).toFixed(2)} USD
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION STATE A: Task is Open / Claimable */}
            {isClaimable && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleClaim}
                  disabled={isClaiming || Boolean(user && user.id === task.requester_id)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isClaiming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>
                    {!user
                      ? "Sign In with Google to Claim"
                      : user.id === task.requester_id
                      ? "You are the Requester"
                      : "Claim & Lock Task (30:00)"}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  {!user
                    ? "Sign in with Google to claim this task and earn the 90% escrow payout."
                    : user.id === task.requester_id
                    ? "You posted this task. Another active subscriber with quota can claim and complete it."
                    : "Locking reserves this task exclusively for your account for 30 minutes while you run the prompt and prepare the deliverable."}
                </p>
                {canRequesterCancel && (
                  <button
                    onClick={handleCancelTask}
                    disabled={isCancelling}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center justify-center gap-1.5"
                  >
                    {isCancelling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Cancel Task & Refund Escrow</span>
                  </button>
                )}
              </div>
            )}

            {/* ACTION STATE B: Task is Locked */}
            {(task.status === "locked" || task.status === "revision_requested") && (
              isWorker ? (
                <div className="space-y-5 pt-2 border-t border-slate-800">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Step 1: Run in your AI Subscription
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Open {task.target_model}, paste the prompt, attach the files, and generate the required {task.output_format}.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <a
                      href="https://claude.ai"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-semibold flex items-center gap-1"
                    >
                      Claude 3.7 <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://chatgpt.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1"
                    >
                      ChatGPT (o3/Pro) <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://chat.deepseek.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold flex items-center gap-1"
                    >
                      DeepSeek R1 <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://gemini.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1"
                    >
                      Gemini 2.0 <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://grok.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[10px] font-semibold flex items-center gap-1"
                    >
                      Grok 3 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Form to submit deliverable */}
                <form onSubmit={handleDeliverableSubmit} className="space-y-4">
                  <div className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Step 2: Proof & Deliverable Upload
                  </div>

                  {/* Proof Share Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Proof-of-Model Share Link (Required)
                    </label>
                    <input
                      type="url"
                      placeholder="https://claude.ai/share/... or https://chatgpt.com/share/..."
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Must be a valid public share link from Claude or ChatGPT confirming the model used.
                    </span>
                  </div>

                  {/* Deliverable File Dropzone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Upload Deliverable Files ({task.output_format})
                    </label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files) {
                          handleDeliverableDrop(Array.from(e.dataTransfer.files));
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleDeliverableDrop(Array.from(e.target.files));
                          }
                        }}
                      />
                      <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mx-auto transition" />
                      <div className="text-xs text-white font-medium mt-1">
                        Click or drag deliverable files here
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Saved invisibly into your Google Drive
                      </div>
                    </div>

                    {/* Deliverable Upload List */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {uploadedFiles.map((f) => (
                          <div
                            key={f.id}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <span className="truncate max-w-[180px] text-slate-300">
                              {f.name}
                            </span>
                            {f.progress < 100 && !f.error ? (
                              <span className="text-[10px] text-amber-400 font-mono">
                                Uploading {f.progress}%...
                              </span>
                            ) : f.error ? (
                              <span className="text-[10px] text-rose-400">{f.error}</span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Worker Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Deliverable Notes / Comments
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Generated with Claude 3.7 Sonnet / OpenAI o3. Added executive summary and verified code compiles clean..."
                      value={deliverableNotes}
                      onChange={(e) => setDeliverableNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !proofUrl.trim()}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Submit Deliverable for Review</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-sm text-white">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Task In Progress
                </div>
                <p className="text-slate-300 leading-relaxed">
                  This task is currently claimed by a subscriber who is running the prompt on {task.target_model}.
                </p>
                {timeLeftSeconds !== null && (
                  <div className="text-[11px] font-mono text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg inline-block">
                    {formatTimer(timeLeftSeconds)} remaining on exclusivity lock
                  </div>
                )}
                {canRequesterCancel && (
                  <button
                    onClick={handleCancelTask}
                    disabled={isCancelling}
                    className="w-full mt-2 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center justify-center gap-1.5"
                  >
                    {isCancelling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Exclusivity Expired — Cancel & Refund</span>
                  </button>
                )}
              </div>
            ))}

            {/* ACTION STATE C: Deliverables Submitted - Requester Review View */}
            {task.status === "submitted" && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Worker Deliverable Ready
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {task.worker?.full_name || "Assigned Worker"}
                    </span>
                  </div>

                  {/* Clickable Proof Share Link */}
                  {task.proof_share_url && (
                    <a
                      href={task.proof_share_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 hover:border-indigo-400 flex items-center justify-between text-xs transition group"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-indigo-300">
                          Verify AI Chat Log (Proof Link)
                        </span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                    </a>
                  )}

                  {/* Worker Deliverable Files */}
                  {task.deliverable_files && task.deliverable_files.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Deliverable Files:
                      </div>
                      {task.deliverable_files.map((dFile, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <span className="truncate max-w-[180px] text-slate-200 font-medium">
                            {dFile.name}
                          </span>
                          <a
                            href={dFile.downloadUrl}
                            download={dFile.name}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Worker Notes */}
                  {task.deliverable_notes && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Worker Notes:
                      </span>
                      {task.deliverable_notes}
                    </div>
                  )}
                </div>

                {/* Requester Action Buttons */}
                {isRequester ? (
                  <div className="space-y-2">
                    <button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      {isApproving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span>Approve Deliverable & Release Credits</span>
                    </button>

                    <button
                      onClick={() => setShowRevisionModal(true)}
                      disabled={task.revision_used}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {task.revision_used
                          ? "Revision Limit Used (1/1)"
                          : "Request 1 Follow-Up Revision"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    Awaiting deliverable review and escrow release from the Requester.
                  </div>
                )}
              </div>
            )}

            {/* ACTION STATE D: Completed Celebration */}
            {task.status === "completed" && (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Task Completed & Payout Released
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Escrow released. Worker received {netWorkerPayout} credits.
                  </p>
                </div>

                {task.proof_share_url && (
                  <a
                    href={task.proof_share_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 underline font-semibold"
                  >
                    View Verified Chat Log <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revision Request Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-400" />
                Request 1 Follow-Up Revision
              </h3>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Describe the specific refinement, correction, or adjustment needed. Each task permits exactly 1 revision request.
            </p>
            <textarea
              rows={4}
              placeholder="e.g. Please expand section 3 with detailed TypeScript code examples and fix slide 5 formatting..."
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRevisionSubmit}
                disabled={isRequestingRev || !revisionPrompt.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isRequestingRev ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Submit Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
