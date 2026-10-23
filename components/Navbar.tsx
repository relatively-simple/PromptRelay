"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { TopUpModal } from "@/components/TopUpModal";
import {
  Zap,
  PlusCircle,
  Layers,
  FileCheck2,
  HardDrive,
  LogOut,
  User,
  ChevronDown,
  Sparkles,
  Home,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const {
    user,
    providerToken,
    signInWithGoogle,
    signOut,
  } = useApp();

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Navigation Links - always available across all pages
  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/marketplace", label: "Task Board", icon: Layers },
    { href: "/post-task", label: "Ask for a Job", icon: PlusCircle },
    { href: "/my-tasks", label: "My Tasks", icon: FileCheck2 },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand - Unconditionally links to Home ("/") */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group cursor-pointer"
              title="PromptRelay Home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  Prompt<span className="text-indigo-400">Relay</span>
                </span>
                <span className="text-[10px] text-slate-400 -mt-1 hidden sm:block">
                  AI Task Marketplace
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Always available */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
                      isActive
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-indigo-400" : "text-slate-500"
                      }`}
                    />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                {/* Credits Balance Pill */}
                <button
                  onClick={() => setTopUpOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-400/60 shadow-sm transition group"
                  title="Click to view wallet & top up credits"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                    <Zap className="w-3 h-3 fill-amber-400" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <span>{user?.credits_balance ?? 500}</span>
                      <span className="text-[10px] text-amber-400/90 font-medium">
                        Credits
                      </span>
                    </span>
                    <span className="text-[9px] text-slate-400 -mt-0.5">
                      ${((((user?.credits_balance ?? 500) * 0.5) / 100)).toFixed(2)}
                    </span>
                  </div>
                  <span className="ml-1 text-[11px] font-bold text-indigo-400 group-hover:text-indigo-300">
                    +Top Up
                  </span>
                </button>

                {/* Google Drive Status Indicator */}
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border ${
                    providerToken
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                  title={
                    providerToken
                      ? "Google Drive Connected via OAuth drive.file scope"
                      : "Google Drive OAuth (Direct Drive Storage Ready)"
                  }
                >
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{providerToken ? "Drive Connected" : "Drive Ready"}</span>
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
                  >
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.full_name || "Profile"}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                        {user.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-white max-w-[120px] truncate hidden sm:block">
                      {user.full_name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                      <div className="p-3 border-b border-slate-800">
                        <div className="font-semibold text-sm text-white">
                          {user.full_name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {user.email}
                        </div>
                        <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Completed: {user.tasks_completed} tasks</span>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        >
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          Home Page
                        </Link>
                        <Link
                          href="/marketplace"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        >
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          Task Board (Doable Tasks)
                        </Link>
                        <Link
                          href="/post-task"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                          Ask for a Job (Post Task)
                        </Link>
                        <Link
                          href="/my-tasks"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                          My Tasks & Submissions
                        </Link>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setTopUpOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          Wallet & Escrow Ledger
                        </button>
                      </div>

                      <div className="pt-1 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition"
              >
                <User className="w-3.5 h-3.5" />
                Sign In with Google
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar - Always available across all screens */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950 py-2 px-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${
                  isActive ? "text-indigo-400 font-bold" : "text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      <TopUpModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </>
  );
}
