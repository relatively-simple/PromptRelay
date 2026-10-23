"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { TargetModel, OutputFormat, DriveFile } from "@/types";
import {
  calculateTaskPricing,
  extractTextFromFile,
  estimateTokensFromText,
  FORMAT_MULTIPLIERS,
} from "@/lib/tokenCalculator";
import { uploadFileToUserDrive } from "@/lib/googleDrive";
import { TopUpModal } from "@/components/TopUpModal";
import {
  UploadCloud,
  FileText,
  FileCode,
  Presentation,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  HelpCircle,
  ExternalLink,
  HardDrive,
  Info,
} from "lucide-react";

interface UploadingFileState {
  id: string;
  file: File;
  name: string;
  size: number;
  tokens: number;
  progress: number;
  driveData?: DriveFile;
  error?: string;
  isParsing: boolean;
}

export default function PostTaskPage() {
  const router = useRouter();
  const { user, providerToken, createTask, topUpCredits, signInWithGoogle } = useApp();

  const [title, setTitle] = useState("");
  const [targetModel, setTargetModel] = useState<TargetModel>("Claude 3.7 Sonnet");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("Markdown / Text");
  const [promptText, setPromptText] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [tipCredits, setTipCredits] = useState<number>(0);

  const [filesState, setFilesState] = useState<UploadingFileState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Token & Pricing Calculation
  const promptTokens = estimateTokensFromText(promptText);
  const filesTokens = filesState.reduce((sum, f) => sum + (f.tokens || 0), 0);
  const totalTokens = promptTokens + filesTokens;

  // Base 20 + Math.ceil(totalTokens / 1000) * 2
  const tokenCost = Math.ceil(totalTokens / 1000) * 2;
  const baseCost = 20;
  const multiplier = FORMAT_MULTIPLIERS[outputFormat] || 1.0;
  const baseReward = Math.ceil((baseCost + tokenCost) * multiplier);
  const totalRequiredCredits = baseReward + tipCredits;

  const currentBalance = user?.credits_balance ?? 0;
  const hasSufficientCredits = currentBalance >= totalRequiredCredits;
  const areAllFilesUploaded =
    filesState.length === 0 ||
    filesState.every((f) => f.driveData && !f.isParsing && !f.error);

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFiles(Array.from(e.target.files));
    }
  };

  const handleIncomingFiles = async (newFiles: File[]) => {
    const fileEntries = newFiles.map((file) => ({
      id: "file-" + Math.random().toString(36).substring(2, 9),
      file,
    }));

    const initialStates: UploadingFileState[] = fileEntries.map(({ id, file }) => ({
      id,
      file,
      name: file.name,
      size: file.size,
      tokens: 0,
      progress: 10,
      isParsing: true,
    }));

    setFilesState((prev) => [...prev, ...initialStates]);

    await Promise.all(
      fileEntries.map(async ({ id: fileId, file }) => {
        try {
          const { text, isBinaryOrFallback } = await extractTextFromFile(file);
          const tokens = isBinaryOrFallback
            ? 1000
            : Math.max(1, estimateTokensFromText(text));

          setFilesState((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, tokens, isParsing: false, progress: 25 } : f
            )
          );

          // 2. Invisible Google Drive direct upload
          const driveResult = await uploadFileToUserDrive(
            file,
            providerToken,
            (pct) => {
              setFilesState((prev) =>
                prev.map((f) =>
                  f.id === fileId ? { ...f, progress: Math.max(25, pct) } : f
                )
              );
            }
          );

          setFilesState((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    progress: 100,
                    driveData: driveResult,
                  }
                : f
            )
          );
        } catch (err: any) {
          console.error("File processing error:", err);
          setFilesState((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    isParsing: false,
                    error: err.message || "Upload failed",
                  }
                : f
            )
          );
        }
      })
    );
  };

  const removeFile = (id: string) => {
    setFilesState((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage("Please sign in with Google to post this task.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter a descriptive task title.");
      return;
    }

    if (!promptText.trim()) {
      setErrorMessage("Please provide the prompt or instructions for the AI.");
      return;
    }

    if (!privacyAgreed) {
      setErrorMessage("Please confirm that these files contain no confidential or sensitive credentials.");
      return;
    }

    if (!hasSufficientCredits) {
      setErrorMessage(`Insufficient credits. You need ${totalRequiredCredits} credits, but have ${currentBalance}.`);
      setTopUpModalOpen(true);
      return;
    }

    if (!areAllFilesUploaded) {
      setErrorMessage("Please wait for all source files to finish uploading to Google Drive.");
      return;
    }

    try {
      setIsSubmitting(true);

      const source_files: DriveFile[] = filesState
        .map((f) => f.driveData)
        .filter((d): d is DriveFile => Boolean(d));

      const newTask = await createTask({
        title: title.trim(),
        prompt_text: promptText.trim(),
        target_model: targetModel,
        output_format: outputFormat,
        estimated_tokens: totalTokens,
        reward_credits: totalRequiredCredits,
        source_files,
      });

      router.push(`/tasks/${newTask.id}`);
    } catch (err: any) {
      console.error("Task creation failed:", err);
      setErrorMessage(err.message || "Failed to create task with escrow.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <span className="text-white font-medium">Post a Task</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-2">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ask for a Job to be Done</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Post an AI Task / Ask for a Job
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Specify your prompt instructions, attach large context files (saved invisibly in your personal Google Drive), and lock your escrow reward.
        </p>
      </div>

      {!user && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Sign in with Google to post tasks, count document tokens, and lock escrow.</span>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 shrink-0"
          >
            Sign In with Google
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Task Details & Files */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Title & Model */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-md space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Task Title
              </label>
              <input
                type="text"
                placeholder="e.g. Audit React 19 State Management in 40-Page Architecture PDF"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target AI Model */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Target AI Model
                </label>
                <select
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value as TargetModel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet (Hybrid Reasoning & Extended Thinking)</option>
                  <option value="OpenAI o3">OpenAI o3 (Frontier Agentic Coding & Deep Logic)</option>
                  <option value="ChatGPT Pro (o1 / o3)">ChatGPT Pro (Uncapped High-Compute Reasoning)</option>
                  <option value="DeepSeek R1">DeepSeek R1 (Open-Weight Mathematical Reasoning)</option>
                  <option value="Gemini 2.0 Pro">Gemini 2.0 Pro (Multimodal 2M Context & Thinking)</option>
                  <option value="Grok 3 (Think Mode)">Grok 3 (xAI Colossus Think Mode & Realtime)</option>
                  <option value="GPT-4.5 / 4o">GPT-4.5 / 4o (Omni Multimodal Flagship)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Worker must provide share link verifying execution on this exact model.
                </span>
              </div>

              {/* Expected Output Format */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Deliverable Format
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Markdown / Text">Markdown / Text (1.0x price)</option>
                  <option value="Code / Zip">Code / Zip Archive (1.3x price)</option>
                  <option value="PDF Document">PDF Document (1.4x price)</option>
                  <option value="PowerPoint / Slides">PowerPoint / Slides (1.5x price)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Multiplier reflects effort required for complex artifacts.
                </span>
              </div>
            </div>
          </div>

          {/* Card: Prompt Editor */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Detailed AI Prompt & Requirements
              </label>
              <span className="text-xs text-indigo-400 font-mono">
                {promptTokens} prompt tokens (~{promptText.length} chars)
              </span>
            </div>
            <textarea
              rows={7}
              placeholder="Paste your exact prompt, instructions, step-by-step questions, or constraints for the AI model..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono leading-relaxed"
            />

            {/* Privacy Checkbox */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
              <input
                type="checkbox"
                id="privacyNotice"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label
                htmlFor="privacyNotice"
                className="text-xs text-slate-300 cursor-pointer leading-relaxed select-none"
              >
                <span className="text-amber-400 font-semibold">Privacy Confirmation:</span> I confirm that these prompt instructions and attached files do not contain passwords, API keys, private seed phrases, or sensitive personal identifiable data.
              </label>
            </div>
          </div>

          {/* Card: Drag & Drop Google Drive Direct Uploader */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                  Attach Source Files (Invisibly Saved to your Google Drive)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Parsed client-side with PDF.js and Mammoth. Direct browser-to-Drive upload using OAuth drive.file scope.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {filesTokens} file tokens
              </span>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mx-auto transition" />
              <div className="mt-2 text-xs font-semibold text-white">
                Drag and drop files here, or <span className="text-indigo-400 underline">browse</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Supports .pdf, .docx, .txt, .md, .csv, .json, .py, .ts, .zip, and images
              </p>
            </div>

            {/* Attached Files List */}
            {filesState.length > 0 && (
              <div className="space-y-2 mt-4">
                {filesState.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate max-w-xs">
                          {f.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{(f.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="text-amber-400 font-mono">
                            {f.isParsing ? "Calculating tokens..." : `${f.tokens} tokens`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {f.progress < 100 && !f.error ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                          <span className="text-[10px] text-slate-400 font-mono">
                            {f.progress}%
                          </span>
                        </div>
                      ) : f.error ? (
                        <span className="text-[10px] text-rose-400">{f.error}</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready on Drive
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live Pricing Breakdown & Submit */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl sticky top-24">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              Live Fair Price Estimation
            </h3>

            {/* Token Breakdown */}
            <div className="space-y-2.5 pb-4 border-b border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Prompt Tokens</span>
                <span className="font-mono text-slate-200">{promptTokens}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Source File Tokens</span>
                <span className="font-mono text-slate-200">{filesTokens}</span>
              </div>
              <div className="flex justify-between text-slate-300 font-semibold pt-1">
                <span>Total Context</span>
                <span className="font-mono text-indigo-300">
                  {totalTokens} tokens (~{(totalTokens / 1000).toFixed(1)}k)
                </span>
              </div>
            </div>

            {/* Formula Breakdown */}
            <div className="py-4 border-b border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Base Platform Escrow</span>
                <span className="font-mono text-slate-200">20 credits</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Token Multiplier</span>
                <span className="font-mono text-slate-200">{tokenCost} credits</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Deliverable Format ({outputFormat})</span>
                <span className="font-mono text-slate-200">{multiplier.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between text-slate-300 font-semibold pt-1">
                <span>Calculated Base Bounty</span>
                <span className="font-mono text-amber-400">{baseReward} credits</span>
              </div>
            </div>

            {/* Optional Bounty Tip */}
            <div className="py-4 border-b border-slate-800">
              <label className="text-xs font-semibold text-slate-400 block mb-2">
                Tip Extra Credits (Faster Worker Pickup):
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 15, 30, 50].map((tip) => (
                  <button
                    key={tip}
                    type="button"
                    onClick={() => setTipCredits(tip)}
                    className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition ${
                      tipCredits === tip
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    +{tip}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Required & Balance */}
            <div className="py-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
                  Total Required Escrow
                </span>
                <div className="text-2xl font-extrabold text-amber-400 flex items-center gap-1 font-mono">
                  <span>⚡ {totalRequiredCredits}</span>
                  <span className="text-xs font-normal text-slate-400">
                    (~${((totalRequiredCredits * 0.5) / 100).toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Your Balance:</span>
                <span
                  className={`font-bold font-mono ${
                    hasSufficientCredits ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {currentBalance} credits
                </span>
              </div>

              {!hasSufficientCredits && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                  <span>Need {totalRequiredCredits - currentBalance} more credits</span>
                  <button
                    type="button"
                    onClick={() => setTopUpModalOpen(true)}
                    className="font-bold underline text-white hover:text-amber-300"
                  >
                    Top Up Now
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !hasSufficientCredits ||
                !privacyAgreed ||
                !title.trim() ||
                !promptText.trim() ||
                !areAllFilesUploaded
              }
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking Escrow & Posting Task...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Lock Credits & Post Task</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-500 text-center mt-3 leading-relaxed">
              Credits are held in Supabase escrow until you inspect the worker&apos;s model proof share link and approve deliverables.
            </p>
          </div>
        </div>
      </form>

      <TopUpModal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
      />
    </div>
  );
}
