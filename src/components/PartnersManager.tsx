// src/components/PartnersManager.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  TrendingUp,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Key
} from "lucide-react";

interface Partner {
  id: number;
  name: string;
  phone: string;
  investmentAmount: number;
  ownershipPercentage: number;
  partnerType: string;
  createdAt: string;
  userId: number | null;
  username: string | null;
  totalInvestments: number;
  totalWithdrawals: number;
  profitShare: number;
  remainingBalance: number;
}

interface Transaction {
  id: number;
  partnerId: number;
  partner: { name: string };
  type: "INVESTMENT" | "WITHDRAWAL";
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: string;
  approvedBy: string | null;
  description: string;
  createdAt: string;
}

interface CompanySummary {
  companySalesProfit: number;
  companyExpenses: number;
  netProfit: number;
  undistributedReserve: number;
}

export default function PartnersManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Data states
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<CompanySummary>({
    companySalesProfit: 0,
    companyExpenses: 0,
    netProfit: 0,
    undistributedReserve: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // Form inputs - Add Partner
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerType, setPartnerType] = useState("INVESTOR");
  const [ownershipPct, setOwnershipPct] = useState("0");
  const [initialInv, setInitialInv] = useState("0");
  const [partnerUsername, setPartnerUsername] = useState("");
  const [partnerPassword, setPartnerPassword] = useState("");

  // Form inputs - Edit Partner
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [additionalInv, setAdditionalInv] = useState("0");

  // Form inputs - Transaction Request
  const [txPartnerId, setTxPartnerId] = useState("");
  const [txType, setTxType] = useState<"INVESTMENT" | "WITHDRAWAL">("WITHDRAWAL");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/partners");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load partners data");
      }
      const data = await res.json();
      setPartners(data.partners || []);
      setTransactions(data.transactions || []);
      setSummary(data.companySummary || {
        companySalesProfit: 0,
        companyExpenses: 0,
        netProfit: 0,
        undistributedReserve: 0,
      });
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching partners data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Add Partner
  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: partnerName,
          phone: partnerPhone,
          partnerType,
          ownershipPercentage: parseFloat(ownershipPct),
          investmentAmount: parseFloat(initialInv),
          username: partnerUsername.trim() || undefined,
          password: partnerPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add partner");

      setSuccessMsg(`Successfully added partner: ${partnerName}`);
      setShowAddModal(false);
      resetPartnerForm();
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Edit Partner
  const handleEditPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    try {
      const res = await fetch("/api/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          name: partnerName,
          phone: partnerPhone,
          partnerType,
          ownershipPercentage: parseFloat(ownershipPct),
          username: editUsername.trim() || (editUsername === "" ? "" : undefined),
          password: editPassword || undefined,
          additionalInvestment: parseFloat(additionalInv),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update partner");

      setSuccessMsg(`Successfully updated partner: ${partnerName}`);
      setShowEditModal(false);
      resetPartnerForm();
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Delete Partner
  const handleDeletePartner = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove partner "${name}"? All transaction logs and user login credentials for this partner will be deleted.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/partners?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete partner");

      setSuccessMsg(`Successfully removed partner: ${name}`);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Request Transaction
  const handleRequestTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pId = txPartnerId || (user?.role === "PARTNER" ? partners.find(p => p.userId === user.id)?.id : "");
      if (!pId) throw new Error("Please select a partner profile");

      const res = await fetch("/api/partners/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: parseInt(pId.toString()),
          type: txType,
          amount: parseFloat(txAmount),
          description: txDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit transaction request");

      const actionText = txType === "INVESTMENT" ? "investment" : "withdrawal";
      const statusText = isAdmin ? "approved and logged" : "submitted for admin approval";
      setSuccessMsg(`Successfully ${statusText} ${actionText} of ৳${parseFloat(txAmount).toLocaleString()} BDT`);
      
      setShowTxModal(false);
      resetTxForm();
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Approve/Reject Transaction (Admin Only)
  const handleProcessTx = async (id: number, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch("/api/partners/transaction/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action.toLowerCase()} transaction`);

      setSuccessMsg(`Transaction request was ${action === "APPROVE" ? "approved" : "rejected"} successfully`);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetPartnerForm = () => {
    setPartnerName("");
    setPartnerPhone("");
    setPartnerType("INVESTOR");
    setOwnershipPct("0");
    setInitialInv("0");
    setPartnerUsername("");
    setPartnerPassword("");
    setEditUsername("");
    setEditPassword("");
    setAdditionalInv("0");
    setSelectedPartner(null);
  };

  const resetTxForm = () => {
    setTxPartnerId("");
    setTxType("WITHDRAWAL");
    setTxAmount("");
    setTxDescription("");
  };

  const openEditModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setPartnerName(partner.name);
    setPartnerPhone(partner.phone);
    setPartnerType(partner.partnerType);
    setOwnershipPct(partner.ownershipPercentage.toString());
    setEditUsername(partner.username || "");
    setEditPassword("");
    setAdditionalInv("0");
    setShowEditModal(true);
  };

  const openTxModal = (partner?: Partner) => {
    resetTxForm();
    if (partner) {
      setTxPartnerId(partner.id.toString());
    } else if (user?.role === "PARTNER") {
      const p = partners.find(p => p.userId === user.id);
      if (p) setTxPartnerId(p.id.toString());
    }
    setShowTxModal(true);
  };

  // Filter partners list
  const filteredPartners = partners.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery) ||
    p.partnerType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Derived calculations
  const totalEquityInvested = partners.reduce((sum, p) => sum + p.totalInvestments, 0);
  const totalEquityWithdrawn = partners.reduce((sum, p) => sum + p.totalWithdrawals, 0);

  return (
    <div className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-extrabold text-slate-800 dark:text-white">
            Partner Accounts & Investment Ledgers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage partner profiles, login credentials, track dividends/ownership, and put investments.
          </p>
        </div>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => openTxModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all cursor-pointer shadow-sm border border-slate-700/30"
          >
            <Wallet className="h-4 w-4" />
            Request Transaction
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                resetPartnerForm();
                setShowAddModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-logo text-white rounded-xl text-xs font-bold hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add New Partner
            </button>
          )}
        </div>
      </div>

      {/* Banner Alert for Messages */}
      {successMsg && (
        <div className="p-4 bg-status-success-light text-status-success border border-status-success/20 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                Total Partners
              </span>
              <span className="text-2xl font-display font-extrabold text-slate-800 dark:text-white mt-1 block">
                {partners.length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="font-semibold text-brand-wine dark:text-brand-peach">
              {partners.filter(p => p.partnerType === "INVESTOR").length} Active Investors
            </span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                Total Contributions
              </span>
              <span className="text-2xl font-display font-extrabold text-status-success mt-1 block">
                ৳ {totalEquityInvested.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-status-success-light text-status-success">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500">
            Aggregated capital paid into business reserves.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                Total Withdrawals
              </span>
              <span className="text-2xl font-display font-extrabold text-status-warning mt-1 block">
                ৳ {totalEquityWithdrawn.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-status-warning-light text-status-warning">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500">
            Approved funds withdrawn by partners.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden bg-gradient-to-br from-white to-brand-wine-light/20 dark:from-[#161f28] dark:to-brand-wine/5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                Undistributed Reserve
              </span>
              <span className="text-2xl font-display font-extrabold text-brand-wine dark:text-brand-peach mt-1 block">
                ৳ {summary.undistributedReserve.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-wine/10 dark:bg-brand-peach/10 text-brand-wine dark:text-brand-peach">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
            <span>Company Net Profit:</span>
            <span className={`font-semibold ${summary.netProfit >= 0 ? "text-status-success" : "text-brand-crimson"}`}>
              ৳ {summary.netProfit.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Partners Listing Grid & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partners profiles list (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-2xl shadow-premium overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/10">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Partner Profiles</h3>
              
              {/* Search Inputs */}
              <div className="w-full sm:w-64 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search partners or username..."
                  className="w-full pl-3 pr-8 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400 animate-pulse font-medium">
                Fetching partner profiles...
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-500 font-medium">
                No partners found.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/20 dark:bg-slate-900/5">
                      <th className="px-5 py-4">Name & Contact</th>
                      <th className="px-4 py-4">Share %</th>
                      <th className="px-4 py-4 text-right">Contributed</th>
                      <th className="px-4 py-4 text-right">Withdrawn</th>
                      <th className="px-4 py-4 text-right">Net Share</th>
                      <th className="px-5 py-4 text-right">Balance</th>
                      {isAdmin && <th className="px-5 py-4 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredPartners.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 cursor-pointer"
                        onClick={() => {
                          setSelectedPartner(p);
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 space-y-0.5">
                            <div>{p.phone} &bull; <span className="uppercase text-[9px] font-bold text-brand-wine dark:text-brand-peach">{p.partnerType}</span></div>
                            {p.username && (
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium text-[9px]">
                                <Key className="h-2.5 w-2.5 text-brand-bronze" /> Username: <span className="font-mono text-brand-steel dark:text-slate-300">{p.username}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                            {p.ownershipPercentage}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                          ৳{p.totalInvestments.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400">
                          ৳{p.totalWithdrawals.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right text-status-success font-medium">
                          ৳{Math.round(p.profitShare).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-brand-wine dark:text-brand-peach">
                          ৳{Math.round(p.remainingBalance).toLocaleString()}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                title="Edit Profile & Login"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePartner(p.id, p.name)}
                                className="p-1 rounded hover:bg-status-danger-light text-slate-450 hover:text-status-danger"
                                title="Remove Partner"
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

          {/* Formulas Explainer */}
          <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex gap-3 text-slate-500">
            <HelpCircle className="h-5 w-5 text-slate-450 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold text-slate-700 dark:text-slate-350 block mb-0.5">Partner Balance Formula:</span>
              <code>Remaining Balance = (Company Net Profit &times; Ownership %) + Approved Investments - Approved Withdrawals.</code>
              <span className="block mt-1">Withdrawal approvals automatically verify that the partner has sufficient balance remaining before approval.</span>
            </div>
          </div>
        </div>

        {/* Transaction Logs Approval Stream */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl shadow-premium overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Transaction Logs</h3>
              <p className="text-[10px] text-slate-400 mt-1">Pending requests require Administrator approvals.</p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Loading logs...
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No transactions found.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-4 space-y-2 hover:bg-slate-50/30 dark:hover:bg-slate-800/5 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                          {tx.partner?.name || "Deleted Partner"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Requested: {tx.requestedBy} &bull; {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          tx.status === "APPROVED"
                            ? "bg-status-success-light text-status-success"
                            : tx.status === "PENDING"
                            ? "bg-status-warning-light text-status-warning animate-pulse"
                            : "bg-status-danger-light text-status-danger"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-end pt-1">
                      <div className="text-[11px] text-slate-500 max-w-[170px] truncate" title={tx.description}>
                        {tx.description}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-extrabold flex items-center gap-0.5 justify-end ${
                            tx.type === "INVESTMENT"
                              ? "text-status-success"
                              : "text-status-warning"
                          }`}
                        >
                          {tx.type === "INVESTMENT" ? "+" : "-"} ৳{tx.amount.toLocaleString()}
                        </span>
                        <span className="text-[9px] block text-slate-400 font-bold uppercase">{tx.type}</span>
                      </div>
                    </div>

                    {/* Admin Action Buttons */}
                    {isAdmin && tx.status === "PENDING" && (
                      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                        <button
                          onClick={() => handleProcessTx(tx.id, "REJECT")}
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-status-danger-light hover:text-status-danger text-[10px] font-bold transition-all text-slate-600 cursor-pointer"
                        >
                          <X className="h-3 w-3" /> Reject
                        </button>
                        <button
                          onClick={() => handleProcessTx(tx.id, "APPROVE")}
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-brand-wine/10 dark:bg-brand-peach/10 text-brand-wine dark:text-brand-peach hover:bg-brand-wine hover:text-white dark:hover:bg-brand-peach dark:hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                        >
                          <Check className="h-3 w-3" /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      
      {/* 1. Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-heavy animate-slide-up space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-brand-wine" /> Add Partner Profile
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddPartner} className="space-y-3.5 text-xs text-slate-700 dark:text-slate-350">
              <div className="space-y-1">
                <label className="font-bold">Partner Name *</label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g. Rafsan"
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="e.g. 017XXXXXXXX"
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Ownership Share (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={ownershipPct}
                    onChange={(e) => setOwnershipPct(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Partner Type</label>
                  <select
                    value={partnerType}
                    onChange={(e) => setPartnerType(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                  >
                    <option value="INVESTOR">Investing Partner</option>
                    <option value="NON_INVESTING">Non-Investing</option>
                    <option value="SILENT">Silent Partner</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">Initial Capital Contribution (BDT)</label>
                <input
                  type="number"
                  min="0"
                  value={initialInv}
                  onChange={(e) => setInitialInv(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono font-bold text-brand-wine dark:text-brand-peach"
                />
              </div>

              {/* Login Credentials Section */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3.5 space-y-3">
                <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-brand-bronze" /> Create Login Credentials (Optional)
                </span>
                <p className="text-[10px] text-slate-400">If filled, this partner can log in to view their ledger directly.</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-650">Login Username</label>
                    <input
                      type="text"
                      value={partnerUsername}
                      onChange={(e) => setPartnerUsername(e.target.value)}
                      placeholder="e.g. rafsan"
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-650">Login Password</label>
                    <input
                      type="password"
                      value={partnerPassword}
                      onChange={(e) => setPartnerPassword(e.target.value)}
                      placeholder="e.g. rafsan123"
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-logo text-white rounded-xl font-bold hover:shadow-md cursor-pointer text-xs"
              >
                Create Partner & Record Capital
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Partner Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-heavy animate-slide-up space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-brand-wine" /> Edit Partner details
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditPartner} className="space-y-3.5 text-xs text-slate-700 dark:text-slate-350">
              <div className="space-y-1">
                <label className="font-bold">Partner Name *</label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Ownership Share (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={ownershipPct}
                    onChange={(e) => setOwnershipPct(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Partner Type</label>
                  <select
                    value={partnerType}
                    onChange={(e) => setPartnerType(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                  >
                    <option value="INVESTOR">Investing Partner</option>
                    <option value="NON_INVESTING">Non-Investing</option>
                    <option value="SILENT">Silent Partner</option>
                  </select>
                </div>
              </div>

              {/* Direct Investment Increments */}
              <div className="p-3.5 bg-brand-wine-light/30 border border-brand-wine/10 rounded-2xl space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-white block">
                  Invest More Capital (BDT)
                </span>
                <p className="text-[10px] text-slate-400">Put a capital injection amount here to instantly add and approve an investment transaction.</p>
                <input
                  type="number"
                  min="0"
                  value={additionalInv}
                  onChange={(e) => setAdditionalInv(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono font-bold text-brand-wine dark:text-brand-peach"
                />
              </div>

              {/* Edit Credentials */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3.5 space-y-3">
                <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-brand-bronze" /> Update Login Credentials
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-650">Login Username</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="No login account"
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-650">New Password</label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Leave blank to keep same"
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-logo text-white rounded-xl font-bold hover:shadow-md cursor-pointer text-xs"
              >
                Save Details & Update Capital
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Request Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-heavy animate-slide-up space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Wallet className="h-4.5 w-4.5 text-brand-wine" /> Request Partner Transaction
              </h3>
              <button
                onClick={() => setShowTxModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRequestTx} className="space-y-3.5 text-xs text-slate-700 dark:text-slate-350">
              {user?.role === "PARTNER" ? (
                <div className="space-y-1">
                  <label className="font-bold">Partner Account</label>
                  <input
                    type="text"
                    disabled
                    value={partners.find(p => p.userId === user.id)?.name || user.name}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold">Select Partner</label>
                  <select
                    required
                    value={txPartnerId}
                    onChange={(e) => setTxPartnerId(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  >
                    <option value="">-- Choose Partner --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Bal: ৳{Math.round(p.remainingBalance).toLocaleString()} BDT)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Transaction Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType("WITHDRAWAL")}
                      className={`flex-1 py-2 rounded-xl text-center font-bold border transition-all ${
                        txType === "WITHDRAWAL"
                          ? "bg-status-warning-light text-status-warning border-status-warning/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-500"
                      }`}
                    >
                      Withdrawal
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType("INVESTMENT")}
                      className={`flex-1 py-2 rounded-xl text-center font-bold border transition-all ${
                        txType === "INVESTMENT"
                          ? "bg-status-success-light text-status-success border-status-success/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-500"
                      }`}
                    >
                      Investment
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Amount (BDT)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="BDT amount"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">Description / Purpose</label>
                <textarea
                  required
                  rows={3}
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="e.g. Monthly dividend payout / Q2 Capital contribution"
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white resize-none"
                />
              </div>

              {isAdmin && (
                <div className="p-3 bg-status-success-light/30 border border-status-success/10 rounded-xl text-[10px] text-status-success">
                  <strong>Notice:</strong> As Main Admin, submitting this form will auto-approve and apply the transaction instantly.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-logo text-white rounded-xl font-bold hover:shadow-md cursor-pointer text-xs"
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
