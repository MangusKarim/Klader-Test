// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    // 1. Session authorization check
    const cookieStore = await cookies();
    const session = cookieStore.get("klader_session");
    if (!session || !verifyToken(session.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Query Orders, Expenses, Products, Partners in parallel
    const [orders, expenses, products, partners, transactions] = await Promise.all([
      db.order.findMany({
        include: { orderItems: true },
        orderBy: { createdAt: "desc" },
      }),
      db.expense.findMany({
        orderBy: { date: "desc" },
      }),
      db.product.findMany(),
      db.partner.findMany(),
      db.transaction.findMany({
        where: { status: "APPROVED" },
      }),
    ]);

    // 3. Financial calculations
    const activeOrders = orders.filter((o) => o.deliveryStatus !== "CANCELLED");
    
    // Total Revenue (excluding cancelled)
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount - o.deliveryCharge, 0); // net product revenue
    
    // Total Sales Profit (profit generated from orders)
    const totalSalesProfit = activeOrders.reduce((sum, o) => sum + o.profit, 0);

    // Total Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Net Business Profit (Sales Profit - Expenses)
    const netProfit = totalSalesProfit - totalExpenses;

    // Inventory Cost Value
    const inventoryCostValue = products.reduce((sum, p) => sum + p.buyingPrice * p.stockQuantity, 0);

    // Total Orders Count
    const totalSalesOrders = orders.length;

    // Total Products Count
    const totalProducts = products.length;

    // Pending Deliveries (PENDING, PROCESSING, SHIPPED)
    const pendingDeliveries = orders.filter(
      (o) => o.deliveryStatus === "PENDING" || o.deliveryStatus === "PROCESSING" || o.deliveryStatus === "SHIPPED"
    ).length;

    // Partner Capital Investments (APPROVED)
    const partnerInvestmentTotal = transactions
      .filter((t) => t.type === "INVESTMENT")
      .reduce((sum, t) => sum + t.amount, 0);

    // Partner Withdrawals (APPROVED)
    const partnerWithdrawalTotal = transactions
      .filter((t) => t.type === "WITHDRAWAL")
      .reduce((sum, t) => sum + t.amount, 0);

    // Company Reserve Balance = Total Investment + Net Profit - Total Withdrawal
    const companyReserveBalance = partnerInvestmentTotal + netProfit - partnerWithdrawalTotal;

    // 4. Chart 1: Sales & Profit Trend (last 7 days)
    // Create map of last 7 calendar days
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const trendData = last7Days.map((dateStr) => {
      const dayOrders = activeOrders.filter((o) => o.createdAt.toISOString().split("T")[0] === dateStr);
      const dayRevenue = dayOrders.reduce((sum, o) => sum + o.totalAmount - o.deliveryCharge, 0);
      const dayProfit = dayOrders.reduce((sum, o) => sum + o.profit, 0);

      // Extract day expenses
      const dayExpenses = expenses
        .filter((e) => e.date.toISOString().split("T")[0] === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      const dayNetProfit = dayProfit - dayExpenses;

      const dateObj = new Date(dateStr);
      const label = dateObj.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });

      return {
        date: label,
        revenue: dayRevenue,
        profit: dayNetProfit,
      };
    });

    // 5. Chart 2: Expense Allocation Pie Chart
    const expenseBreakdown: Record<string, number> = {
      ONLINE_BOOSTING: 0,
      PACKAGING: 0,
      ACCESSORIES: 0,
      MARKETING: 0,
      TRANSPORT: 0,
      SALARY: 0,
      UTILITIES: 0,
      OTHERS: 0,
    };
    expenses.forEach((e) => {
      const category = e.category;
      if (category in expenseBreakdown) {
        expenseBreakdown[category] += e.amount;
      } else {
        expenseBreakdown.OTHERS = (expenseBreakdown.OTHERS || 0) + e.amount;
      }
    });
    const expenseAllocation = Object.entries(expenseBreakdown).map(([category, amount]) => ({
      name: category.replace("_", " "),
      value: amount,
    })).filter((item) => item.value > 0);

    // 6. Chart 3: Best Selling Products
    // Map order items by product configurations
    const productSalesMap: Record<string, { name: string; size: string; color: string; qty: number; sales: number }> = {};
    orders
      .filter((o) => o.deliveryStatus !== "CANCELLED")
      .forEach((o) => {
        // In seed and logic, orders contain items in orderItems
        // If there are order items, parse them
      });

    // To compute best sellers from db relations:
    const orderItems = await db.orderItem.findMany({
      where: { order: { deliveryStatus: { not: "CANCELLED" } } },
      include: { product: true },
    });

    const bestSellersMap: Record<string, { name: string; sku: string; size: string; color: string; qty: number }> = {};
    orderItems.forEach((item) => {
      const key = `${item.productId}-${item.size}-${item.color}`;
      if (bestSellersMap[key]) {
        bestSellersMap[key].qty += item.quantity;
      } else {
        bestSellersMap[key] = {
          name: item.product.name,
          sku: item.product.sku,
          size: item.size,
          color: item.color,
          qty: item.quantity,
        };
      }
    });
    const bestSellers = Object.values(bestSellersMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // 7. Recent Orders (last 5)
    const recentOrders = orders.slice(0, 5).map((o) => ({
      id: o.id,
      customerName: o.customerName,
      createdAt: o.createdAt,
      totalAmount: o.totalAmount,
      paymentStatus: o.paymentStatus,
      deliveryStatus: o.deliveryStatus,
    }));

    // 8. Low Stock Alerts (stockQuantity <= 5)
    const lowStockAlerts = products
      .filter((p) => p.stockQuantity <= 5)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stockQuantity,
      }));

    // 9. Pending Payments (unpaid/partial orders with positive dues)
    const pendingPayments = orders
      .filter((o) => o.remainingDue > 0 && o.paymentStatus !== "PAID" && o.deliveryStatus !== "CANCELLED")
      .slice(0, 5)
      .map((o) => ({
        id: o.id,
        customerName: o.customerName,
        due: o.remainingDue,
        status: o.paymentStatus,
      }));

    // 10. Recent Expenses (last 5)
    const recentExpenses = expenses.slice(0, 5).map((e) => ({
      id: e.id,
      category: e.category.replace("_", " "),
      amount: e.amount,
      date: e.date,
      description: e.description,
    }));

    // 11. Partner Ownership Breakdown
    const partnerOwnership = partners.map((p) => ({
      name: p.name,
      percentage: p.ownershipPercentage,
      investment: p.investmentAmount,
    }));

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalExpenses,
        netProfit,
        inventoryCostValue,
        totalSalesOrders,
        totalProducts,
        pendingDeliveries,
        partnerInvestmentTotal,
        companyReserveBalance,
      },
      charts: {
        trendData,
        expenseAllocation,
        bestSellers,
        partnerOwnership,
      },
      tables: {
        recentOrders,
        lowStockAlerts,
        pendingPayments,
        recentExpenses,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
