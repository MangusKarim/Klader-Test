// src/app/expenses/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileText,
  Calendar,
  Check,
  X,
  TrendingDown,
  PieChart,
  Link as LinkIcon
} from "lucide-react";

interface Expense {
  id: number;
  category: string;
  amount: number;
  description: string;
  attachmentUrl: string | null;
  date: string;
  createdAt: string;
}

interface CategoryChartData {
  category: string;
  amount: number;
  percentage: number;
}

const CATEGORY_MAP: { [key: string]: { label: string; color: string } } = {
  ONLINE_BOOSTING: { label: "Online Boosting (Ad-spend)", color: "bg-brand-steel" },
  PACKAGING: { label: "Packaging Materials", color: "bg-brand-rosewood" },
  ACCESSORIES: { label: "Fashion Accessories", color: "bg-brand-bronze" },
  MARKETING: { label: "Marketing & PR", color: "bg-brand-peach" },
  TRANSPORT: { label: "Transport & Logistics", color: "bg-brand-slate" },
  SALARY: { label: "Staff Salaries", color: "bg-brand-sage" },
  UTILITIES: { label: "Rent & Utilities", color: "bg-brand-wine" },
  OTHERS: { label: "Miscellaneous Costs", color: "bg-brand-crimson" },
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "STAFF";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [chartData, setChartData] = useState<CategoryChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Form input states
  const [expCategory, setExpCategory] = useState("ONLINE_BOOSTING");
  const [expAmount, setExpAmount] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expAttachment, setExpAttachment] = useState("");

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (selectedCategory) queryParams.set("category", selectedCategory);
      if (startDate) queryParams.set("startDate", startDate);
      if (endDate) queryParams.set("endDate", endDate);

      const res = await fetch(`/api/expenses?${queryParams.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load expenses");
      }
      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotalExpenses(data.totalExpenses || 0);
      setChartData(data.categoryChartData || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while loading expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [search, selectedCategory, startDate, endDate]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expCategory,
          amount: parseFloat(expAmount),
          description: expDescription,
          date: expDate,
          attachmentUrl: expAttachment || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log expense");

      setSuccessMsg(`Expense recorded successfully`);
      setShowAddModal(false);
      resetForm();
      fetchExpenses();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    try {
      const res = await fetch("/api/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedExpense.id,
          category: expCategory,
          amount: parseFloat(expAmount),
          description: expDescription,
          date: expDate,
          attachmentUrl: expAttachment || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update expense");

      setSuccessMsg(`Expense details updated successfully`);
      setShowEditModal(false);
      resetForm();
      fetchExpenses();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteExpense = async (id: number, amt: number) => {
    if (!confirm(`Are you sure you want to delete this expense of ৳${amt.toLocaleString()} BDT?`)) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete expense");

      setSuccessMsg(`Expense log removed successfully`);
      fetchExpenses();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setExpCategory("ONLINE_BOOSTING");
    setExpAmount("");
    setExpDescription("");
    setExpDate(new Date().toISOString().split("T")[0]);
    setExpAttachment("");
    setSelectedExpense(null);
  };

  const openEditModal = (e: Expense) => {
    setSelectedExpense(e);
    setExpCategory(e.category);
    setExpAmount(e.amount.toString());
    setExpDescription(e.description);
    setExpDate(e.date.split("T")[0]);
    setExpAttachment(e.attachmentUrl || "");
    setShowEditModal(true);
  };

  // Quick stats derived
  const boostingTotal = expenses.filter(e => e.category === "ONLINE_BOOSTING").reduce((sum, e) => sum + e.amount, 0);
  const salaryTotal = expenses.filter(e => e.category === "SALARY").reduce((sum, e) => sum + e.amount, 0);
  const opsTotal = expenses.filter(e => e.category === "PACKAGING" || e.category === "TRANSPORT").reduce((sum, e) => sum + e.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Page Title & Add CTA */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-extrabold text-slate-800 dark:text-white">
              Expense Log & Outflows
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track business operational outflows, including advertising boost costs, salaries, logistics, and rent.
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-logo text-white rounded-xl text-xs font-bold hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Record New Expense
            </button>
          )}
        </div>

        {/* Message Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
            <Check className="h-5 w-5 flex-shrink-0" />
            <span className="text-xs font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Financial KPI metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden bg-gradient-to-br from-white to-red-50/20 dark:from-[#161f28] dark:to-red-950/5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Total Business Expenses
                </span>
                <span className="text-2xl font-display font-extrabold text-brand-crimson mt-1 block">
                  ৳ {totalExpenses.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-brand-crimson">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Cumulative operations cost recorded.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Online Boosting Spend
                </span>
                <span className="text-2xl font-display font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
                  ৳ {boostingTotal.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Facebook / Instagram marketing ad-spend.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Logistics & Packaging
                </span>
                <span className="text-2xl font-display font-extrabold text-indigo-650 dark:text-indigo-400 mt-1 block">
                  ৳ {opsTotal.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Delivery box, wrapper sheets, and delivery courier costs.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Staff Salaries
                </span>
                <span className="text-2xl font-display font-extrabold text-teal-600 dark:text-teal-400 mt-1 block">
                  ৳ {salaryTotal.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-550">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Payroll and sales commission distributions.
            </div>
          </div>
        </div>

        {/* Expenses List & Category breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Expense Table (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filters panel */}
            <div className="glass-panel p-4 rounded-2xl shadow-premium space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                
                {/* Search */}
                <div className="flex-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search expenses by description..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine"
                  />
                </div>

                {/* Category dropdown */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-700 dark:text-slate-350"
                >
                  <option value="">All Categories</option>
                  {Object.keys(CATEGORY_MAP).map(key => (
                    <option key={key} value={key}>{CATEGORY_MAP[key].label}</option>
                  ))}
                </select>
              </div>

              {/* Date Filters */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/40 text-xs">
                <span className="text-slate-400 font-bold flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-1 px-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-750 text-xs"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-1 px-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-750 text-xs"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(""); setEndDate(""); }}
                    className="p-1 hover:text-brand-crimson text-slate-400"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </div>

            {/* List Table */}
            <div className="glass-panel rounded-2xl shadow-premium overflow-hidden">
              {loading ? (
                <div className="py-20 text-center text-xs text-slate-400 animate-pulse font-medium">
                  Fetching expense records...
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-450 dark:text-slate-500 font-medium">
                  No expense records logged.
                </div>
              ) : (
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/20 dark:bg-slate-900/5">
                        <th className="px-5 py-4">Expense Details</th>
                        <th className="px-4 py-4">Category</th>
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4 text-right">Amount</th>
                        <th className="px-4 py-4 text-center">Receipt</th>
                        {canEdit && <th className="px-5 py-4 text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10">
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-150 block">{e.description}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">ID: {e.id}</span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-350">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${CATEGORY_MAP[e.category]?.color || "bg-slate-400"}`} />
                              {CATEGORY_MAP[e.category]?.label || e.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-mono">
                            {new Date(e.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-brand-crimson">
                            ৳{e.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {e.attachmentUrl ? (
                              <a
                                href={e.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-brand-wine dark:text-brand-peach"
                                title="View attached receipt image"
                              >
                                <FileText className="h-4.5 w-4.5" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">None</span>
                            )}
                          </td>
                          {canEdit && (
                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openEditModal(e)}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                  title="Edit entry details"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(e.id, e.amount)}
                                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-brand-crimson"
                                  title="Delete entry"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Side analytics breakdown (1 col) */}
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-2xl shadow-premium space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <PieChart className="h-4.5 w-4.5 text-brand-wine dark:text-brand-peach" /> Cost Breakdown
              </h3>
              <p className="text-[10px] text-slate-450 mt-1">Operational budget allocation percentages.</p>
              
              <div className="space-y-3.5 pt-2">
                {chartData.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No data available</div>
                ) : (
                  chartData.map((cd) => (
                    <div key={cd.category} className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{CATEGORY_MAP[cd.category]?.label || cd.category}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-150">৳{cd.amount.toLocaleString()} ({Math.round(cd.percentage)}%)</span>
                      </div>
                      
                      {/* Premium visual bar representation */}
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${CATEGORY_MAP[cd.category]?.color || "bg-slate-400"}`}
                          style={{ width: `${cd.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* MODALS */}
      
      {/* 1. Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-heavy animate-slide-up space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
                <Receipt className="h-4.5 w-4.5 text-brand-wine" /> Log Business Outflow
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs text-slate-700 dark:text-slate-350">
              <div className="space-y-1">
                <label className="font-bold">Expense Category *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                >
                  {Object.keys(CATEGORY_MAP).map(key => (
                    <option key={key} value={key}>{CATEGORY_MAP[key].label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Amount (BDT) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Billing Date *</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">Description / Purpose *</label>
                <textarea
                  required
                  rows={2}
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="e.g. Facebook campaign boosting for Eid collection promo"
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold block">Receipt Attachment URL</label>
                <input
                  type="url"
                  value={expAttachment}
                  onChange={(e) => setExpAttachment(e.target.value)}
                  placeholder="https://example.com/receipt.jpg"
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
                <span className="text-[9px] text-slate-400 block mt-1">Provide a URL link to simulate receipt file uploads.</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-logo text-white rounded-xl font-bold hover:shadow-md cursor-pointer text-xs"
              >
                Log Expense Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Expense Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-heavy animate-slide-up space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-brand-wine" /> Edit Expense Log Entry
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditExpense} className="space-y-3.5 text-xs text-slate-700 dark:text-slate-350">
              <div className="space-y-1">
                <label className="font-bold">Expense Category *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                >
                  {Object.keys(CATEGORY_MAP).map(key => (
                    <option key={key} value={key}>{CATEGORY_MAP[key].label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Amount (BDT) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Billing Date *</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">Description / Purpose *</label>
                <textarea
                  required
                  rows={2}
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold block">Receipt Attachment URL</label>
                <input
                  type="url"
                  value={expAttachment}
                  onChange={(e) => setExpAttachment(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-logo text-white rounded-xl font-bold hover:shadow-md cursor-pointer text-xs"
              >
                Save Outflow Entry
              </button>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
