// src/app/inventory/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PartnersManager from "@/components/PartnersManager";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  Edit2,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  QrCode,
  List,
  LayoutGrid,
  Check,
  X,
  RefreshCw,
  TrendingUp,
  Coins
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  color: string;
  size: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  imageUrl: string | null;
  supplierName: string;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  createdAt: string;
}

interface FilterOptions {
  categories: string[];
  sizes: string[];
  colors: string[];
}

export default function InventoryPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "STAFF";

  const [activeTab, setActiveTab] = useState<"stock" | "partners">("stock");
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({ categories: [], sizes: [], colors: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter values
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Visual layout mode: "list" or "cards"
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form input states
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodColor, setProdColor] = useState("");
  const [prodSize, setProdSize] = useState("");
  const [prodBuyingPrice, setProdBuyingPrice] = useState("");
  const [prodSellingPrice, setProdSellingPrice] = useState("");
  const [prodQuantity, setProdQuantity] = useState("0");
  const [prodSupplier, setProdSupplier] = useState("");
  const [prodImageUrl, setProdImageUrl] = useState("");

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (selectedCategory) queryParams.set("category", selectedCategory);
      if (selectedSize) queryParams.set("size", selectedSize);
      if (selectedColor) queryParams.set("color", selectedColor);
      if (selectedStatus) queryParams.set("status", selectedStatus);

      const res = await fetch(`/api/inventory?${queryParams.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load products");
      }
      const data = await res.json();
      setProducts(data.products || []);
      setFilters(data.filters || { categories: [], sizes: [], colors: [] });
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while loading products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search, selectedCategory, selectedSize, selectedColor, selectedStatus]);

  // Sync route query search if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const routeSearch = urlParams.get("search");
      if (routeSearch) {
        setSearch(routeSearch);
      }
    }
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName,
          sku: prodSku,
          category: prodCategory,
          color: prodColor,
          size: prodSize,
          buyingPrice: parseFloat(prodBuyingPrice),
          sellingPrice: parseFloat(prodSellingPrice),
          stockQuantity: parseInt(prodQuantity),
          supplierName: prodSupplier,
          imageUrl: prodImageUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product");

      setSuccessMsg(`Product added successfully: ${prodName}`);
      setShowAddModal(false);
      resetForm();
      fetchInventory();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProduct.id,
          name: prodName,
          sku: prodSku,
          category: prodCategory,
          color: prodColor,
          size: prodSize,
          buyingPrice: parseFloat(prodBuyingPrice),
          sellingPrice: parseFloat(prodSellingPrice),
          stockQuantity: parseInt(prodQuantity),
          supplierName: prodSupplier,
          imageUrl: prodImageUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product");

      setSuccessMsg(`Product updated successfully: ${prodName}`);
      setShowEditModal(false);
      resetForm();
      fetchInventory();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}" from inventory?`)) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete product");

      setSuccessMsg(`Product deleted successfully: ${name}`);
      fetchInventory();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setProdName("");
    setProdSku("");
    setProdCategory("");
    setProdColor("");
    setProdSize("");
    setProdBuyingPrice("");
    setProdSellingPrice("");
    setProdQuantity("0");
    setProdSupplier("");
    setProdImageUrl("");
    setSelectedProduct(null);
  };

  const openEditModal = (p: Product) => {
    setSelectedProduct(p);
    setProdName(p.name);
    setProdSku(p.sku);
    setProdCategory(p.category);
    setProdColor(p.color);
    setProdSize(p.size);
    setProdBuyingPrice(p.buyingPrice.toString());
    setProdSellingPrice(p.sellingPrice.toString());
    setProdQuantity(p.stockQuantity.toString());
    setProdSupplier(p.supplierName);
    setProdImageUrl(p.imageUrl || "");
    setShowEditModal(true);
  };

  const generateMockBarcode = (sku: string) => {
    // Generate barcode bars based on SKU characters
    const hash = sku.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bars = [];
    for (let i = 0; i < 20; i++) {
      const width = ((hash + i) % 3) + 1;
      const space = ((hash * i) % 3) + 1;
      bars.push(
        <span
          key={i}
          style={{
            display: "inline-block",
            width: `${width}px`,
            height: "36px",
            backgroundColor: "currentColor",
            marginRight: `${space}px`,
          }}
        />
      );
    }
    return <div className="flex items-center text-slate-800 dark:text-slate-200 mt-1">{bars}</div>;
  };

  // Export current list to CSV
  const handleExportCSV = () => {
    if (products.length === 0) return;

    const headers = ["ID", "Name", "SKU", "Category", "Color", "Size", "Buying Price", "Selling Price", "Stock Quantity", "Status", "Supplier"];
    const rows = products.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.category,
      p.color,
      p.size,
      p.buyingPrice,
      p.sellingPrice,
      p.stockQuantity,
      p.status,
      `"${p.supplierName.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `klader_inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Financial summary
  const totalStockItems = products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const totalAssetValue = products.reduce((sum, p) => sum + (p.buyingPrice * p.stockQuantity), 0);
  const totalEstSalesVal = products.reduce((sum, p) => sum + (p.sellingPrice * p.stockQuantity), 0);
  const projectedProfit = totalEstSalesVal - totalAssetValue;

  const lowStockCount = products.filter(p => p.status === "LOW_STOCK" || p.status === "OUT_OF_STOCK").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab("stock")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "stock"
                ? "border-brand-wine dark:border-brand-peach text-brand-wine dark:text-brand-peach"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            Product Stock
          </button>
          <button
            onClick={() => setActiveTab("partners")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "partners"
                ? "border-brand-wine dark:border-brand-peach text-brand-wine dark:text-brand-peach"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            Investors & Partners
          </button>
        </div>

        {activeTab === "partners" ? (
          <PartnersManager />
        ) : (
          <>
            {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-extrabold text-slate-800 dark:text-white">
              Inventory & Catalog
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify stock levels, monitor barcode tags, modify prices, and review asset valuations.
            </p>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              disabled={products.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-600 dark:text-slate-350 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-logo text-white rounded-xl text-xs font-bold hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Product SKU
              </button>
            )}
          </div>
        </div>

        {/* Status alert message banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
            <Check className="h-5 w-5 flex-shrink-0" />
            <span className="text-xs font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Financial and quantity summary panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Total Items Stocked
                </span>
                <span className="text-2xl font-display font-extrabold text-slate-800 dark:text-white mt-1 block">
                  {totalStockItems.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-350">{products.length}</span> SKU definitions active
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Total Asset Valuation
                </span>
                <span className="text-2xl font-display font-extrabold text-brand-wine dark:text-brand-peach mt-1 block">
                  ৳ {totalAssetValue.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-wine/10 dark:bg-brand-peach/10 text-brand-wine dark:text-brand-peach">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Based on raw manufacturing purchase prices.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Projected Retail Sales
                </span>
                <span className="text-2xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  ৳ {totalEstSalesVal.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Expected gross revenue at retail tag prices.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Critical stock alerts
                </span>
                <span className={`text-2xl font-display font-extrabold mt-1 block ${lowStockCount > 0 ? "text-amber-500" : "text-slate-800 dark:text-white"}`}>
                  {lowStockCount}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl ${lowStockCount > 0 ? "bg-amber-50 dark:bg-amber-950/20 text-amber-500" : "bg-slate-100 dark:bg-slate-800 text-slate-455"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              SKUs that are out of stock or running low (&le; 5).
            </div>
          </div>
        </div>

        {/* Filter controls and layout toggler */}
        <div className="glass-panel p-4 rounded-2xl shadow-premium space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog by name, SKU barcode or supplier..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine"
              />
            </div>

            {/* Layout Toggler and Reload */}
            <div className="flex items-center justify-between md:justify-end gap-3.5">
              <button
                onClick={fetchInventory}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all cursor-pointer"
                title="Reload Inventory"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1 bg-slate-150/80 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white dark:bg-[#161f28] text-brand-wine dark:text-brand-peach shadow-sm"
                      : "text-slate-400"
                  }`}
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white dark:bg-[#161f28] text-brand-wine dark:text-brand-peach shadow-sm"
                      : "text-slate-400"
                  }`}
                  title="Barcode layout cards"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filtering row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/40">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-700 dark:text-slate-300"
              >
                <option value="">All Categories</option>
                {filters.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Size Option</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-700 dark:text-slate-300"
              >
                <option value="">All Sizes</option>
                {filters.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Color Shade</label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-700 dark:text-slate-300"
              >
                <option value="">All Colors</option>
                {filters.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Level</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-700 dark:text-slate-300"
              >
                <option value="">All Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* View Layout Renderer */}
        {loading ? (
          <div className="py-24 text-center text-xs text-slate-400 animate-pulse font-medium">
            Fetching product records...
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center text-xs text-slate-450 dark:text-slate-500 font-medium">
            No products match the selected filters.
          </div>
        ) : viewMode === "list" ? (
          /* Table View Mode */
          <div className="glass-panel rounded-2xl shadow-premium overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/20 dark:bg-slate-900/5">
                    <th className="px-5 py-4">Item Catalog & SKU</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Color/Size</th>
                    <th className="px-4 py-4 text-right">Buying Tag</th>
                    <th className="px-4 py-4 text-right">Selling Tag</th>
                    <th className="px-4 py-4 text-right">Stock</th>
                    <th className="px-4 py-4">Level</th>
                    {canEdit && <th className="px-5 py-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-850" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-brand-wine/10 text-brand-wine dark:text-brand-peach flex items-center justify-center font-bold">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{p.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-350">
                        {p.category}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-[10px] text-slate-500">
                          {p.color || "N/A"} / {p.size || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-500">
                        ৳{p.buyingPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-800 dark:text-slate-150">
                        ৳{p.sellingPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-800 dark:text-slate-150">
                        {p.stockQuantity} pcs
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            p.status === "IN_STOCK"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-450"
                              : p.status === "LOW_STOCK"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-450"
                              : "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                          }`}
                        >
                          {p.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                              title="Edit item catalog"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-brand-crimson"
                              title="Delete SKU"
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
          </div>
        ) : (
          /* Cards & Barcode Mode */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="glass-panel p-4 rounded-2xl shadow-premium flex flex-col justify-between border hover:border-brand-wine/25 dark:hover:border-brand-peach/25 transition-all group duration-200"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                      {p.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                        p.status === "IN_STOCK"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-450"
                          : p.status === "LOW_STOCK"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-450"
                          : "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                      }`}
                    >
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex gap-3 mb-4">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200/60 dark:border-slate-800" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <QrCode className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-150 block truncate group-hover:text-brand-wine dark:group-hover:text-brand-peach transition-colors">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Size/Color: {p.size || "N/A"} / {p.color || "N/A"}</span>
                    </div>
                  </div>

                  {/* Scannable Barcode Visualizer */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-4 flex flex-col items-center">
                    {generateMockBarcode(p.sku)}
                    <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 mt-1.5 uppercase">{p.sku}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/40 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block">RETAIL PRICE</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-150">৳{p.sellingPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block">STOCK LEVEL</span>
                      <span className="font-extrabold text-brand-wine dark:text-brand-peach">{p.stockQuantity} pcs</span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEditModal(p)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-650 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" /> Edit SKU
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1 px-2 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-brand-crimson transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}

      </div>

      {/* CRUD MODALS */}
      
      {/* 1. Add Product SKU Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-lg w-full p-6 shadow-heavy animate-slide-up space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Package className="h-4.5 w-4.5 text-brand-wine" /> Add Product to Catalog
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3.5 text-xs text-slate-750 dark:text-slate-350">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Premium Cotton Panjabi"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">SKU Barcode (Unique Key) *</label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="e.g. KL-PAN-001"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Category *</label>
                  <input
                    type="text"
                    required
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="e.g. Panjabi"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Color Shade</label>
                  <input
                    type="text"
                    value={prodColor}
                    onChange={(e) => setProdColor(e.target.value)}
                    placeholder="e.g. Indigo Blue"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Size Option</label>
                  <input
                    type="text"
                    value={prodSize}
                    onChange={(e) => setProdSize(e.target.value)}
                    placeholder="e.g. L / XL / 42"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Buying Price (BDT) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={prodBuyingPrice}
                    onChange={(e) => setProdBuyingPrice(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Selling Price (BDT) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={prodSellingPrice}
                    onChange={(e) => setProdSellingPrice(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodQuantity}
                    onChange={(e) => setProdQuantity(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">Supplier Manufacturer</label>
                <input
                  type="text"
                  value={prodSupplier}
                  onChange={(e) => setProdSupplier(e.target.value)}
                  placeholder="e.g. Dhaka Textile Hub"
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">Image URL (Optional)</label>
                <input
                  type="url"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  placeholder="https://example.com/item.jpg"
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-logo text-white rounded-xl font-bold hover:shadow-md cursor-pointer text-xs"
              >
                Log New Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Product SKU Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-lg w-full p-6 shadow-heavy animate-slide-up space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-brand-wine" /> Modify Product Catalog Details
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditProduct} className="space-y-3.5 text-xs text-slate-750 dark:text-slate-350">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">SKU Barcode (Unique Key) *</label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Category *</label>
                  <input
                    type="text"
                    required
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Color Shade</label>
                  <input
                    type="text"
                    value={prodColor}
                    onChange={(e) => setProdColor(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Size Option</label>
                  <input
                    type="text"
                    value={prodSize}
                    onChange={(e) => setProdSize(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Buying Price (BDT) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={prodBuyingPrice}
                    onChange={(e) => setProdBuyingPrice(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Selling Price (BDT) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={prodSellingPrice}
                    onChange={(e) => setProdSellingPrice(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodQuantity}
                    onChange={(e) => setProdQuantity(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">Supplier Manufacturer</label>
                <input
                  type="text"
                  value={prodSupplier}
                  onChange={(e) => setProdSupplier(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">Image URL (Optional)</label>
                <input
                  type="url"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-logo text-white rounded-xl font-bold hover:shadow-md cursor-pointer text-xs"
              >
                Save Details & Recalculate Valuations
              </button>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
