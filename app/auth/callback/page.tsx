"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing authentication...");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient();
        if (!supabase) {
          router.replace("/marketplace");
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session) {
          if (data.session.provider_token) {
            sessionStorage.setItem(
              "google_provider_token",
              data.session.provider_token
            );
          }
          setStatus("Authentication successful! Redirecting to marketplace...");
          setTimeout(() => {
            router.replace("/marketplace");
          }, 800);
        } else {
          router.replace("/marketplace");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setStatus("Redirecting...");
        router.replace("/marketplace");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">
          Syncing Google Account
        </h2>
        <p className="text-sm text-slate-400 mb-6">{status}</p>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full w-2/3 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
