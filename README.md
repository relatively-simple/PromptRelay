# PromptRelay ⚡

> **Human-in-the-Loop AI Task Marketplace & Subscription Quota Arbitrage Platform**  
> Run high-context prompts on pro models (**Claude 3.7 Sonnet**, **OpenAI o3**, **DeepSeek R1**, **Grok 3**, **Gemini 2.0 Pro**) or monetize idle subscription capacity — operating at **$0 infrastructure cost**.

---

## 🚀 Key Highlights & $0 Infra Architecture

1. **Client-Side Document Token Counting**  
   Large PDFs (`pdfjs-dist`) and Word documents (`mammoth`) are parsed directly in the user's browser via WebAssembly & Web Workers. The server never incurs compute or memory costs for document parsing.
2. **Invisible Direct Google Drive Storage**  
   Source files and completed deliverables upload directly from the user's browser into their personal Google Drive using Google OAuth REST API v3 with the strict `drive.file` scope. No S3/Blob storage egress or storage bills.
3. **Atomic PostgreSQL Escrow & Ledger**  
   Credits are held in atomic database escrow upon task creation. Workers receive guaranteed 90% net payouts only upon requester verification of a model proof link and deliverable approval.
4. **Exclusivity Locks with Auto-Refund**  
   Workers get 30-minute exclusivity locks to run prompts. If a worker abandons a task or fails to resubmit requested revisions, requesters can instantly cancel and receive full credit refunds.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14+ (App Router, React 18, TypeScript 5.6)
- **Styling:** Tailwind CSS 3.4, Lucide React icons
- **Database & Auth:** Supabase (PostgreSQL 15+, Row Level Security, Realtime WebSockets, Google OAuth)
- **Document Parsing:** `pdfjs-dist`, `mammoth`, Native HTML5 `FileReader`
- **Cloud Storage:** Google Drive REST API v3 (`https://www.googleapis.com/auth/drive.file`)
- **Testing:** Native Node.js Test Runner (`node:test`, `node:assert`)

---

## 📂 Repository Structure

```text
├── app/
│   ├── auth/callback/     # Google OAuth session callback handler
│   ├── marketplace/       # Real-time task board with model & format filters
│   ├── my-tasks/          # Requester tasks, worker bounties, & refund actions
│   ├── post-task/         # File parser, token calculator, & escrow creator
│   ├── tasks/[id]/        # Dual-sided workspace (Requester review vs. Worker deliverable)
│   ├── layout.tsx         # App layout with dark mode container & Navbar
│   └── page.tsx           # High-converting visitor landing page
├── components/
│   ├── Navbar.tsx         # Header navigation, balance indicator, & Google auth
│   └── TopUpModal.tsx     # Escrow wallet modal & credit transaction history
├── context/
│   └── AppContext.tsx     # Global application state & Supabase real-time sync
├── lib/
│   ├── googleDrive.ts     # Client-side Google Drive multipart uploads & permissions
│   ├── tokenCalculator.ts # Token estimation & pricing multipliers
│   └── supabase/          # Supabase client factory
├── supabase/
│   └── schema.sql         # Database tables, RLS policies, & atomic PL/pgSQL RPCs
├── tests/                 # Automated unit tests for tokens, pricing & proof URLs
└── AUDIT.md               # Senior Staff Engineer audit and hardening report
```

---

## ⚡ Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/YOUR_USERNAME/PromptRelay.git
cd PromptRelay
npm install
```

### 2. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.local.example .env.local
```

Fill in your Supabase project credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Initialize Database Schema

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor**.
2. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.
3. All tables, security triggers, and atomic escrow RPC functions will be created.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the test suite and linters:

```bash
# Run unit tests
npm test

# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Production build
npm run build
```

---

## 🚢 Deployment

Detailed deployment guides for **Cloudflare Pages** and **Vercel** are available in [SETUP.md](./SETUP.md).

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
