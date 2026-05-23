// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    // Session authorization check
    const cookieStore = await cookies();
    const session = cookieStore.get("klader_session");
    if (!session || !verifyToken(session.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch low stock products (quantity <= 5)
    const lowStockProducts = await db.product.findMany({
      where: {
        stockQuantity: { lte: 5 },
      },
      select: { id: true, name: true, sku: true, stockQuantity: true },
      take: 5,
    });

    // 2. Fetch pending withdrawals (Partner requests)
    const pendingWithdrawals = await db.transaction.findMany({
      where: {
        type: "WITHDRAWAL",
        status: "PENDING",
      },
      include: {
        partner: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // 3. Fetch orders with remaining dues
    const pendingPayments = await db.order.findMany({
      where: {
        remainingDue: { gt: 0 },
        paymentStatus: { in: ["PARTIAL", "UNPAID"] },
      },
      select: { id: true, customerName: true, remainingDue: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Map database warnings to notification objects
    const notifications: any[] = [];

    // Add low stock alerts
    lowStockProducts.forEach((p) => {
      notifications.push({
        id: `stock-${p.id}`,
        type: "stock",
        text: `${p.name} (${p.sku}) is running low! (${p.stockQuantity} items left)`,
        link: `/inventory?search=${p.sku}`,
      });
    });

    // Add pending partner withdrawals
    pendingWithdrawals.forEach((t) => {
      notifications.push({
        id: `partner-${t.id}`,
        type: "partner",
        text: `Withdrawal request of ৳${t.amount.toLocaleString()} BDT by partner ${t.partner.name} is pending approval.`,
        link: "/partners",
      });
    });

    // Add unpaid dues alerts
    pendingPayments.forEach((o) => {
      notifications.push({
        id: `payment-${o.id}`,
        type: "payment",
        text: `Due payment of ৳${o.remainingDue.toLocaleString()} BDT on order #${o.id} (${o.customerName}).`,
        link: `/sales?order=${o.id}`,
      });
    });

    // Return the aggregated list
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
