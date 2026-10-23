# PromptRelay: Setup & Deployment Guide

PromptRelay connects **Requesters** needing heavy AI prompt runs (Claude 3.7 Sonnet, OpenAI o3, DeepSeek R1, Grok 3) with **Workers** who have active subscriptions and unused daily quota, operating at **$0 infrastructure cost**.

Follow these 3 quick steps to connect your Supabase database and enable Google Drive direct browser storage:

---

### Step 1: Run Database Migration in Supabase
1. Create a free project at [supabase.com](https://supabase.com).
2. In your Supabase Dashboard, navigate to the **SQL Editor** on the left menu.
3. Open [`supabase/schema.sql`](./supabase/schema.sql), copy its entire contents, paste them into the SQL Editor, and click **Run**.
   - This creates the `profiles`, `tasks`, and `credit_transactions` tables.
   - It sets up Row Level Security (RLS) policies.
   - It installs the atomic RPC functions for safe escrow:
     - `create_task_with_escrow`
     - `claim_task` (30-min lock)
     - `submit_task_deliverable`
     - `request_task_revision`
     - `approve_task_and_payout` (10% platform fee, 90% worker payout)
     - `cancel_task_and_refund`
     - `topup_credits`
   - It enables Realtime subscriptions on all tables.
4. Go to **Project Settings -> API** and copy your **Project URL** and **anon public Key**.
5. Create `.env.local` in this project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...your-anon-key
   ```

---

### Step 2: Enable Google OAuth & `drive.file` Scope in Google Cloud Console
To allow users to upload files invisibly into their own Google Drive (`PromptRelay_Files/` folder) without your servers paying a cent for storage:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project, then go to **APIs & Services -> Library**:
   - Search for **Google Drive API** and click **Enable**.
3. Go to **APIs & Services -> OAuth consent screen**:
   - Choose **External** user type.
   - Fill in the App Name (`PromptRelay`) and Support Email.
   - Click **Add or Remove Scopes** and select:
     ```
     https://www.googleapis.com/auth/drive.file
     ```
     *(This is the per-file scoped permission that grants access strictly to files created by PromptRelay without reading the user's private drive documents).*
   - Add your test Google accounts under **Test Users**.
4. Go to **APIs & Services -> Credentials**:
   - Click **Create Credentials -> OAuth Client ID**.
   - Application Type: **Web application**.
   - Under **Authorized redirect URIs**, add your Supabase Auth callback URL:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - Click **Create** and copy your **Client ID** and **Client Secret**.
5. Back in **Supabase Dashboard -> Authentication -> Providers -> Google**:
   - Turn **ON** Google.
   - Paste your **Client ID** and **Client Secret**.
   - Under **Scopes**, enter:
     ```
     https://www.googleapis.com/auth/drive.file
     ```
   - Click **Save**.

---

### Step 3: Run the Development Server
Install dependencies and start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **💡 Ready for Production Shipping:**
> Connect your Supabase project URL and anon public key in `.env.local` to enable real-time PostgreSQL escrow transactions, Google OAuth sign-in, and direct Google Drive file storage.
