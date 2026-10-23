"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Profile, Task, CreditTransaction, DriveFile, TargetModel, OutputFormat } from "@/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { INITIAL_MOCK_TASKS, INITIAL_MOCK_TRANSACTIONS } from "@/lib/mockData";

interface AppContextType {
  user: Profile | null;
  providerToken: string | null;
  isRealSupabase: boolean;
  tasks: Task[];
  transactions: CreditTransaction[];
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  topUpCredits: (amount: number) => Promise<void>;
  createTask: (params: {
    title: string;
    prompt_text: string;
    target_model: TargetModel;
    output_format: OutputFormat;
    estimated_tokens: number;
    reward_credits: number;
    source_files: DriveFile[];
  }) => Promise<Task>;
  claimTask: (taskId: string) => Promise<Task>;
  submitDeliverable: (
    taskId: string,
    files: DriveFile[],
    proofUrl: string,
    notes?: string
  ) => Promise<Task>;
  requestRevision: (taskId: string, revisionPrompt: string) => Promise<Task>;
  approveTask: (taskId: string) => Promise<Task>;
  cancelTask: (taskId: string) => Promise<Task>;
  getTaskById: (id: string) => Task | undefined;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_TASKS_KEY = "promptrelay_mock_tasks_v2";
const LOCAL_STORAGE_TXS_KEY = "promptrelay_mock_txs_v2";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isRealSupabase, setIsRealSupabase] = useState<boolean>(false);
  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user]);

  // Clean up any legacy demo keys from earlier testing
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("promptrelay_demo_active");
      localStorage.removeItem("promptrelay_mock_user_role_v2");
    }
  }, []);

  // Initialize Auth & Supabase
  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsRealSupabase(configured);

    if (!configured) {
      initOfflineMode();
      return;
    }

    const client = createClient();
    setSupabase(client);
    if (!client) {
      initOfflineMode();
      return;
    }

    let authSubscription: { unsubscribe: () => void } | null = null;
    let channel: any = null;

    const setupAuthAndRealtime = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await client.auth.getSession();

        const currentUserId = session?.user?.id;
        userIdRef.current = currentUserId || null;

        if (session) {
          if (session.provider_token) {
            setProviderToken(session.provider_token);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("google_provider_token", session.provider_token);
            }
          } else if (typeof window !== "undefined") {
            const storedToken = sessionStorage.getItem("google_provider_token");
            if (storedToken) setProviderToken(storedToken);
          }

          await fetchUserProfile(client, session.user.id, session.user);
        } else {
          setUser(null);
        }

        await loadSupabaseData(client, currentUserId);

        // Listen for auth state changes
        const { data: authListener } = client.auth.onAuthStateChange(
          async (event: string, session: any) => {
            const newUserId = session?.user?.id;
            userIdRef.current = newUserId || null;
            if (session) {
              if (session.provider_token) {
                setProviderToken(session.provider_token);
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("google_provider_token", session.provider_token);
                }
              }
              await fetchUserProfile(client, session.user.id, session.user);
              await loadSupabaseData(client, newUserId);
            } else {
              setUser(null);
              setProviderToken(null);
              setTransactions([]);
            }
          }
        );
        authSubscription = authListener?.subscription ?? null;

        // Subscribe to Realtime tasks table changes
        channel = client
          .channel("public:tasks")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "tasks" },
            () => {
              loadSupabaseData(client, userIdRef.current || undefined);
            }
          )
          .subscribe();
      } catch (e) {
        console.error("Error initializing Supabase:", e);
        initOfflineMode();
      } finally {
        setLoading(false);
      }
    };

    setupAuthAndRealtime();

    return () => {
      authSubscription?.unsubscribe();
      if (channel) {
        client.removeChannel(channel);
      }
    };
  }, []);

  const fetchUserProfile = async (client: any, userId: string, authUser: any) => {
    const { data: profile } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profile) {
      setUser(profile);
    } else if (authUser) {
      // create profile with starter credits if trigger was delayed
      const fallbackProfile: Profile = {
        id: userId,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
        avatar_url: authUser.user_metadata?.avatar_url,
        credits_balance: 500,
        total_earned: 0,
        tasks_completed: 0,
        created_at: new Date().toISOString(),
      };
      await client.from("profiles").upsert(fallbackProfile);
      setUser(fallbackProfile);
    }
  };

  const loadSupabaseData = async (client: any, targetUserId?: string) => {
    const { data: taskData, error } = await client
      .from("tasks")
      .select("*, requester:requester_id(*), worker:worker_id(*)")
      .order("created_at", { ascending: false });

    if (!error && taskData) {
      setTasks(taskData);
    } else {
      setTasks([]);
    }

    const effectiveUserId = targetUserId || userIdRef.current || user?.id;
    if (effectiveUserId) {
      const { data: txData } = await client
        .from("credit_transactions")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (txData && txData.length > 0) {
        setTransactions(txData);
      }
    }
  };

  // Offline / Unconfigured fallback
  const initOfflineMode = () => {
    try {
      setUser(null);
      if (typeof window !== "undefined") {
        const savedTasks = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
        if (savedTasks) {
          try {
            setTasks(JSON.parse(savedTasks));
          } catch {
            setTasks([]);
          }
        } else {
          setTasks([]);
        }

        const savedTxs = localStorage.getItem(LOCAL_STORAGE_TXS_KEY);
        if (savedTxs) {
          try {
            setTransactions(JSON.parse(savedTxs));
          } catch {
            setTransactions([]);
          }
        } else {
          setTransactions([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (isRealSupabase && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/drive.file",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    } else {
      alert("Supabase authentication is not configured in .env.local. Please check your credentials.");
    }
  };

  const signOut = async () => {
    if (isRealSupabase && supabase) {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("google_provider_token");
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("promptrelay_demo_active");
      localStorage.removeItem("promptrelay_mock_user_role_v2");
      window.location.href = "/";
    }
    setUser(null);
    setProviderToken(null);
  };

  const topUpCredits = async (amount: number) => {
    if (!user) throw new Error("Must be logged in to top up credits");

    if (isRealSupabase && supabase) {
      const { data, error } = await supabase.rpc("topup_credits", {
        p_amount: amount,
      });
      if (error) throw error;
      setUser(data);
      await loadSupabaseData(supabase);
    } else {
      const updatedUser: Profile = {
        ...user,
        credits_balance: user.credits_balance + amount,
      };
      setUser(updatedUser);

      const newTx: CreditTransaction = {
        id: "tx-" + Date.now(),
        user_id: user.id,
        task_id: null,
        amount,
        transaction_type: "credit_topup",
        description: `Credits Top-Up (+${amount} credits)`,
        created_at: new Date().toISOString(),
      };

      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_TXS_KEY, JSON.stringify(updatedTxs));
      }
    }
  };

  const createTask = async (params: {
    title: string;
    prompt_text: string;
    target_model: TargetModel;
    output_format: OutputFormat;
    estimated_tokens: number;
    reward_credits: number;
    source_files: DriveFile[];
  }): Promise<Task> => {
    if (!user) throw new Error("Must be logged in to create a task");
    if (user.credits_balance < params.reward_credits) {
      throw new Error(`Insufficient credits. You have ${user.credits_balance} credits, but ${params.reward_credits} are required.`);
    }

    if (isRealSupabase && supabase) {
      const { data, error } = await supabase.rpc("create_task_with_escrow", {
        p_title: params.title,
        p_prompt_text: params.prompt_text,
        p_target_model: params.target_model,
        p_output_format: params.output_format,
        p_estimated_tokens: params.estimated_tokens,
        p_reward_credits: params.reward_credits,
        p_source_files: params.source_files,
      });

      if (error) throw error;
      await loadSupabaseData(supabase);
      await fetchUserProfile(supabase, user.id, null);
      return data;
    } else {
      const newTask: Task = {
        id: "task-" + Date.now(),
        requester_id: user.id,
        worker_id: null,
        title: params.title,
        prompt_text: params.prompt_text,
        target_model: params.target_model,
        output_format: params.output_format,
        estimated_tokens: params.estimated_tokens,
        reward_credits: params.reward_credits,
        status: "open",
        locked_until: null,
        source_files: params.source_files,
        deliverable_files: [],
        deliverable_notes: null,
        proof_share_url: null,
        revision_prompt: null,
        revision_used: false,
        created_at: new Date().toISOString(),
        requester: user,
      };

      const updatedUser: Profile = {
        ...user,
        credits_balance: user.credits_balance - params.reward_credits,
      };
      setUser(updatedUser);

      const newTx: CreditTransaction = {
        id: "tx-" + Date.now(),
        user_id: user.id,
        task_id: newTask.id,
        amount: -params.reward_credits,
        transaction_type: "escrow_lock",
        description: `Escrow locked for task: ${newTask.title}`,
        created_at: new Date().toISOString(),
      };

      const updatedTasks = [newTask, ...tasks];
      const updatedTxs = [newTx, ...transactions];

      setTasks(updatedTasks);
      setTransactions(updatedTxs);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedTasks));
        localStorage.setItem(LOCAL_STORAGE_TXS_KEY, JSON.stringify(updatedTxs));
      }

      return newTask;
    }
  };

  const claimTask = async (taskId: string): Promise<Task> => {
    if (!user) throw new Error("Must be logged in to claim a task");

    if (isRealSupabase && supabase) {
      const { data, error } = await supabase.rpc("claim_task", {
        p_task_id: taskId,
      });
      if (error) throw error;
      await loadSupabaseData(supabase);
      return data;
    } else {
      const targetIndex = tasks.findIndex((t) => t.id === taskId);
      if (targetIndex === -1) throw new Error("Task not found");

      const existing = tasks[targetIndex];
      if (existing.requester_id === user.id) {
        throw new Error("You cannot claim your own task");
      }

      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const updated: Task = {
        ...existing,
        worker_id: user.id,
        worker: user,
        status: "locked",
        locked_until: lockedUntil,
        updated_at: new Date().toISOString(),
      };

      const newTaskList = [...tasks];
      newTaskList[targetIndex] = updated;
      setTasks(newTaskList);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(newTaskList));
      }

      return updated;
    }
  };

  const submitDeliverable = async (
    taskId: string,
    files: DriveFile[],
    proofUrl: string,
    notes?: string
  ): Promise<Task> => {
    if (!user) throw new Error("Must be logged in to submit deliverables");

    const validSharePattern =
      /^https?:\/\/(claude\.ai\/share\/|chatgpt\.com\/share\/|chat\.deepseek\.com\/share\/|gemini\.google\.com\/share\/|grok\.com\/share\/|x\.com\/i\/grok\/)[a-zA-Z0-9_\-]+/;
    if (!validSharePattern.test(proofUrl.trim())) {
      throw new Error(
        "Proof link must be a valid public share URL from Claude (claude.ai/share/...), ChatGPT (chatgpt.com/share/...), DeepSeek (chat.deepseek.com/share/...), Gemini (gemini.google.com/share/...), or Grok (grok.com/share/ or x.com/i/grok/)."
      );
    }

    if (isRealSupabase && supabase) {
      const { data, error } = await supabase.rpc("submit_task_deliverable", {
        p_task_id: taskId,
        p_deliverable_files: files,
        p_proof_share_url: proofUrl,
        p_deliverable_notes: notes || null,
      });
      if (error) throw error;
      await loadSupabaseData(supabase);
      return data;
    } else {
      const targetIndex = tasks.findIndex((t) => t.id === taskId);
      if (targetIndex === -1) throw new Error("Task not found");

      const existing = tasks[targetIndex];
      const updated: Task = {
        ...existing,
        status: "submitted",
        deliverable_files: files,
        proof_share_url: proofUrl,
        deliverable_notes: notes || null,
        updated_at: new Date().toISOString(),
      };

      const newTaskList = [...tasks];
      newTaskList[targetIndex] = updated;
      setTasks(newTaskList);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(newTaskList));
      }

      return updated;
    }
  };

  const requestRevision = async (
    taskId: string,
    revisionPrompt: string
  ): Promise<Task> => {
    if (!user) throw new Error("Must be logged in to request revisions");

    if (isRealSupabase && supabase) {
      const { data, error } = await supabase.rpc("request_task_revision", {
        p_task_id: taskId,
        p_revision_prompt: revisionPrompt,
      });
      if (error) throw error;
      await loadSupabaseData(supabase);
      return data;
    } else {
      const targetIndex = tasks.findIndex((t) => t.id === taskId);
      if (targetIndex === -1) throw new Error("Task not found");

      const existing = tasks[targetIndex];
      if (existing.revision_used) {
        throw new Error("This task has already used its 1 revision request.");
      }

      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const updated: Task = {
        ...existing,
        status: "revision_requested",
        revision_prompt: revisionPrompt,
        revision_used: true,
        locked_until: lockedUntil,
        updated_at: new Date().toISOString(),
      };

      const newTaskList = [...tasks];
      newTaskList[targetIndex] = updated;
      setTasks(newTaskList);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(newTaskList));
      }

      return updated;
    }
  };

  const approveTask = async (taskId: string): Promise<Task> => {
    if (!user) throw new Error("Must be logged in to approve a task");

    if (isRealSupabase && supabase) {
      const { data, error } = await supabase.rpc("approve_task_and_payout", {
        p_task_id: taskId,
      });
      if (error) throw error;
      await loadSupabaseData(supabase);
      await fetchUserProfile(supabase, user.id, null);
      return data;
    } else {
      const targetIndex = tasks.findIndex((t) => t.id === taskId);
      if (targetIndex === -1) throw new Error("Task not found");

      const existing = tasks[targetIndex];
      const payoutAmount = Math.floor(existing.reward_credits * 0.9);

      const updated: Task = {
        ...existing,
        status: "completed",
        updated_at: new Date().toISOString(),
      };

      const newTaskList = [...tasks];
      newTaskList[targetIndex] = updated;
      setTasks(newTaskList);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(newTaskList));
      }

      return updated;
    }
  };

  const cancelTask = async (taskId: string): Promise<Task> => {
    if (!user) throw new Error("Must be logged in to cancel a task");

    if (isRealSupabase && supabase) {
      const { data, error } = await supabase.rpc("cancel_task_and_refund", {
        p_task_id: taskId,
      });
      if (error) throw error;
      await loadSupabaseData(supabase);
      await fetchUserProfile(supabase, user.id, null);
      return data;
    } else {
      const targetIndex = tasks.findIndex((t) => t.id === taskId);
      if (targetIndex === -1) throw new Error("Task not found");

      const existing = tasks[targetIndex];
      const updated: Task = {
        ...existing,
        status: "cancelled",
        updated_at: new Date().toISOString(),
      };

      const refundTx: CreditTransaction = {
        id: "tx-refund-" + Date.now(),
        user_id: user.id,
        task_id: existing.id,
        amount: existing.reward_credits,
        transaction_type: "escrow_refund",
        description: `Escrow refund for cancelled task: ${existing.title}`,
        created_at: new Date().toISOString(),
      };

      const updatedUser: Profile = {
        ...user,
        credits_balance: user.credits_balance + existing.reward_credits,
      };
      setUser(updatedUser);

      const newTaskList = [...tasks];
      newTaskList[targetIndex] = updated;
      setTasks(newTaskList);

      const updatedTxs = [refundTx, ...transactions];
      setTransactions(updatedTxs);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(newTaskList));
        localStorage.setItem(LOCAL_STORAGE_TXS_KEY, JSON.stringify(updatedTxs));
      }

      return updated;
    }
  };

  const getTaskById = (id: string): Task | undefined => {
    return tasks.find((t) => t.id === id);
  };

  const refreshData = async () => {
    if (isRealSupabase && supabase) {
      await loadSupabaseData(supabase);
      if (user) await fetchUserProfile(supabase, user.id, null);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        providerToken,
        isRealSupabase,
        tasks,
        transactions,
        loading,
        signInWithGoogle,
        signOut,
        topUpCredits,
        createTask,
        claimTask,
        submitDeliverable,
        requestRevision,
        approveTask,
        cancelTask,
        getTaskById,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
