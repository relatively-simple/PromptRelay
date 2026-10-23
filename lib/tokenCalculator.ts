import type { OutputFormat, TokenEstimationResult } from "../types/index.ts";
import * as mammoth from "mammoth";

// Format Multipliers
export const FORMAT_MULTIPLIERS: Record<OutputFormat, number> = {
  "Markdown / Text": 1.0,
  "Code / Zip": 1.3,
  "PDF Document": 1.4,
  "PowerPoint / Slides": 1.5,
};

const BASE_COST_CREDITS = 20;

/**
 * Parses and extracts text content from a given File entirely on the client side
 */
export async function extractTextFromFile(file: File): Promise<{
  text: string;
  isBinaryOrFallback: boolean;
}> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  // 1. Plain Text / Code / Markdown / Structured Data
  const textExtensions = [
    "txt",
    "md",
    "markdown",
    "csv",
    "json",
    "py",
    "js",
    "ts",
    "tsx",
    "jsx",
    "c",
    "cpp",
    "h",
    "hpp",
    "java",
    "rs",
    "go",
    "html",
    "css",
    "scss",
    "xml",
    "yaml",
    "yml",
    "sql",
    "sh",
    "bash",
    "env",
    "ini",
    "toml",
  ];

  if (textExtensions.includes(extension) || file.type.startsWith("text/")) {
    try {
      const text = await file.text();
      return { text, isBinaryOrFallback: false };
    } catch (e) {
      console.warn("Failed to read text file:", e);
    }
  }

  // 2. DOCX Word Documents via Mammoth
  if (
    extension === "docx" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { text: result.value || "", isBinaryOrFallback: false };
    } catch (e) {
      console.warn("Failed to extract text from docx:", e);
    }
  }

  // 3. PDF Files via pdfjs-dist
  if (extension === "pdf" || file.type === "application/pdf") {
    try {
      if (typeof window !== "undefined") {
        const pdfjs = await import("pdfjs-dist");
        // Use CDN worker to avoid webpack worker thread bundler issues
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => (item && "str" in item ? (item as { str: string }).str : ""))
            .filter(Boolean)
            .join(" ");
          fullText += pageText + "\n";
        }
        return { text: fullText, isBinaryOrFallback: false };
      }
    } catch (e) {
      console.warn("Failed to extract text from pdf:", e);
    }
  }

  // 4. Binary/Images or unparsed files fallback: fixed 1,000 tokens
  return { text: "", isBinaryOrFallback: true };
}

/**
 * Calculates estimated tokens for a given string (1 token ~ 4 characters)
 */
export function estimateTokensFromText(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculates total tokens and fair pricing breakdown for a prompt and file list
 */
export async function calculateTaskPricing(
  prompt: string,
  files: File[],
  outputFormat: OutputFormat,
  tipCredits: number = 0
): Promise<TokenEstimationResult> {
  const promptTokens = estimateTokensFromText(prompt);

  const fileTokens: TokenEstimationResult["fileTokens"] = [];
  let totalFileTokens = 0;

  for (const file of files) {
    const { text, isBinaryOrFallback } = await extractTextFromFile(file);

    let tokens = 0;
    if (isBinaryOrFallback) {
      // 1,000 tokens for image/binary
      tokens = 1000;
    } else {
      tokens = estimateTokensFromText(text);
      // Guarantee at least 1 token if text was present
      if (text.length > 0 && tokens === 0) tokens = 1;
    }

    totalFileTokens += tokens;
    fileTokens.push({
      name: file.name,
      size: file.size,
      tokens,
      type: file.type || "unknown",
    });
  }

  const totalTokens = promptTokens + totalFileTokens;

  // Pricing rules:
  // Base Cost = 20 credits
  // Token Cost = Math.ceil(totalTokens / 1000) * 2 credits
  // Multiplier depends on Output Format
  const multiplier = FORMAT_MULTIPLIERS[outputFormat] || 1.0;
  const tokenCost = Math.ceil(totalTokens / 1000) * 2;
  const basePlusToken = BASE_COST_CREDITS + tokenCost;
  const rawRecommended = Math.ceil(basePlusToken * multiplier);
  const safeTip = Math.max(0, Number.isFinite(tipCredits) ? tipCredits : 0);
  const recommendedCredits = Math.max(20, rawRecommended + safeTip);

  return {
    totalTokens,
    promptTokens,
    fileTokens,
    baseCost: BASE_COST_CREDITS,
    tokenCost,
    multiplier,
    recommendedCredits,
  };
}
