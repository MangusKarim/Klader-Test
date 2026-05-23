// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Layers,
  Truck,
  Users,
  Building,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    inventoryCostValue: number;
    totalSalesOrders: number;
    totalProducts: number;
    pendingDeliveries: number;
    partnerInvestmentTotal: number;
    companyReserveBalance: number;
  };
  charts: {
    trendData: { date: string; revenue: number; profit: number }[];
    expenseAllocation: { name: string; value: number }[];
    bestSellers: { name: string; sku: string; size: string; color: string; qty: number }[];
    partnerOwnership: { name: string; percentage: number; investment: number }[];
  };
  tables: {
    recentOrders: any[];
    lowStockAlerts: any[];
    pendingPayments: any[];
    recentExpenses: any[];
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          {/* Top Bar Skeleton */}
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
          {/* KPI grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
          {/* Charts grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { stats, charts, tables } = data;

  // Render SVG Line Chart
  const renderTrendChart = () => {
    const points = charts.trendData;
    if (points.length === 0) return null;

    const width = 500;
    const height = 200;
    const padding = 40;

    // Find max value in data to scale coordinates
    const maxVal = Math.max(...points.map((p) => Math.max(p.revenue, p.profit, 5000)));

    const getX = (index: number) => padding + (index * (width - padding * 2)) / (points.length - 1);
    const getY = (value: number) => height - padding - (value * (height - padding * 2)) / maxVal;

    // Build SVG paths
    const revPoints = points.map((p, i) => ({ x: getX(i), y: getY(p.revenue) }));
    const profPoints = points.map((p, i) => ({ x: getX(i), y: getY(p.profit) }));

    const revPath = revPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const profPath = profPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    // Build shaded area for revenue
    const revArea = revPoints.length > 0
      ? `${revPath} L ${revPoints[revPoints.length - 1].x} ${height - padding} L ${revPoints[0].x} ${height - padding} Z`
      : "";

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e77e4e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#e77e4e" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7b0a1c" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7b0a1c" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = height - padding - ratio * (height - padding * 2);
          const valLabel = Math.round(ratio * maxVal);
          return (
            <g key={index}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(150, 150, 150, 0.1)" strokeDasharray="3" />
              <text x={padding - 5} y={y + 3} className="text-[9px] fill-slate-400 dark:fill-slate-500 font-semibold text-right" textAnchor="end">
                ৳{valLabel >= 1000 ? `${(valLabel / 1000).toFixed(0)}k` : valLabel}
              </text>
            </g>
          );
        })}

        {/* Shaded Areas */}
        {revArea && <path d={revArea} fill="url(#revGrad)" />}
        
        {/* Lines */}
        {revPath && <path d={revPath} fill="none" stroke="#e77e4e" strokeWidth="2.5" strokeLinecap="round" />}
        {profPath && <path d={profPath} fill="none" stroke="#7b0a1c" strokeWidth="2.5" strokeLinecap="round" />}

        {/* Data points */}
        {revPoints.map((p, i) => (
          <circle key={`rev-dot-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#e77e4e" stroke="#fff" strokeWidth="1" className="cursor-pointer" />
        ))}
        {profPoints.map((p, i) => (
          <circle key={`prof-dot-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#7b0a1c" stroke="#fff" strokeWidth="1" className="cursor-pointer" />
        ))}

        {/* X Axis Labels */}
        {points.map((p, i) => (
          <text key={i} x={getX(i)} y={height - 15} className="text-[9px] fill-slate-400 dark:fill-slate-500 font-bold" textAnchor="middle">
            {p.date.split(" ")[0]}
          </text>
        ))}
      </svg>
    );
  };

  // Render SVG Donut Chart for Expense Breakdown
  const renderExpenseChart = () => {
    const data = charts.expenseAllocation;
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-xs text-slate-400 font-semibold uppercase">
          No expense records found
        </div>
      );
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let accumulatedAngle = 0;

    const colors = [
      "#7b0a1c", // Brand Wine
      "#e77e4e", // Brand Peach
      "#b6142c", // Brand Crimson
      "#161f28", // Brand Slate
      "#c5a880", // Brand Bronze
      "#4a6572", // Brand Steel
      "#5f8575", // Brand Sage
      "#9c6644"  // Brand Rosewood
    ];

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {data.map((item, index) => {
              const percentage = item.value / total;
              const angle = percentage * 360;
              const x1 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
              
              accumulatedAngle += angle;
              
              const x2 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="#fff"
                  strokeWidth="0.5"
                  className="hover:opacity-95 transition-opacity cursor-pointer"
                />
              );
            })}
            <circle cx="50" cy="50" r="22" fill="#fff" className="dark:fill-[#161f28]" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
              ৳{(total / 1000).toFixed(1)}k
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="font-semibold text-slate-600 dark:text-slate-400 capitalize">
                  {item.name.toLowerCase()}
                </span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-300">
                ৳{item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Donut Chart for Partner Ownership Breakdown
  const renderPartnerOwnershipChart = () => {
    const data = charts.partnerOwnership.filter((p) => p.percentage > 0);
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-xs text-slate-400 font-semibold uppercase">
          No equity registered
        </div>
      );
    }

    const colors = ["#7b0a1c", "#b6142c", "#e77e4e", "#c5a880"];
    let accumulatedAngle = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {data.map((item, index) => {
              const angle = (item.percentage / 100) * 360;
              const x1 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
              
              accumulatedAngle += angle;
              
              const x2 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="#fff"
                  strokeWidth="0.5"
                  className="hover:opacity-95 transition-opacity cursor-pointer"
                />
              );
            })}
            <circle cx="50" cy="50" r="22" fill="#fff" className="dark:fill-[#161f28]" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equity</span>
            <span className="text-sm font-extrabold text-brand-wine dark:text-brand-peach">100%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="font-semibold text-slate-600 dark:text-slate-400">{item.name}</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-300">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-800 dark:text-white flex items-center gap-2.5">
              <span>Shubho Noboborsho, {user?.name || "Zadid"}!</span>
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Here is what is happening at Klader Bangladesh today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-200/20">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>

        {/* Primary 9 KPI Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* Card 1: Total Revenue */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium border-l-4 border-l-brand-peach flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-brand-peach/10 text-brand-peach rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sales Revenue</span>
              <span className="block text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                ৳{stats.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 2: Total Expenses */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium border-l-4 border-l-brand-crimson flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-brand-crimson/10 text-brand-crimson rounded-xl">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expenses</span>
              <span className="block text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                ৳{stats.totalExpenses.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 3: Net Profit */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium border-l-4 border-l-brand-wine flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-brand-wine/10 text-brand-wine dark:text-brand-peach rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Profit</span>
              <span className={`block text-lg font-extrabold mt-1 ${stats.netProfit >= 0 ? "text-slate-800 dark:text-white" : "text-brand-crimson"}`}>
                ৳{stats.netProfit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 4: Inventory Cost Value */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium border-l-4 border-l-brand-bronze flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-brand-bronze/10 text-brand-bronze rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Cost Asset</span>
              <span className="block text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                ৳{stats.inventoryCostValue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 5: Total Sales Orders */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium border-l-4 border-l-brand-steel flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-brand-steel/10 text-brand-steel rounded-xl">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sales Orders</span>
              <span className="block text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                {stats.totalSalesOrders} Orders
              </span>
            </div>
          </div>

          {/* Card 6: Total Products */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium border-l-4 border-l-brand-sage flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-brand-sage/10 text-brand-sage rounded-xl">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unique SKUs</span>
              <span className="block text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                {stats.totalProducts} Products
              </span>
            </div>
          </div>

          {/* Card 7: Pending Deliveries */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium border-l-4 border-l-brand-peach flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-brand-peach/10 text-brand-peach rounded-xl">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Shipments</span>
              <span className="block text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                {stats.pendingDeliveries} Pending
              </span>
            </div>
          </div>

          {/* Card 8: Partner Investment Total */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium border-l-4 border-l-brand-rosewood flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-brand-rosewood/10 text-brand-rosewood rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partner Equity Capital</span>
              <span className="block text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                ৳{stats.partnerInvestmentTotal.toLocaleString()}
              </span>
            </div>
          </div>

        </div>

        {/* Brand Reserve Card (Double width highlight) */}
        <div className="glass-panel rounded-2xl p-6 shadow-premium relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-100/50 dark:border-slate-800 bg-gradient-soft">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-brand-wine/10 text-brand-wine dark:text-brand-peach rounded-2xl shadow-inner">
              <Building className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Reserve Capital Balance</h3>
              <p className="text-2xl font-extrabold text-brand-wine dark:text-brand-peach mt-1">
                ৳{stats.companyReserveBalance.toLocaleString()} BDT
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                (Total Approved Equity Investments + Net Profit - Approved Partner Withdrawals)
              </p>
            </div>
          </div>
          <div>
            <Link
              href="/partners"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <span>Manage Equity</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <div className="glass-panel rounded-2xl p-6 shadow-premium">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Sales & Net Profit Trend
                </h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  Comparison over last 7 days of operations
                </p>
              </div>
              <div className="flex gap-4 text-[10px] font-bold">
                <span className="flex items-center gap-1.5 text-brand-peach">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-peach" /> Revenue
                </span>
                <span className="flex items-center gap-1.5 text-brand-wine">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-wine" /> Net Profit
                </span>
              </div>
            </div>
            {renderTrendChart()}
          </div>

          {/* Expense Chart */}
          <div className="glass-panel rounded-2xl p-6 shadow-premium">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Expense Allocation Breakdown
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5 mb-6">
                Cumulative business costs by operational categories
              </p>
            </div>
            {renderExpenseChart()}
          </div>
        </div>

        {/* Mid grid: Best Sellers & Partner Share */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="glass-panel rounded-2xl p-6 shadow-premium">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">
              Best Selling Product Configurations
            </h3>
            <div className="space-y-3.5">
              {charts.bestSellers.length > 0 ? (
                charts.bestSellers.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-200/50">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </div>
                      <div className="text-[9px] font-semibold text-slate-400 uppercase mt-0.5">
                        SKU: {item.sku} | Size: {item.size} | Color: {item.color}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-brand-wine/10 dark:bg-brand-peach/10 text-brand-wine dark:text-brand-peach text-xs font-bold">
                        {item.qty} Sold
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 font-semibold uppercase">
                  No sales recorded yet
                </div>
              )}
            </div>
          </div>

          {/* Equity split chart */}
          <div className="glass-panel rounded-2xl p-6 shadow-premium">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Partner Ownership Structure
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5 mb-6">
                Equity percentages and initial investments
              </p>
            </div>
            {renderPartnerOwnershipChart()}
          </div>
        </div>

        {/* Bottom tables details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Table 1: Recent Orders */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Recent Orders
              </h3>
              <Link href="/sales" className="text-[10px] font-bold text-brand-wine dark:text-brand-peach flex items-center hover:underline">
                <span>All Orders</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {tables.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                      <td className="py-2.5 font-bold text-slate-600 dark:text-slate-400">#{o.id}</td>
                      <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">{o.customerName}</td>
                      <td className="py-2.5 font-bold text-brand-wine dark:text-brand-peach">৳{o.totalAmount.toLocaleString()}</td>
                      <td className="py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          o.deliveryStatus === "DELIVERED"
                            ? "bg-status-success-light text-status-success"
                            : o.deliveryStatus === "CANCELLED"
                            ? "bg-status-danger-light text-status-danger"
                            : "bg-status-warning-light text-status-warning"
                        }`}>
                          {o.deliveryStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Low Stock Warnings */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-4.5 w-4.5 text-status-warning" />
                <span>Low Stock Alerts</span>
              </h3>
              <Link href="/inventory" className="text-[10px] font-bold text-brand-wine dark:text-brand-peach flex items-center hover:underline">
                <span>Restock</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {tables.lowStockAlerts.length > 0 ? (
              <div className="space-y-3 flex-1">
                {tables.lowStockAlerts.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded-xl bg-status-warning-light border border-status-warning/10 text-slate-800 dark:text-slate-200">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</div>
                      <div className="text-[9px] font-semibold text-slate-400 uppercase mt-0.5">SKU: {item.sku}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-status-warning-light text-status-warning font-bold">
                      {item.stock} left
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold uppercase flex-1 flex items-center justify-center">
                All inventory restocked.
              </div>
            )}
          </div>

          {/* Table 3: Pending Payments */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-4.5 w-4.5 text-brand-wine dark:text-brand-peach" />
                <span>Outstanding Dues</span>
              </h3>
            </div>
            {tables.pendingPayments.length > 0 ? (
              <div className="space-y-3 flex-1">
                {tables.pendingPayments.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="font-bold text-slate-600 dark:text-slate-400">Order #{item.id}</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{item.customerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-brand-crimson">৳{item.due.toLocaleString()}</div>
                      <span className="text-[8px] font-bold bg-status-warning-light text-status-warning px-2 py-0.5 rounded-full uppercase">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold uppercase flex-1 flex items-center justify-center">
                No due payments.
              </div>
            )}
          </div>

          {/* Table 4: Recent Expenses */}
          <div className="glass-panel rounded-2xl p-5 shadow-premium flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Recent Expenses
              </h3>
              <Link href="/expenses" className="text-[10px] font-bold text-brand-wine dark:text-brand-peach flex items-center hover:underline">
                <span>View Logs</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3 flex-1">
              {tables.recentExpenses.map((e) => (
                <div key={e.id} className="flex justify-between items-center text-xs p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                      {e.category}
                    </span>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mt-1.5 truncate max-w-[180px]">{e.description}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 dark:text-slate-200">৳{e.amount.toLocaleString()}</span>
                    <div className="text-[9px] font-semibold text-slate-400 mt-0.5">
                      {new Date(e.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
