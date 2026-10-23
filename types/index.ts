export type TaskStatus =
  | "open"
  | "locked"
  | "submitted"
  | "revision_requested"
  | "completed"
  | "cancelled";

export type TargetModel =
  | "Claude 3.7 Sonnet"
  | "OpenAI o3"
  | "ChatGPT Pro (o1 / o3)"
  | "DeepSeek R1"
  | "Gemini 2.0 Pro"
  | "Grok 3 (Think Mode)"
  | "GPT-4.5 / 4o";

export type OutputFormat =
  | "Markdown / Text"
  | "Code / Zip"
  | "PDF Document"
  | "PowerPoint / Slides";

export interface DriveFile {
  name: string;
  size: number;
  mimeType: string;
  driveFileId: string;
  downloadUrl: string;
  viewUrl: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  credits_balance: number;
  total_earned: number;
  tasks_completed: number;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  requester_id: string;
  worker_id: string | null;
  title: string;
  prompt_text: string;
  target_model: TargetModel;
  output_format: OutputFormat;
  estimated_tokens: number;
  reward_credits: number;
  status: TaskStatus;
  locked_until: string | null;
  source_files: DriveFile[];
  deliverable_files: DriveFile[];
  deliverable_notes: string | null;
  proof_share_url: string | null;
  revision_prompt: string | null;
  revision_used: boolean;
  created_at: string;
  updated_at?: string;
  // joined fields
  requester?: Profile;
  worker?: Profile;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  task_id: string | null;
  amount: number;
  transaction_type:
    | "signup_bonus"
    | "escrow_lock"
    | "task_payout"
    | "escrow_refund"
    | "credit_topup";
  description?: string;
  created_at: string;
}

export interface TokenEstimationResult {
  totalTokens: number;
  promptTokens: number;
  fileTokens: {
    name: string;
    size: number;
    tokens: number;
    type: string;
  }[];
  baseCost: number;
  tokenCost: number;
  multiplier: number;
  recommendedCredits: number;
}
