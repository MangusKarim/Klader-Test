// src/app/reports/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  FileBarChart2,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  DollarSign,
  Briefcase,
  AlertCircle
} from "lucide-react";

interface ReportSummary {
  grossSalesRevenue: number;
  salesProfit: number;
  totalExpenses: number;
  netProfit: number;
  ordersCount: number;
  expensesCount: number;
}

interface ProductPerformance {
  sku: string;
  name: string;
  qty: number;
  revenue: number;
  profit: number;
}

interface ExpenseBreakdown {
  category: string;
  amount: number;
}

interface PartnerShare {
  id: number;
  name: string;
  ownershipPercentage: number;
  partnerType: string;
  projectedShare: number;
}

const CATEGORY_LABELS: { [key: string]: string } = {
  ONLINE_BOOSTING: "Online Boosting (Ad-spend)",
  PACKAGING: "Packaging Materials",
  ACCESSORIES: "Fashion Accessories",
  MARKETING: "Marketing & PR",
  TRANSPORT: "Transport & Logistics",
  SALARY: "Staff Salaries",
  UTILITIES: "Rent & Utilities",
  OTHERS: "Miscellaneous Costs",
};

export default function ReportsPage() {
  const { user } = useAuth();

  // Date filters (defaults to current month)
  const defaultStartDate = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  };
  const defaultEndDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());

  // Data states
  const [summary, setSummary] = useState<ReportSummary>({
    grossSalesRevenue: 0,
    salesProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    ordersCount: 0,
    expensesCount: 0,
  });
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [partnerShares, setPartnerShares] = useState<PartnerShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active report tab: "products" | "expenses" | "partners"
  const [activeTab, setActiveTab] = useState<"products" | "expenses" | "partners">("products");

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.set("startDate", startDate);
      if (endDate) queryParams.set("endDate", endDate);

      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load reports data");
      }
      const data = await res.json();
      setSummary(data.summary || {
        grossSalesRevenue: 0,
        salesProfit: 0,
        totalExpenses: 0,
        netProfit: 0,
        ordersCount: 0,
        expensesCount: 0,
      });
      setTopProducts(data.topProducts || []);
      setExpenseBreakdown(data.expenseCategoryBreakdown || []);
      setPartnerShares(data.partnerShareList || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while compiling business reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    const headers = ["Metric Title", "Computed Value"];
    const rows = [
      ["Date Range Start", startDate],
      ["Date Range End", endDate],
      ["Total Sales Volume", `${summary.ordersCount} orders`],
      ["Gross Sales Revenue", `৳${summary.grossSalesRevenue} BDT`],
      ["Direct Sales Profit", `৳${summary.salesProfit} BDT`],
      ["Total Operational Expense", `৳${summary.totalExpenses} BDT`],
      ["Net Business Profit", `৳${summary.netProfit} BDT`],
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `klader_statement_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintStatement = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const topProductsHtml = topProducts.map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 0;">${idx + 1}</td>
        <td style="padding: 8px 0;"><strong>${p.name}</strong><br/><small style="color: #64748b;">SKU: ${p.sku}</small></td>
        <td style="padding: 8px 0; text-align: center;">${p.qty} pcs</td>
        <td style="padding: 8px 0; text-align: right;">৳${p.revenue.toLocaleString()}</td>
        <td style="padding: 8px 0; text-align: right; color: #059669; font-weight: bold;">৳${p.profit.toLocaleString()}</td>
      </tr>
    `).join("");

    const expenseCategoryHtml = expenseBreakdown.map((e) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 0;"><strong>${CATEGORY_LABELS[e.category] || e.category}</strong></td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #b6142c;">৳${e.amount.toLocaleString()}</td>
      </tr>
    `).join("");

    const partnerSharesHtml = partnerShares.map((p) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 0;"><strong>${p.name}</strong><br/><small style="color: #64748b;">Type: ${p.partnerType}</small></td>
        <td style="padding: 8px 0; text-align: center;">${p.ownershipPercentage}%</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #7b0a1c;">৳${Math.round(p.projectedShare).toLocaleString()} BDT</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Statement Report - Klader Bangladesh</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { border-bottom: 2px solid #7b0a1c; padding-bottom: 20px; display: flex; justify-content: space-between; }
            .brand { font-size: 24px; font-weight: 800; color: #161f28; }
            .subtitle { font-size: 10px; color: #7b0a1c; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
            .report-title { text-align: right; }
            .grid-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 30px; }
            .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
            .stat-title { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .stat-value { font-size: 16px; font-weight: 800; margin-top: 5px; }
            .section { margin-top: 40px; }
            .section-title { font-size: 12px; font-weight: 800; border-bottom: 1px solid #7b0a1c; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase; color: #161f28; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; padding-bottom: 8px; }
            .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">KLADER</div>
              <div class="subtitle">Bangladesh</div>
              <p style="font-size: 10px; color: #64748b; margin: 5px 0 0 0;">Fashion & Apparel Business Control</p>
            </div>
            <div class="report-title">
              <h2 style="margin: 0; color: #7b0a1c; font-size: 20px;">FINANCIAL STATEMENT</h2>
              <p style="font-size: 11px; margin: 5px 0;">Reporting Period: <strong>${new Date(startDate).toLocaleDateString()}</strong> to <strong>${new Date(endDate).toLocaleDateString()}</strong></p>
            </div>
          </div>

          <div class="grid-stats">
            <div class="stat-card">
              <div class="stat-title">Gross Revenue</div>
              <div class="stat-value" style="color: #1e293b;">৳${summary.grossSalesRevenue.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Direct Sales Profit</div>
              <div class="stat-value" style="color: #059669;">৳${summary.salesProfit.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Operating Overhead</div>
              <div class="stat-value" style="color: #b6142c;">৳${summary.totalExpenses.toLocaleString()}</div>
            </div>
            <div class="stat-card" style="background: #fef5f6; border-color: #fbcfe8;">
              <div class="stat-title" style="color: #7b0a1c;">Net Business Income</div>
              <div class="stat-value" style="color: #7b0a1c;">৳${summary.netProfit.toLocaleString()}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Sales Performance Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 5%">#</th>
                  <th style="width: 45%">Catalog Item Details</th>
                  <th style="width: 15%; text-align: center;">Units Sold</th>
                  <th style="width: 15%; text-align: right;">Gross Retail Value</th>
                  <th style="width: 20%; text-align: right;">Net Profit Yield</th>
                </tr>
              </thead>
              <tbody>
                ${topProductsHtml || '<tr><td colspan="5" style="padding: 15px; text-align: center;">No product sales recorded in period.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div style="display: flex; justify-content: space-between;" class="section">
            <div style="width: 48%;">
              <div class="section-title">Overhead Deductions</div>
              <table>
                <thead>
                  <tr>
                    <th>Expense Category</th>
                    <th style="text-align: right;">Sum Outflow</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenseCategoryHtml || '<tr><td colspan="2" style="padding: 15px; text-align: center;">No expenses recorded in period.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div style="width: 48%;">
              <div class="section-title">Projected Dividend Share</div>
              <table>
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th style="text-align: center;">Ownership</th>
                    <th style="text-align: right;">Dividends Yield</th>
                  </tr>
                </thead>
                <tbody>
                  ${partnerSharesHtml || '<tr><td colspan="3" style="padding: 15px; text-align: center;">No partner records available.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer">
            <p>Generated by Klader Enterprise control console. Confidential Statement for Partner Review Only.</p>
            <p>Run date: ${new Date().toLocaleString()}</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Page Title & Exports */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-extrabold text-slate-800 dark:text-white">
              Reports & Statement Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select date ranges to generate formal financial statements, review popular SKUs, and view dividend projections.
            </p>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-600 dark:text-slate-350"
            >
              <Download className="h-4 w-4" />
              Export Sheet
            </button>
            <button
              onClick={handlePrintStatement}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-logo text-white rounded-xl text-xs font-bold hover:shadow-md transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Statement
            </button>
          </div>
        </div>

        {/* Date Selector filters panel */}
        <div className="glass-panel p-4 rounded-2xl shadow-premium flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-slate-400" />
            <span className="font-bold text-slate-650 dark:text-slate-300 uppercase tracking-wider">Statement Period:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white"
            />
          </div>

          <button
            onClick={() => {
              setStartDate(defaultStartDate());
              setEndDate(defaultEndDate());
            }}
            className="p-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 font-semibold"
          >
            Reset
          </button>
        </div>

        {/* KPI metrics cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Gross sales Revenue
                </span>
                <span className="text-2xl font-display font-extrabold text-slate-800 dark:text-white mt-1 block">
                  ৳ {summary.grossSalesRevenue.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-655">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-550">
              <span className="font-semibold text-slate-700 dark:text-slate-350">{summary.ordersCount}</span> completed sales orders.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Direct Sales Margin
                </span>
                <span className="text-2xl font-display font-extrabold text-status-success mt-1 block">
                  ৳ {summary.salesProfit.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-status-success-light text-status-success">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Items retail markup before overheads.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Operating Overhead
                </span>
                <span className="text-2xl font-display font-extrabold text-brand-crimson mt-1 block">
                  ৳ {summary.totalExpenses.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-status-danger-light text-status-danger">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-550">
              <span className="font-semibold text-slate-700 dark:text-slate-350">{summary.expensesCount}</span> logged outflow entries.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden bg-gradient-to-br from-white to-brand-wine-light/20 dark:from-[#161f28] dark:to-brand-wine/5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Net Business Income
                </span>
                <span className={`text-2xl font-display font-extrabold mt-1 block ${summary.netProfit >= 0 ? "text-brand-wine dark:text-brand-peach" : "text-brand-crimson"}`}>
                  ৳ {summary.netProfit.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-wine/10 dark:bg-brand-peach/10 text-brand-wine dark:text-brand-peach">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-550">
              Undistributed profit after all operational deductions.
            </div>
          </div>
        </div>

        {/* Tab Selection panel */}
        <div className="glass-panel rounded-2xl shadow-premium overflow-hidden">
          
          {/* Tab selector menu */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 p-1.5 gap-1">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-white dark:bg-[#161f28] text-brand-wine dark:text-brand-peach shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              SKU Sales Volume
            </button>

            <button
              onClick={() => setActiveTab("expenses")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "expenses"
                  ? "bg-white dark:bg-[#161f28] text-brand-wine dark:text-brand-peach shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
            >
              <FileBarChart2 className="h-4 w-4" />
              Overhead Breakdown
            </button>

            <button
              onClick={() => setActiveTab("partners")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "partners"
                  ? "bg-white dark:bg-[#161f28] text-brand-wine dark:text-brand-peach shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40"
              }`}
            >
              <Users className="h-4 w-4" />
              Dividends Allocation
            </button>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse font-medium">
                Compiling statement details...
              </div>
            ) : (
              <>
                {/* 1. Tab: SKU Sales Performance */}
                {activeTab === "products" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Top Selling Catalog SKUs</h3>
                    
                    {topProducts.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">No product sales records in this period.</div>
                    ) : (
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-3">
                              <th className="py-3">SKU</th>
                              <th className="py-3">Product Name</th>
                              <th className="py-3 text-center">Quantity Sold</th>
                              <th className="py-3 text-right">Revenue Generated</th>
                              <th className="py-3 text-right">Profit Contribution</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {topProducts.map((p) => (
                              <tr key={p.sku} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/5">
                                <td className="py-3 font-mono font-bold text-slate-600 dark:text-slate-400">{p.sku}</td>
                                <td className="py-3 font-semibold text-slate-800 dark:text-slate-150">{p.name}</td>
                                <td className="py-3 text-center font-bold text-slate-700 dark:text-slate-350">{p.qty} pcs</td>
                                <td className="py-3 text-right font-medium text-slate-655 dark:text-slate-350">৳{p.revenue.toLocaleString()}</td>
                                <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-450">৳{p.profit.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Tab: Expenses Overhead */}
                {activeTab === "expenses" && (
                  <div className="space-y-4 max-w-md">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Overhead Expenses by Category</h3>
                    
                    {expenseBreakdown.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">No expense records in this period.</div>
                    ) : (
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-3">
                              <th className="py-3">Category</th>
                              <th className="py-3 text-right">Total Outflow</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {expenseBreakdown.map((eb) => (
                              <tr key={eb.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/5">
                                <td className="py-3 font-semibold text-slate-770 dark:text-slate-300">
                                  {CATEGORY_LABELS[eb.category] || eb.category}
                                </td>
                                <td className="py-3 text-right font-bold text-brand-crimson">
                                  ৳{eb.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tab: Partner Dividend Distributions */}
                {activeTab === "partners" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Estimated Dividends Projections</h3>
                    <p className="text-[10px] text-slate-400 -mt-2">Based on business net profit of <strong>৳{summary.netProfit.toLocaleString()} BDT</strong> for the selected date range.</p>
                    
                    {partnerShares.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">No partner accounts database.</div>
                    ) : (
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pb-3">
                              <th className="py-3">Partner Name</th>
                              <th className="py-3">Type</th>
                              <th className="py-3 text-center">Ownership Share</th>
                              <th className="py-3 text-right">Projected Income Yield</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {partnerShares.map((ps) => (
                              <tr key={ps.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/5">
                                <td className="py-3 font-semibold text-slate-800 dark:text-slate-150">{ps.name}</td>
                                <td className="py-3 text-slate-500 uppercase text-[9px] font-bold">{ps.partnerType}</td>
                                <td className="py-3 text-center font-bold text-slate-700 dark:text-slate-350">{ps.ownershipPercentage}%</td>
                                <td className="py-3 text-right font-bold text-brand-wine dark:text-brand-peach">
                                  ৳{Math.round(ps.projectedShare).toLocaleString()} BDT
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
