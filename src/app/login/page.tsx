// src/app/login/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock, User as UserIcon, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.error || "Invalid username or password");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-[#0f141a] px-4 py-12">
      {/* Background soft ambient gradient glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-wine/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-brand-peach/5 blur-[120px]" />

      <div className="w-full max-w-md z-10 page-transition">
        {/* Company Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-logo shadow-lg mb-4">
            <span className="text-white font-display font-extrabold text-2xl tracking-wider">K</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-brand-slate dark:text-white">
            Klader
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Enterprise Business Management Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl shadow-glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-logo" />
          
          <h2 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100 mb-6">
            Sign In to Account
          </h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs font-semibold text-brand-crimson dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-[#161f28]/50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-wine/20 focus:border-brand-wine transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-[#161f28]/50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-wine/20 focus:border-brand-wine transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-logo text-white font-semibold text-sm shadow-md hover:shadow-lg focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Authenticating...
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>

          {/* Quick Demo Access Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>Demo Account Quick Fills</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => handleQuickFill("Zadid", "Zadu00789")}
                className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-brand-wine-light dark:hover:bg-brand-wine/10 hover:border-brand-wine/20 text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-left transition-all"
              >
                <div className="font-bold text-brand-wine dark:text-brand-peach">Main Admin</div>
                <div>Zadid (Zadu00789)</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("rafsan", "rafsan123")}
                className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-brand-wine-light dark:hover:bg-brand-wine/10 hover:border-brand-wine/20 text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-left transition-all"
              >
                <div className="font-bold text-blue-600">Partner / Investor</div>
                <div>rafsan (rafsan123)</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("monir", "monir123")}
                className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-brand-wine-light dark:hover:bg-brand-wine/10 hover:border-brand-wine/20 text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-left transition-all"
              >
                <div className="font-bold text-emerald-600">Staff / Sales Manager</div>
                <div>monir (monir123)</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("guest", "guest123")}
                className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-brand-wine-light dark:hover:bg-brand-wine/10 hover:border-brand-wine/20 text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-left transition-all"
              >
                <div className="font-bold text-slate-500">Viewer (Read-only)</div>
                <div>guest (guest123)</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
