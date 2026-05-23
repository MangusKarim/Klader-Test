// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  Settings,
  Lock,
  Database,
  User as UserIcon,
  Sun,
  Moon,
  Upload,
  Download,
  Check,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Info
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Backup & Restore state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

  // Appearance state
  const [darkMode, setDarkMode] = useState(false);

  // Load active theme
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setDarkMode(isDark);
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "An error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Export JSON Database backup
  const handleExportBackup = async () => {
    setBackupError(null);
    setBackupSuccess(null);
    try {
      setBackupLoading(true);
      const res = await fetch("/api/settings/backup");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      const data = await res.json();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;

      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `klader_backup_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setBackupSuccess("System database backup JSON downloaded successfully.");
    } catch (err: any) {
      setBackupError(err.message || "Failed to export backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  // Import JSON Database restore
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("WARNING: Restoring database will permanently overwrite all active products, orders, partner stakes, transactions, and expenses. Do you want to proceed?")) {
      e.target.value = ""; // Reset
      return;
    }

    setBackupError(null);
    setBackupSuccess(null);
    setRestoreLoading(true);

    try {
      const fileText = await file.text();
      let jsonData;
      try {
        jsonData = JSON.parse(fileText);
      } catch (err) {
        throw new Error("Invalid file format. Please upload a valid JSON backup file.");
      }

      const res = await fetch("/api/settings/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to restore database state");
      }

      setBackupSuccess("Database restored successfully! Reloading page to apply updates...");
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      setBackupError(err.message || "Failed to restore backup.");
    } finally {
      setRestoreLoading(false);
      e.target.value = ""; // Reset
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-800 dark:text-white">
            System Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your account credentials, configure interface layout mode, and back up business metrics.
          </p>
        </div>

        {/* Global Alert Banners */}
        {backupSuccess && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
            <Check className="h-5 w-5 flex-shrink-0" />
            <span className="text-xs font-semibold">{backupSuccess}</span>
          </div>
        )}
        {backupError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-brand-crimson dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-xs font-semibold">{backupError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Account and Security (Left) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Account Profile Summary Card */}
            <div className="glass-panel p-6 rounded-2xl shadow-premium relative overflow-hidden">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                <UserIcon className="h-4.5 w-4.5 text-brand-wine" /> Current User Session
              </h3>

              {user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-xs">
                  <div className="flex gap-3.5 items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-logo text-white flex items-center justify-center font-bold text-base shadow-md">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="block font-bold text-slate-800 dark:text-white text-sm">{user.name}</span>
                      <span className="text-slate-450 block mt-0.5">Username: {user.username}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/30 pb-1.5">
                      <span className="text-slate-450">Security Clearance:</span>
                      <span className="font-bold uppercase text-brand-wine dark:text-brand-peach bg-brand-wine/10 dark:bg-brand-peach/10 px-2 py-0.5 rounded-full text-[9px]">
                        {user.role}
                      </span>
                    </div>
                    <div className="flex justify-between pb-1.5">
                      <span className="text-slate-450">Access Actions:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-right truncate max-w-[150px]" title={user.permissions.join(", ")}>
                        {user.permissions.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Change Password Card */}
            <div className="glass-panel p-6 rounded-2xl shadow-premium">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
                <Lock className="h-4.5 w-4.5 text-brand-wine" /> Update Account Credentials
              </h3>

              <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
                {passwordError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-brand-crimson dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
                    <span className="font-semibold">{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 flex-shrink-0" />
                    <span className="font-semibold">{passwordSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-350 block">Current Password *</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-wine/10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-350 block">New Password *</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-wine/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-350 block">Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Verify new password"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-wine/10"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-logo text-white font-bold rounded-xl hover:shadow-md cursor-pointer disabled:opacity-50 transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    {passwordLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      "Update Password Hash"
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* Column 3: System Utilities & Theme Configuration (Right) */}
          <div className="space-y-6">
            
            {/* Appearance Preferences */}
            <div className="glass-panel p-6 rounded-2xl shadow-premium">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
                <Sun className="h-4.5 w-4.5 text-brand-wine" /> Appearance Mode
              </h3>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Contrast Dark Theme</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Toggle dark interface coloring.</span>
                </div>

                <button
                  onClick={toggleDarkMode}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-655 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                >
                  {darkMode ? (
                    <>
                      <Sun className="h-4 w-4 text-amber-500" /> Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 text-slate-500" /> Dark Mode
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Database Admin Backups Card */}
            <div className="glass-panel p-6 rounded-2xl shadow-premium">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
                <Database className="h-4.5 w-4.5 text-brand-wine" /> Database Backups
              </h3>

              {isAdmin ? (
                <div className="space-y-4 text-xs">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Admins can export the complete SQLite database structure to a local JSON document, or upload a backup file to restore records.
                  </p>

                  <div className="space-y-2 pt-2">
                    {/* Export */}
                    <button
                      onClick={handleExportBackup}
                      disabled={backupLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-900/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-655 dark:text-slate-350 font-bold transition-all cursor-pointer"
                    >
                      {backupLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4 text-brand-wine dark:text-brand-peach" /> Export DB Backup JSON
                        </>
                      )}
                    </button>

                    {/* Import */}
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        disabled={restoreLoading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        disabled={restoreLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-wine/10 hover:bg-brand-wine/15 text-brand-wine dark:text-brand-peach border border-dashed border-brand-wine/30 dark:border-brand-peach/30 rounded-xl font-bold transition-all"
                      >
                        {restoreLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4" /> Upload & Restore JSON
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-brand-wine/5 dark:bg-brand-peach/5 border border-brand-wine/10 dark:border-brand-peach/10 rounded-xl flex gap-2">
                    <Info className="h-4 w-4 text-brand-wine dark:text-brand-peach flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-brand-wine dark:text-brand-peach leading-relaxed">
                      Restoring a backup resets session activity, ledger entries, orders, inventory stock, and partner distributions. Only upload files exported directly from this dashboard.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex gap-2.5 text-xs">
                  <ShieldCheck className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Access Restriction</span>
                    <span className="text-[10px] block mt-0.5 text-amber-700 dark:text-amber-400/90 leading-tight">
                      Database backup and restoration procedures are restricted to system Admins only.
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
