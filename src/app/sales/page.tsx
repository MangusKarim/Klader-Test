// src/app/sales/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Trash2,
  Printer,
  Check,
  X,
  Eye,
  RefreshCw,
  TrendingUp,
  CircleDollarSign,
  Truck,
  AlertCircle,
  FileBarChart2,
  FileSpreadsheet
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
  status: string;
}

interface OrderItem {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  sellingPrice: number;
  size: string;
  color: string;
}

interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  printedOrSolid: "PRINTED" | "SOLID";
  printSize: string | null;
  printCost: number;
  deliveryCharge: number;
  advancePayment: number;
  remainingDue: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD" | "ROCKET";
  deliveryStatus: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  totalAmount: number;
  profit: number;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export default function SalesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "STAFF";

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterDelivery, setFilterDelivery] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status edits (for details modal)
  const [editDeliveryStatus, setEditDeliveryStatus] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editAdvancePayment, setEditAdvancePayment] = useState("");
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  // Create order state
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [printType, setPrintType] = useState<"SOLID" | "PRINTED">("SOLID");
  const [printSize, setPrintSize] = useState("M");
  const [printCost, setPrintCost] = useState("0");
  const [deliveryCharge, setDeliveryCharge] = useState("120"); // Default standard BD delivery
  const [advancePayment, setAdvancePayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK" | "BKASH" | "NAGAD" | "ROCKET">("CASH");

  // Selected items in new order
  const [orderItems, setOrderItems] = useState<{
    productId: number;
    quantity: number;
    sellingPrice: number;
    name: string;
    sku: string;
    size: string;
    color: string;
    stockQuantity: number;
  }[]>([]);

  // Item selector inside create order modal
  const [selectedProdId, setSelectedProdId] = useState("");
  const [prodQuantity, setProdQuantity] = useState("1");
  const [prodCustomPrice, setProdCustomPrice] = useState("");

  // Fetch orders and inventory
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (filterDelivery) queryParams.set("deliveryStatus", filterDelivery);
      if (filterPayment) queryParams.set("paymentStatus", filterPayment);

      const res = await fetch(`/api/sales?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to load inventory");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchInventory();
  }, [search, filterDelivery, filterPayment]);

  // Sync route query search if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const routeOrder = urlParams.get("order");
      if (routeOrder) {
        // Fetch specific order if search includes it
        const fetchSingleOrder = async () => {
          try {
            const res = await fetch(`/api/sales`);
            if (res.ok) {
              const data = await res.json();
              const matched = data.orders.find((o: any) => o.id === parseInt(routeOrder));
              if (matched) {
                setSelectedOrder(matched);
                setEditDeliveryStatus(matched.deliveryStatus);
                setEditPaymentStatus(matched.paymentStatus);
                setEditAdvancePayment(matched.advancePayment.toString());
                setShowDetailModal(true);
              }
            }
          } catch (err) {
            console.error(err);
          }
        };
        fetchSingleOrder();
      }
    }
  }, []);

  // Sync pricing when product is selected in item adder
  useEffect(() => {
    if (selectedProdId) {
      const prod = products.find(p => p.id === parseInt(selectedProdId));
      if (prod) {
        setProdCustomPrice(prod.sellingPrice.toString());
      }
    } else {
      setProdCustomPrice("");
    }
  }, [selectedProdId, products]);

  // Order item adding logic
  const handleAddItem = () => {
    if (!selectedProdId) return;
    const prod = products.find(p => p.id === parseInt(selectedProdId));
    if (!prod) return;

    const qty = parseInt(prodQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert("Invalid quantity");
      return;
    }

    // Check inventory stock limits
    const existingInCart = orderItems.find(item => item.productId === prod.id);
    const totalReqQty = qty + (existingInCart ? existingInCart.quantity : 0);

    if (totalReqQty > prod.stockQuantity) {
      alert(`Insufficient stock. Only ${prod.stockQuantity} items of ${prod.name} available.`);
      return;
    }

    const price = parseFloat(prodCustomPrice);
    if (isNaN(price) || price < 0) {
      alert("Invalid price tag");
      return;
    }

    if (existingInCart) {
      setOrderItems(orderItems.map(item =>
        item.productId === prod.id
          ? { ...item, quantity: totalReqQty, sellingPrice: price }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        productId: prod.id,
        quantity: qty,
        sellingPrice: price,
        name: prod.name,
        sku: prod.sku,
        size: prod.size,
        color: prod.color,
        stockQuantity: prod.stockQuantity
      }]);
    }

    // Reset item selector
    setSelectedProdId("");
    setProdQuantity("1");
    setProdCustomPrice("");
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Calculations for Order Form
  const itemsSubtotal = orderItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const parsedPrintCost = parseFloat(printCost) || 0;
  const parsedDeliveryCharge = parseFloat(deliveryCharge) || 0;
  const totalInvoiceVal = itemsSubtotal + (printType === "PRINTED" ? parsedPrintCost : 0) + parsedDeliveryCharge;
  const parsedAdvance = parseFloat(advancePayment) || 0;
  const remainingDueVal = totalInvoiceVal - parsedAdvance;

  const resetOrderForm = () => {
    setCustName("");
    setCustPhone("");
    setCustAddress("");
    setPrintType("SOLID");
    setPrintSize("M");
    setPrintCost("0");
    setDeliveryCharge("120");
    setAdvancePayment("0");
    setPaymentMethod("CASH");
    setOrderItems([]);
    setSelectedProdId("");
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert("Please add at least one product item to the order.");
      return;
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: custName,
          customerPhone: custPhone,
          customerAddress: custAddress,
          printedOrSolid: printType,
          printSize: printSize,
          printCost: printType === "PRINTED" ? parsedPrintCost : 0,
          deliveryCharge: parsedDeliveryCharge,
          advancePayment: parsedAdvance,
          paymentMethod,
          items: orderItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            sellingPrice: i.sellingPrice
          }))
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place sales order");

      setSuccessMsg(`Order placed successfully! ID: #${data.orderId}`);
      setShowAddModal(false);
      resetOrderForm();
      fetchOrders();
      fetchInventory(); // Update inventory options
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  };

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder) return;
    setStatusUpdateError(null);
    try {
      const res = await fetch("/api/sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOrder.id,
          deliveryStatus: editDeliveryStatus,
          paymentStatus: editPaymentStatus,
          advancePayment: parseFloat(editAdvancePayment) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update order status");
      }

      setSuccessMsg(`Order #${selectedOrder.id} status modified successfully.`);
      setShowDetailModal(false);
      fetchOrders();
      fetchInventory();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setStatusUpdateError(err.message || "Failed to update status");
    }
  };

  const handlePrintThermalInvoice = (order: Order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Failed to open print window. Please allow popups.");
      return;
    }

    const itemsRows = order.orderItems.map(item => `
      <tr>
        <td style="padding: 4px 0; font-family: monospace;">
          ${item.product.name} (${item.size}/${item.color})<br/>
          ${item.quantity} x ৳${item.sellingPrice.toLocaleString()}
        </td>
        <td style="text-align: right; vertical-align: top; padding: 4px 0; font-family: monospace;">
          ৳${(item.quantity * item.sellingPrice).toLocaleString()}
        </td>
      </tr>
    `).join("");

    const dateStr = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const isPrinted = order.printedOrSolid === "PRINTED";

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${order.id} - Klader</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 74mm;
              margin: 3mm auto;
              font-size: 11px;
              color: #000;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .header-title { font-size: 16px; font-weight: bold; margin: 4px 0; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            .footer { font-size: 9px; margin-top: 12px; }
            .badge { border: 1px solid #000; padding: 1px 4px; display: inline-block; font-size: 9px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <div class="header-title">KLADER</div>
            <div class="bold">Premium Clothing Brand</div>
            <div>Dhaka, Bangladesh</div>
            <div>Phone: +880 1700-000000</div>
          </div>
          
          <div class="divider"></div>
          
          <div>
            <strong>Invoice ID:</strong> #${order.id}<br/>
            <strong>Date:</strong> ${dateStr}<br/>
            <strong>Customer:</strong> ${order.customerName}<br/>
            <strong>Phone:</strong> ${order.customerPhone}<br/>
            <strong>Address:</strong> ${order.customerAddress || "N/A"}<br/>
            <strong>Options:</strong> ${order.printedOrSolid} ${isPrinted ? `(${order.printSize})` : ""}<br/>
            <strong>Payment:</strong> ${order.paymentMethod} (${order.paymentStatus})
          </div>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 3px;">Description</th>
                <th style="text-align: right; padding-bottom: 3px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table>
            <tr>
              <td>Subtotal</td>
              <td class="right">৳${(order.totalAmount - order.deliveryCharge - order.printCost).toLocaleString()}</td>
            </tr>
            ${isPrinted ? `
            <tr>
              <td>Custom Printing Cost</td>
              <td class="right">৳${order.printCost.toLocaleString()}</td>
            </tr>
            ` : ""}
            <tr>
              <td>Delivery Charge</td>
              <td class="right">৳${order.deliveryCharge.toLocaleString()}</td>
            </tr>
            <tr class="bold">
              <td>Total Invoice</td>
              <td class="right">৳${order.totalAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Advance Payment</td>
              <td class="right">৳${order.advancePayment.toLocaleString()}</td>
            </tr>
            <tr class="bold" style="border-top: 1px dashed #000;">
              <td style="padding-top: 4px;">Remaining Due</td>
              <td class="right" style="padding-top: 4px;">৳${order.remainingDue.toLocaleString()} BDT</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div class="center footer">
            <div class="bold">Thank you for shopping!</div>
            <div>www.kladerbd.com</div>
            <div style="margin-top: 4px;">Powered by Klader Business Control</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Financial Stats calculations
  const totalSalesRevenue = orders.filter(o => o.deliveryStatus !== "CANCELLED").reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPendingDues = orders.filter(o => o.deliveryStatus !== "CANCELLED").reduce((sum, o) => sum + o.remainingDue, 0);
  const activeOrdersCount = orders.filter(o => o.deliveryStatus === "PENDING" || o.deliveryStatus === "PROCESSING" || o.deliveryStatus === "SHIPPED").length;
  const cancelledOrdersCount = orders.filter(o => o.deliveryStatus === "CANCELLED").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-extrabold text-slate-800 dark:text-white">
              Sales Order Desk
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Place new customer bookings, monitor logistics status, update dues, and print thermal POS tickets.
            </p>
          </div>

          <button
            onClick={() => {
              resetOrderForm();
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-logo text-white rounded-xl text-xs font-bold hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Place Sales Order
          </button>
        </div>

        {/* Banners */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
            <Check className="h-5 w-5 flex-shrink-0" />
            <span className="text-xs font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl shadow-premium">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Total Order Sales
                </span>
                <span className="text-2xl font-display font-extrabold text-slate-800 dark:text-white mt-1 block">
                  ৳ {totalSalesRevenue.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Excluding cancelled orders from database.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Outstanding Customer Dues
                </span>
                <span className="text-2xl font-display font-extrabold text-brand-wine dark:text-brand-peach mt-1 block">
                  ৳ {totalPendingDues.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-wine/10 dark:bg-brand-peach/10 text-brand-wine dark:text-brand-peach">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              To be collected upon cash on delivery.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Logistics in Transit
                </span>
                <span className="text-2xl font-display font-extrabold text-status-success mt-1 block">
                  {activeOrdersCount}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-status-success-light text-status-success">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Orders currently Pending, Processing, or Shipped.
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-premium">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block">
                  Cancelled Bookings
                </span>
                <span className="text-2xl font-display font-extrabold text-slate-400 dark:text-slate-500 mt-1 block">
                  {cancelledOrdersCount}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                <X className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              Restored stock units to inventory records.
            </div>
          </div>
        </div>

        {/* Filters and List */}
        <div className="glass-panel p-4 rounded-2xl shadow-premium space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders by customer name, phone number..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterDelivery}
                onChange={(e) => setFilterDelivery(e.target.value)}
                className="p-2 px-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-700 dark:text-slate-350"
              >
                <option value="">All Deliveries</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="p-2 px-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-[#161f28]/30 text-slate-700 dark:text-slate-350"
              >
                <option value="">All Payments</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">Unpaid</option>
              </select>

              <button
                onClick={fetchOrders}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all cursor-pointer bg-slate-50/20"
                title="Reload Orders"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 animate-pulse font-medium">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-450 dark:text-slate-500 font-medium">
              No sales orders found matching current criteria.
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/20 dark:bg-slate-900/5">
                    <th className="px-5 py-4">Order ID & Date</th>
                    <th className="px-4 py-4">Customer Info</th>
                    <th className="px-4 py-4 text-center">Items</th>
                    <th className="px-4 py-4 text-right">Invoice Total</th>
                    <th className="px-4 py-4 text-right">Remaining Due</th>
                    <th className="px-4 py-4">Logistics</th>
                    <th className="px-4 py-4">Payment Status</th>
                    <th className="px-5 py-4 text-center">Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {orders.map((order) => {
                    const active = order.deliveryStatus !== "CANCELLED";
                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-850/10 cursor-pointer ${!active ? "opacity-60 bg-slate-50/10" : ""}`}
                        onClick={() => {
                          setSelectedOrder(order);
                          setEditDeliveryStatus(order.deliveryStatus);
                          setEditPaymentStatus(order.paymentStatus);
                          setEditAdvancePayment(order.advancePayment.toString());
                          setStatusUpdateError(null);
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-800 dark:text-white block">
                            Order #${order.id}
                          </span>
                          <span className="text-[10px] text-slate-450 block mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                            {order.customerName}
                          </span>
                          <span className="text-[10px] text-slate-450 block mt-0.5">
                            {order.customerPhone}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-650">
                          {order.orderItems.reduce((sum, i) => sum + i.quantity, 0)} pcs
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-slate-850 dark:text-slate-150">
                          ৳ {order.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-brand-wine dark:text-brand-peach">
                          ৳ {order.remainingDue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              order.deliveryStatus === "DELIVERED"
                                ? "bg-status-success-light text-status-success"
                                : order.deliveryStatus === "CANCELLED"
                                ? "bg-status-info-light text-status-info"
                                : "bg-status-warning-light text-status-warning"
                            }`}
                          >
                            {order.deliveryStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              order.paymentStatus === "PAID"
                                ? "bg-status-success-light text-status-success"
                                : order.paymentStatus === "PARTIAL"
                                ? "bg-status-warning-light text-status-warning"
                                : "bg-status-danger-light text-status-danger"
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handlePrintThermalInvoice(order)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
                            title="Print Thermal Ticket"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE ORDER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-4xl w-full p-6 shadow-heavy animate-slide-up space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ShoppingCart className="h-4.5 w-4.5 text-brand-wine" /> Place Customer Sales Order
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
              
              {/* Form Section (Col-7) */}
              <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-3">
                <h4 className="font-bold text-brand-wine dark:text-brand-peach border-b border-slate-50 dark:border-slate-800/40 pb-1">1. Customer Logistics Details</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold block">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Enter buyer name"
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold block">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="e.g. 01712345678"
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block">Delivery Address</label>
                  <textarea
                    rows={2}
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="Enter shipping details..."
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white no-scrollbar"
                  />
                </div>

                <h4 className="font-bold text-brand-wine dark:text-brand-peach border-b border-slate-50 dark:border-slate-800/40 pb-1 pt-1">2. Print Options & Finance</h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold block">Option Type</label>
                    <select
                      value={printType}
                      onChange={(e) => setPrintType(e.target.value as "SOLID" | "PRINTED")}
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    >
                      <option value="SOLID">Solid Color</option>
                      <option value="PRINTED">Printed Graphics</option>
                    </select>
                  </div>

                  {printType === "PRINTED" ? (
                    <>
                      <div className="space-y-1">
                        <label className="font-semibold block">Print Size</label>
                        <select
                          value={printSize}
                          onChange={(e) => setPrintSize(e.target.value)}
                          className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                        >
                          <option value="S">S (Small)</option>
                          <option value="M">M (Medium)</option>
                          <option value="L">L (Large)</option>
                          <option value="XL">XL (Extra Large)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold block">Print Cost (৳)</label>
                        <input
                          type="number"
                          value={printCost}
                          onChange={(e) => setPrintCost(e.target.value)}
                          className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      Solid options do not incur print overheads.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-semibold block">Delivery Fee</label>
                    <input
                      type="number"
                      required
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(e.target.value)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold block">Advance Paid</label>
                    <input
                      type="number"
                      required
                      value={advancePayment}
                      onChange={(e) => setAdvancePayment(e.target.value)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="font-semibold block">Payment Mode</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    >
                      <option value="CASH">Cash on Delivery</option>
                      <option value="BKASH">bKash Merchant</option>
                      <option value="NAGAD">Nagad Personal</option>
                      <option value="ROCKET">Rocket Wallet</option>
                      <option value="BANK">Bank Wire Transfer</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={orderItems.length === 0}
                  className="w-full py-2.5 bg-gradient-logo text-white font-bold rounded-xl text-xs hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all pt-3"
                >
                  Save & Place Order (৳ {totalInvoiceVal.toLocaleString()} BDT)
                </button>
              </form>

              {/* Items Panel Section (Col-5) */}
              <div className="lg:col-span-5 flex flex-col justify-between border-l border-slate-100 dark:border-slate-800 lg:pl-5 space-y-4">
                
                {/* Product Add Row */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white border-b border-slate-50 dark:border-slate-800/40 pb-1">3. Select Product Units</h4>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="font-semibold block">Choose Product SKU</label>
                      <select
                        value={selectedProdId}
                        onChange={(e) => setSelectedProdId(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                      >
                        <option value="">-- Choose from Catalog --</option>
                        {products.map(p => (
                          <option
                            key={p.id}
                            value={p.id}
                            disabled={p.stockQuantity <= 0}
                          >
                            {p.name} (${p.sku}) [Stock: ${p.stockQuantity}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProdId && (
                      <div className="grid grid-cols-2 gap-3 pt-1 animate-slide-up">
                        <div className="space-y-1">
                          <label className="font-semibold block">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={prodQuantity}
                            onChange={(e) => setProdQuantity(e.target.value)}
                            className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold block">Selling Price</label>
                          <input
                            type="number"
                            value={prodCustomPrice}
                            onChange={(e) => setProdCustomPrice(e.target.value)}
                            className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {selectedProdId && (
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full py-1.5 border border-brand-wine/30 dark:border-brand-peach/30 hover:bg-brand-wine/5 hover:text-brand-wine dark:hover:text-brand-peach text-slate-700 dark:text-slate-350 font-bold rounded-xl text-[11px] transition-all cursor-pointer"
                      >
                        Add to Order List
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Cart List */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 max-h-56 overflow-y-auto no-scrollbar">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800/60 pb-1.5 mb-2">Cart Selection</span>
                  
                  {orderItems.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-medium">Empty order list.</div>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center gap-2 bg-white dark:bg-[#161f28]/40 p-2 rounded-lg border border-slate-100/50 dark:border-slate-850/50">
                          <div className="min-w-0">
                            <span className="font-bold block truncate text-slate-750 dark:text-slate-250">{item.name}</span>
                            <span className="text-[9px] text-slate-450 block mt-0.5">
                              Qty: {item.quantity} | SKU: {item.sku} | {item.size}/{item.color}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              ৳{(item.sellingPrice * item.quantity).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-slate-400 hover:text-brand-crimson hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Invoice Summary */}
                <div className="bg-gradient-soft border border-slate-150/40 dark:border-slate-850/40 p-4 rounded-2xl shadow-sm space-y-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">৳ {itemsSubtotal.toLocaleString()}</span>
                  </div>
                  {printType === "PRINTED" && (
                    <div className="flex justify-between text-slate-500">
                      <span>Custom Printing Overhead:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">৳ {parsedPrintCost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Charge:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">৳ {parsedDeliveryCharge.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Advance Payment:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">৳ {parsedAdvance.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200/50 dark:border-slate-800/80 pt-2 flex justify-between font-bold text-xs">
                    <span className="text-slate-800 dark:text-white">Remaining Balance:</span>
                    <span className="text-brand-wine dark:text-brand-peach">৳ {remainingDueVal.toLocaleString()} BDT</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* DETAIL / UPDATE MODAL */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-slate-800 max-w-lg w-full p-6 shadow-heavy animate-slide-up space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Review Sales Order #{selectedOrder.id}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Order overview details */}
            <div className="text-xs space-y-3">
              
              {/* Customer details info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Buyer Logistics</span>
                  <span className="font-bold text-slate-800 dark:text-white block mt-1">{selectedOrder.customerName}</span>
                  <span className="text-slate-500 block mt-0.5">{selectedOrder.customerPhone}</span>
                  <span className="text-slate-400 block mt-0.5 leading-tight">{selectedOrder.customerAddress || "No address saved"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Payment specs</span>
                  <span className="font-bold text-slate-800 dark:text-white block mt-1">Method: {selectedOrder.paymentMethod}</span>
                  <span className="text-slate-500 block mt-0.5">Printed Type: {selectedOrder.printedOrSolid}</span>
                  {selectedOrder.printSize && (
                    <span className="text-slate-450 block mt-0.5">Graphic size: {selectedOrder.printSize}</span>
                  )}
                </div>
              </div>

              {/* Items breakdown list */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-white block">Products list</span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-40 overflow-y-auto no-scrollbar">
                  {selectedOrder.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2.5 bg-slate-50/20">
                      <div>
                        <span className="font-semibold block text-slate-750 dark:text-slate-250">{item.product.name}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          SKU: {item.product.sku} | Size/Color: {item.size}/{item.color}
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-350">
                        {item.quantity} pcs x ৳{item.sellingPrice}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing breakdown summary */}
              <div className="bg-gradient-soft p-3.5 rounded-xl border border-slate-150/40 dark:border-slate-850/40 space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Product Sales subtotal:</span>
                  <span>৳ {(selectedOrder.totalAmount - selectedOrder.deliveryCharge - selectedOrder.printCost).toLocaleString()}</span>
                </div>
                {selectedOrder.printedOrSolid === "PRINTED" && (
                  <div className="flex justify-between text-slate-500">
                    <span>Custom Printing cost:</span>
                    <span>৳ {selectedOrder.printCost.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Delivery fee:</span>
                  <span>৳ {selectedOrder.deliveryCharge.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total customer invoice:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">৳ {selectedOrder.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Advance Payment paid:</span>
                  <span>৳ {selectedOrder.advancePayment.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-200/50 dark:border-slate-800/80 pt-2 flex justify-between font-bold text-slate-850 dark:text-white">
                  <span>Remaining Cash on Delivery:</span>
                  <span className="text-brand-wine dark:text-brand-peach">৳ {selectedOrder.remainingDue.toLocaleString()} BDT</span>
                </div>
              </div>

              {/* MODIFIABLE LOGISTICS STATUS (For authorized admins/staff) */}
              {canEdit ? (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <span className="font-bold text-slate-800 dark:text-white block">Logistics & Payment Controllers</span>
                  
                  {statusUpdateError && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-brand-crimson dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl flex items-center gap-2">
                      <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                      <span className="font-semibold text-[11px]">{statusUpdateError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold block">Delivery Status</label>
                      <select
                        value={editDeliveryStatus}
                        onChange={(e) => setEditDeliveryStatus(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                      >
                        <option value="PENDING">Pending Approval</option>
                        <option value="PROCESSING">Processing Batch</option>
                        <option value="SHIPPED">Shipped (In Courier)</option>
                        <option value="DELIVERED">Delivered to Door</option>
                        <option value="CANCELLED">Cancelled Order</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold block">Advance Payment (৳)</label>
                      <input
                        type="number"
                        value={editAdvancePayment}
                        onChange={(e) => setEditAdvancePayment(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="font-semibold block">Manual Payment Status Override</label>
                    <select
                      value={editPaymentStatus}
                      onChange={(e) => setEditPaymentStatus(e.target.value)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    >
                      <option value="UNPAID">Unpaid</option>
                      <option value="PARTIAL">Partially Paid</option>
                      <option value="PAID">Paid In Full</option>
                    </select>
                    <p className="text-[9px] text-slate-400">By default, system updates status automatically based on Advance Payment amount unless manually overridden here.</p>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePrintThermalInvoice(selectedOrder)}
                      className="flex-1 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-655 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Printer className="h-4 w-4" /> Thermal Print
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateOrderStatus}
                      className="flex-1 py-2 bg-gradient-logo text-white rounded-xl text-[11px] font-bold hover:shadow-sm transition-all cursor-pointer"
                    >
                      Save Modifications
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintThermalInvoice(selectedOrder)}
                    className="w-full py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-655 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer className="h-4 w-4" /> Print POS Invoice
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
