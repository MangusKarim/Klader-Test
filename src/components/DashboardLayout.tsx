// src/components/DashboardLayout.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Receipt,
  FileBarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Info,
  AlertTriangle,
  User as UserIcon,
  CircleDollarSign,
  Plus
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, logout, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    products: any[];
    orders: any[];
    partners: any[];
  }>({ products: [], orders: [], partners: [] });
  const [searchFocused, setSearchFocused] = useState(false);

  // Notification lists (drawn dynamically from db alerts)
  const [alerts, setAlerts] = useState<{ id: string; type: "stock" | "payment" | "partner"; text: string; link: string }[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Load dark mode preferences
  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Toggle Dark Mode
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

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search results when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ products: [], orders: [], partners: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Global search error:", err);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch alerts for Notification Panel
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.notifications || []);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    }
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  // Route protection
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f141a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-logo animate-pulse shadow-lg flex items-center justify-center">
            <span className="text-white font-display font-extrabold text-lg">K</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-wine/60 dark:text-brand-peach/60 animate-pulse">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Navigation Links definition
  const navLinks = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, permission: "read" },
    { name: "Partners", href: "/partners", icon: Users, permission: "read" },
    { name: "Inventory", href: "/inventory", icon: Package, permission: "read" },
    { name: "Sales Orders", href: "/sales", icon: ShoppingCart, permission: "read" },
    { name: "Expenses", href: "/expenses", icon: Receipt, permission: "read" },
    { name: "Reports", href: "/reports", icon: FileBarChart2, permission: "read" },
    { name: "Settings", href: "/settings", icon: Settings, permission: "read" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0f141a] text-slate-800 dark:text-slate-100">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 glass-panel shadow-premium z-30">
        {/* Header Logo */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
          <img src="/logo.svg" alt="Klader Logo" className="w-9 h-9 object-contain" />
          <div>
            <span className="text-xl font-display font-extrabold tracking-tight text-brand-slate dark:text-white">
              Klader
            </span>
            <span className="block text-[9px] uppercase font-bold tracking-widest text-brand-wine dark:text-brand-peach">
              Bangladesh
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            if (!hasPermission(link.permission)) return null;

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group duration-200 ${
                  active
                    ? "bg-gradient-logo text-white shadow-md shadow-brand-wine/10"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-brand-wine dark:hover:text-brand-peach"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110 ${active ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-brand-wine dark:group-hover:text-brand-peach"}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info / Logout Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-wine-light dark:bg-brand-wine/25 border border-brand-wine/10 flex items-center justify-center text-brand-wine dark:text-brand-peach font-bold text-sm shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-semibold text-xs truncate text-slate-800 dark:text-slate-200">
                {user.name}
              </span>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-extrabold uppercase bg-brand-wine/10 dark:bg-brand-peach/10 text-brand-wine dark:text-brand-peach border border-brand-wine/5 dark:border-brand-peach/5">
                {user.role}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-brand-crimson dark:hover:text-red-400 border border-transparent hover:border-red-100 dark:hover:border-red-950/50 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      <div
        className={`md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <aside
          className={`w-64 h-full bg-white dark:bg-[#161f28] shadow-heavy flex flex-col transition-transform duration-300 transform ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Sidebar Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Klader Logo" className="w-8 h-8" />
              <span className="font-display font-extrabold text-lg text-brand-slate dark:text-white">
                Klader
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto no-scrollbar">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              if (!hasPermission(link.permission)) return null;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-gradient-logo text-white shadow-md shadow-brand-wine/10"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-brand-wine dark:hover:text-brand-peach"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Info / Logout */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
            <div className="flex items-center gap-3 px-2 py-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-wine/10 flex items-center justify-center text-brand-wine font-bold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-semibold text-xs truncate dark:text-slate-200">{user.name}</span>
                <span className="block text-[8px] font-bold text-brand-wine uppercase dark:text-brand-peach">{user.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-brand-crimson dark:hover:bg-red-950/20 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* TOP BAR / HEADER */}
        <header className="sticky top-0 h-16 glass-panel border-b border-slate-100 dark:border-slate-800/80 shadow-premium flex items-center justify-between px-4 md:px-6 z-20">
          
          {/* Left Area: Mobile Menu Trigger & Navigation Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
            >
              <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-base font-display font-bold text-slate-800 dark:text-white capitalize">
                {pathname === "/" ? "Overview Dashboard" : pathname.replace("/", "").replace("-", " ") + " Management"}
              </h2>
            </div>
          </div>

          {/* Center Area: Search Everywhere */}
          <div className="flex-1 max-w-md mx-4 relative" ref={searchRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search orders, SKU, products..."
                className="block w-full pl-9 pr-3 py-1.5 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#161f28]/30 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Global Search Results Overlay */}
            {searchFocused && (searchQuery.trim()) && (
              <div className="absolute top-full mt-2 left-0 right-0 max-h-96 overflow-y-auto bg-white dark:bg-[#161f28] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-heavy p-4 z-50 animate-slide-up no-scrollbar">
                <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 pb-1 border-b border-slate-50 dark:border-slate-800/50">
                  Search Results for "{searchQuery}"
                </h4>
                
                {/* Product Matches */}
                {searchResults.products.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] font-bold text-brand-wine dark:text-brand-peach mb-2 flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" /> Products
                    </div>
                    <div className="space-y-1.5">
                      {searchResults.products.map((p) => (
                        <Link
                          key={p.id}
                          href={`/inventory?search=${p.sku}`}
                          onClick={() => {
                            setSearchQuery("");
                            setSearchFocused(false);
                          }}
                          className="block p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800/30"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</div>
                          <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                            <span>SKU: {p.sku} | Cat: {p.category}</span>
                            <span className="font-bold text-slate-600 dark:text-slate-400">Stock: {p.stockQuantity}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Matches */}
                {searchResults.orders.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] font-bold text-brand-steel mb-2 flex items-center gap-1">
                      <ShoppingCart className="h-3.5 w-3.5" /> Sales Orders
                    </div>
                    <div className="space-y-1.5">
                      {searchResults.orders.map((o) => (
                        <Link
                          key={o.id}
                          href={`/sales?order=${o.id}`}
                          onClick={() => {
                            setSearchQuery("");
                            setSearchFocused(false);
                          }}
                          className="block p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800/30"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-200">Order #{o.id} - {o.customerName}</div>
                          <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                            <span>Phone: {o.customerPhone}</span>
                            <span className="font-bold text-brand-wine dark:text-brand-peach">৳ {o.totalAmount.toLocaleString()} BDT</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Partner Matches */}
                {searchResults.partners.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[10px] font-bold text-brand-sage mb-2 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Partners
                    </div>
                    <div className="space-y-1.5">
                      {searchResults.partners.map((p) => (
                        <Link
                          key={p.id}
                          href={`/partners?id=${p.id}`}
                          onClick={() => {
                            setSearchQuery("");
                            setSearchFocused(false);
                          }}
                          className="block p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800/30"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</div>
                          <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                            <span>Phone: {p.phone} | {p.partnerType}</span>
                            <span className="font-bold text-slate-600 dark:text-slate-400">Share: {p.ownershipPercentage}%</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.products.length === 0 && searchResults.orders.length === 0 && searchResults.partners.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                    No results found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Area: Alerts & Dark Mode & Profile */}
          <div className="flex items-center gap-2 md:gap-3">
            
            {/* Dark Mode Switcher */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-850/50 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-850/50 text-slate-500 dark:text-slate-400 transition-all relative cursor-pointer"
                title="System Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-crimson animate-ping" />
                )}
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-crimson" />
                )}
              </button>

              {/* Notification Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#161f28] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-heavy z-50 overflow-hidden animate-slide-up">
                  <div className="p-4 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">System Alerts</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-wine/10 text-brand-wine dark:text-brand-peach">
                      {alerts.length} New
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto no-scrollbar py-1">
                    {alerts.length > 0 ? (
                      alerts.map((a) => (
                        <Link
                          key={a.id}
                          href={a.link}
                          onClick={() => setNotificationsOpen(false)}
                          className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850/30 border-b border-slate-50 dark:border-slate-850/20 last:border-0 transition-all"
                        >
                          <div className="mt-0.5">
                            {a.type === "stock" ? (
                              <AlertTriangle className="h-4 w-4 text-status-warning" />
                            ) : a.type === "partner" ? (
                              <CircleDollarSign className="h-4 w-4 text-brand-wine dark:text-brand-peach" />
                            ) : (
                              <Info className="h-4 w-4 text-status-info" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">
                              {a.text}
                            </p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                        All systems normal. No active alerts.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-logo text-white font-bold text-xs flex items-center justify-center shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#161f28] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-heavy py-1 z-50 animate-slide-up">
                  <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="block font-semibold text-xs text-slate-800 dark:text-slate-200">{user.name}</span>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</span>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all"
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Link>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-brand-crimson hover:bg-red-50 dark:hover:bg-red-950/20 transition-all text-left cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
          <div className="max-w-7xl mx-auto page-transition">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
