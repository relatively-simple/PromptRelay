-- ==============================================================================
-- PromptRelay: AI Subscription Arbitrage & Task Marketplace Database Schema
-- File: supabase/schema.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    credits_balance INTEGER NOT NULL DEFAULT 500, -- Free starter credits for MVP
    total_earned INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Prevent unauthorized direct modifications of credit balances and stats via PostgREST
CREATE OR REPLACE FUNCTION public.protect_profile_financial_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF (current_user = 'authenticated' OR auth.role() = 'authenticated') THEN
        IF (NEW.credits_balance IS DISTINCT FROM OLD.credits_balance OR
            NEW.total_earned IS DISTINCT FROM OLD.total_earned OR
            NEW.tasks_completed IS DISTINCT FROM OLD.tasks_completed) THEN
            RAISE EXCEPTION 'Direct modification of credit balances and statistics is prohibited. Use platform RPC functions.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_financial_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_financial_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_financial_columns();

-- ==============================================================================
-- 2. TASKS TABLE
-- ==============================================================================
-- Task Status values: 'open', 'locked', 'submitted', 'revision_requested', 'completed', 'cancelled'
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    target_model TEXT NOT NULL, -- e.g. 'Claude 3.7 Sonnet', 'OpenAI o3', 'DeepSeek R1', 'Grok 3 (Think Mode)', 'ChatGPT Pro (o1 / o3)', 'Gemini 2.0 Pro'
    output_format TEXT NOT NULL, -- e.g. 'PDF Document', 'PowerPoint / Slides', 'Code / Zip', 'Markdown / Text'
    estimated_tokens INTEGER NOT NULL DEFAULT 0,
    reward_credits INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'submitted', 'revision_requested', 'completed', 'cancelled')),
    locked_until TIMESTAMPTZ,
    source_files JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { name, size, mimeType, driveFileId, downloadUrl, viewUrl }
    deliverable_files JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { name, size, mimeType, driveFileId, downloadUrl, viewUrl }
    deliverable_notes TEXT,
    proof_share_url TEXT, -- e.g. https://claude.ai/share/..., https://chatgpt.com/share/..., https://chat.deepseek.com/share/..., etc.
    revision_prompt TEXT,
    revision_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for marketplace filtering and performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_target_model ON public.tasks(target_model);
CREATE INDEX IF NOT EXISTS idx_tasks_requester_id ON public.tasks(requester_id);
CREATE INDEX IF NOT EXISTS idx_tasks_worker_id ON public.tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks Policies
DROP POLICY IF EXISTS "Anyone authenticated can view tasks" ON public.tasks;
CREATE POLICY "Anyone authenticated can view tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (
        status = 'open' 
        OR requester_id = auth.uid() 
        OR worker_id = auth.uid()
        OR (status = 'locked' AND locked_until < NOW())
    );

DROP POLICY IF EXISTS "Requesters can insert tasks via RPC or direct" ON public.tasks;
CREATE POLICY "Requesters can insert tasks via RPC or direct"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Requesters and Workers can update tasks" ON public.tasks;
-- Note: Direct table updates on public.tasks via PostgREST are disabled.
-- All task lifecycle mutations (claim, submit deliverable, revision, escrow payout, cancellation/refund)
-- are executed exclusively through atomic SECURITY DEFINER RPC functions to guarantee escrow integrity.

-- ==============================================================================
-- 3. CREDIT TRANSACTIONS TABLE
-- ==============================================================================
-- Transaction Types: 'signup_bonus', 'escrow_lock', 'task_payout', 'escrow_refund', 'credit_topup'
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- Negative for deductions/escrow locks, positive for earnings/refunds/topups
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('signup_bonus', 'escrow_lock', 'task_payout', 'escrow_refund', 'credit_topup')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_task_id ON public.credit_transactions(task_id);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Transaction Policies: Users can view their own transactions only
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their own transactions"
    ON public.credit_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. AUTH TRIGGER: AUTO-CREATE PROFILE WITH 500 STARTER CREDITS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_full_name TEXT;
    v_avatar_url TEXT;
BEGIN
    v_full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );
    v_avatar_url := COALESCE(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture',
        ''
    );

    INSERT INTO public.profiles (id, email, full_name, avatar_url, credits_balance, total_earned, tasks_completed)
    VALUES (new.id, new.email, v_full_name, v_avatar_url, 500, 0, 0)
    ON CONFLICT (id) DO NOTHING;

    -- Record signup bonus credit transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
    VALUES (new.id, 500, 'signup_bonus', 'Welcome Starter Credits (PromptRelay MVP)');

    RETURN new;
END;
$$;

-- Trigger definition for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. ATOMIC RPC FUNCTIONS (ESCROW & TRANSACTION SAFETY)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- RPC: create_task_with_escrow
-- Checks requester balance, locks escrow credits, creates task, logs transaction
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_task_with_escrow(
    p_title TEXT,
    p_prompt_text TEXT,
    p_target_model TEXT,
    p_output_format TEXT,
    p_estimated_tokens INTEGER,
    p_reward_credits INTEGER,
    p_source_files JSONB DEFAULT '[]'::jsonb
)
RETURNS public.tasks
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_current_balance INTEGER;
    v_task public.tasks;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_reward_credits <= 0 THEN
        RAISE EXCEPTION 'Reward credits must be greater than zero';
    END IF;

    -- Lock row for update to prevent race conditions
    SELECT credits_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    IF v_current_balance < p_reward_credits THEN
        RAISE EXCEPTION 'Insufficient credit balance (% credits available, % required)', v_current_balance, p_reward_credits;
    END IF;

    -- Deduct escrow credits from requester
    UPDATE public.profiles
    SET credits_balance = credits_balance - p_reward_credits,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Insert the new task
    INSERT INTO public.tasks (
        requester_id,
        title,
        prompt_text,
        target_model,
        output_format,
        estimated_tokens,
        reward_credits,
        status,
        source_files
    ) VALUES (
        v_user_id,
        p_title,
        p_prompt_text,
        p_target_model,
        p_output_format,
        p_estimated_tokens,
        p_reward_credits,
        'open',
        COALESCE(p_source_files, '[]'::jsonb)
    )
    RETURNING * INTO v_task;

    -- Record escrow transaction
    INSERT INTO public.credit_transactions (
        user_id,
        task_id,
        amount,
        transaction_type,
        description
    ) VALUES (
        v_user_id,
        v_task.id,
        -p_reward_credits,
        'escrow_lock',
        format('Escrow locked for task: %s', p_title)
    );

    RETURN v_task;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC: claim_task
-- Claims an open or expired task for 30 minutes
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_task(p_task_id UUID)
RETURNS public.tasks
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_worker_id UUID;
    v_task public.tasks;
BEGIN
    v_worker_id := auth.uid();
    IF v_worker_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Lock task row for concurrency safety
    SELECT * INTO v_task
    FROM public.tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    IF v_task.requester_id = v_worker_id THEN
        RAISE EXCEPTION 'You cannot claim your own task';
    END IF;

    -- Task must be open OR locked with expired timer
    IF NOT (v_task.status = 'open' OR (v_task.status = 'locked' AND v_task.locked_until < NOW())) THEN
        RAISE EXCEPTION 'Task is currently unavailable for claim (status: %)', v_task.status;
    END IF;

    -- Lock for 30 minutes
    UPDATE public.tasks
    SET worker_id = v_worker_id,
        status = 'locked',
        locked_until = NOW() + INTERVAL '30 minutes',
        updated_at = NOW()
    WHERE id = p_task_id
    RETURNING * INTO v_task;

    RETURN v_task;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC: submit_task_deliverable
-- Worker submits deliverable files, proof link, and optional notes
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_task_deliverable(
    p_task_id UUID,
    p_deliverable_files JSONB,
    p_proof_share_url TEXT,
    p_deliverable_notes TEXT DEFAULT NULL
)
RETURNS public.tasks
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_worker_id UUID;
    v_task public.tasks;
BEGIN
    v_worker_id := auth.uid();
    IF v_worker_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_task
    FROM public.tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    IF v_task.worker_id != v_worker_id THEN
        RAISE EXCEPTION 'Only the assigned worker can submit deliverables';
    END IF;

    IF v_task.status NOT IN ('locked', 'revision_requested') THEN
        RAISE EXCEPTION 'Task is not in locked or revision state';
    END IF;

    -- Validate proof link (Claude, ChatGPT, DeepSeek, Gemini, or Grok share)
    IF p_proof_share_url IS NULL OR (
        NOT (
            p_proof_share_url LIKE 'https://claude.ai/share/%'
            OR p_proof_share_url LIKE 'https://chatgpt.com/share/%'
            OR p_proof_share_url LIKE 'https://chat.deepseek.com/share/%'
            OR p_proof_share_url LIKE 'https://gemini.google.com/share/%'
            OR p_proof_share_url LIKE 'https://grok.com/share/%'
            OR p_proof_share_url LIKE 'https://x.com/i/grok/%'
        )
    ) THEN
        RAISE EXCEPTION 'Invalid proof link. Must start with official model share link (claude.ai, chatgpt.com, chat.deepseek.com, gemini.google.com, or grok.com)';
    END IF;

    UPDATE public.tasks
    SET deliverable_files = COALESCE(p_deliverable_files, '[]'::jsonb),
        proof_share_url = p_proof_share_url,
        deliverable_notes = p_deliverable_notes,
        status = 'submitted',
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = p_task_id
    RETURNING * INTO v_task;

    RETURN v_task;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC: request_task_revision
-- Requester requests 1 single follow-up revision tweak
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_task_revision(
    p_task_id UUID,
    p_revision_prompt TEXT
)
RETURNS public.tasks
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_requester_id UUID;
    v_task public.tasks;
BEGIN
    v_requester_id := auth.uid();
    IF v_requester_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_task
    FROM public.tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    IF v_task.requester_id != v_requester_id THEN
        RAISE EXCEPTION 'Only the task requester can request revisions';
    END IF;

    IF v_task.status != 'submitted' THEN
        RAISE EXCEPTION 'Task must be in submitted state to request a revision';
    END IF;

    IF v_task.revision_used THEN
        RAISE EXCEPTION 'Revision limit reached (1 revision permitted per task)';
    END IF;

    UPDATE public.tasks
    SET status = 'revision_requested',
        revision_prompt = p_revision_prompt,
        revision_used = true,
        locked_until = NOW() + INTERVAL '24 hours',
        updated_at = NOW()
    WHERE id = p_task_id
    RETURNING * INTO v_task;

    RETURN v_task;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC: approve_task_and_payout
-- Requester approves deliverable: 10% platform fee, 90% credited to worker
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_task_and_payout(p_task_id UUID)
RETURNS public.tasks
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_requester_id UUID;
    v_task public.tasks;
    v_fee INTEGER;
    v_payout INTEGER;
BEGIN
    v_requester_id := auth.uid();
    IF v_requester_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_task
    FROM public.tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    IF v_task.requester_id != v_requester_id THEN
        RAISE EXCEPTION 'Only the requester can approve this task and release escrow';
    END IF;

    IF v_task.status != 'submitted' THEN
        RAISE EXCEPTION 'Task is not currently submitted for approval';
    END IF;

    IF v_task.worker_id IS NULL THEN
        RAISE EXCEPTION 'No worker assigned to this task';
    END IF;

    -- Calculate 10% platform fee and 90% net worker payout
    v_fee := CEIL(v_task.reward_credits * 0.10);
    v_payout := v_task.reward_credits - v_fee;

    -- Mark task as completed
    UPDATE public.tasks
    SET status = 'completed',
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = p_task_id
    RETURNING * INTO v_task;

    -- Credit 90% to worker profile
    UPDATE public.profiles
    SET credits_balance = credits_balance + v_payout,
        total_earned = total_earned + v_payout,
        tasks_completed = tasks_completed + 1,
        updated_at = NOW()
    WHERE id = v_task.worker_id;

    -- Record transaction for worker
    INSERT INTO public.credit_transactions (
        user_id,
        task_id,
        amount,
        transaction_type,
        description
    ) VALUES (
        v_task.worker_id,
        v_task.id,
        v_payout,
        'task_payout',
        format('Payout for completing task: %s (10%% fee retained)', v_task.title)
    );

    RETURN v_task;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC: cancel_task_and_refund
-- Requester cancels an open or expired task and gets 100% refund
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_task_and_refund(p_task_id UUID)
RETURNS public.tasks
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_requester_id UUID;
    v_task public.tasks;
BEGIN
    v_requester_id := auth.uid();
    IF v_requester_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_task
    FROM public.tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    IF v_task.requester_id != v_requester_id THEN
        RAISE EXCEPTION 'Only the task creator can cancel this task';
    END IF;

    IF NOT (
        v_task.status = 'open' OR 
        ((v_task.status = 'locked' OR v_task.status = 'revision_requested') AND v_task.locked_until < NOW())
    ) THEN
        RAISE EXCEPTION 'Cannot cancel task in status: %', v_task.status;
    END IF;

    -- Mark task cancelled
    UPDATE public.tasks
    SET status = 'cancelled',
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = p_task_id
    RETURNING * INTO v_task;

    -- Refund escrow credits
    UPDATE public.profiles
    SET credits_balance = credits_balance + v_task.reward_credits,
        updated_at = NOW()
    WHERE id = v_requester_id;

    -- Record refund transaction
    INSERT INTO public.credit_transactions (
        user_id,
        task_id,
        amount,
        transaction_type,
        description
    ) VALUES (
        v_requester_id,
        v_task.id,
        v_task.reward_credits,
        'escrow_refund',
        format('Escrow refund for cancelled task: %s', v_task.title)
    );

    RETURN v_task;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC: topup_credits
-- Allows adding test or purchased credits to the current user's wallet
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.topup_credits(p_amount INTEGER)
RETURNS public.profiles
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.profiles;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Topup amount must be positive';
    END IF;

    UPDATE public.profiles
    SET credits_balance = credits_balance + p_amount,
        updated_at = NOW()
    WHERE id = v_user_id
    RETURNING * INTO v_profile;

    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        transaction_type,
        description
    ) VALUES (
        v_user_id,
        p_amount,
        'credit_topup',
        format('Credits Top-Up (+%s credits)', p_amount)
    );

    RETURN v_profile;
END;
$$;

-- ==============================================================================
-- 6. REALTIME REPLICATION ENABLEMENT
-- ==============================================================================
-- Enable Realtime publication for tables safely and idempotently
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_transactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
