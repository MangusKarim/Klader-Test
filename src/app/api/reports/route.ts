// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/crypto";

// Helper to check user authentication
async function getAuthUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klader_session");
  if (!session) return null;
  return verifyToken(session.value);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const orderWhere: any = { deliveryStatus: { not: "CANCELLED" } };
    const expenseWhere: any = {};

    if (startDateParam || endDateParam) {
      orderWhere.createdAt = {};
      expenseWhere.date = {};

      if (startDateParam) {
        orderWhere.createdAt.gte = new Date(startDateParam);
        expenseWhere.date.gte = new Date(startDateParam);
      }

      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        orderWhere.createdAt.lte = end;
        expenseWhere.date.lte = end;
      }
    }

    // Fetch orders with items, expenses, and partner data
    const [orders, expenses, partners] = await Promise.all([
      db.order.findMany({
        where: orderWhere,
        include: {
          orderItems: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.expense.findMany({
        where: expenseWhere,
        orderBy: { date: "desc" },
      }),
      db.partner.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    // Financial calculations
    const grossSalesRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const salesProfit = orders.reduce((sum, o) => sum + o.profit, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Net profit = raw item profit - expenses
    const netProfit = salesProfit - totalExpenses;

    // Aggregate Product Sales quantities
    const productSalesMap: { [sku: string]: { name: string; qty: number; revenue: number; profit: number } } = {};
    orders.forEach((o) => {
      o.orderItems.forEach((item) => {
        const sku = item.product.sku;
        const rev = item.sellingPrice * item.quantity;
        const prof = (item.sellingPrice - item.product.buyingPrice) * item.quantity;

        if (!productSalesMap[sku]) {
          productSalesMap[sku] = {
            name: item.product.name,
            qty: 0,
            revenue: 0,
            profit: 0,
          };
        }

        productSalesMap[sku].qty += item.quantity;
        productSalesMap[sku].revenue += rev;
        productSalesMap[sku].profit += prof;
      });
    });

    const topProducts = Object.keys(productSalesMap)
      .map((sku) => ({
        sku,
        ...productSalesMap[sku],
      }))
      .sort((a, b) => b.qty - a.qty);

    // Group expenses by category
    const expenseCategories: { [cat: string]: number } = {};
    expenses.forEach((e) => {
      expenseCategories[e.category] = (expenseCategories[e.category] || 0) + e.amount;
    });

    const expenseCategoryBreakdown = Object.keys(expenseCategories).map((cat) => ({
      category: cat,
      amount: expenseCategories[cat],
    }));

    // Partner profit distributions math based on current netProfit
    const partnerShareList = partners.map((p) => {
      const pShare = netProfit > 0 ? netProfit * (p.ownershipPercentage / 100) : 0;
      return {
        id: p.id,
        name: p.name,
        ownershipPercentage: p.ownershipPercentage,
        partnerType: p.partnerType,
        projectedShare: pShare,
      };
    });

    return NextResponse.json({
      summary: {
        grossSalesRevenue,
        salesProfit,
        totalExpenses,
        netProfit,
        ordersCount: orders.length,
        expensesCount: expenses.length,
      },
      topProducts,
      expenseCategoryBreakdown,
      partnerShareList,
      recentOrders: orders.slice(0, 10).map((o) => ({
        id: o.id,
        customerName: o.customerName,
        totalAmount: o.totalAmount,
        profit: o.profit,
        deliveryStatus: o.deliveryStatus,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
