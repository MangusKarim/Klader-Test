// src/app/api/partners/transaction/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Session check (Admin only)
    const cookieStore = await cookies();
    const session = cookieStore.get("klader_session");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = verifyToken(session.value);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied. Admins only." }, { status: 403 });
    }

    const { id, action } = await req.json(); // action: "APPROVE" or "REJECT"

    if (!id || !action) {
      return NextResponse.json({ error: "Transaction ID and action are required" }, { status: 400 });
    }

    const transactionId = parseInt(id);

    // Fetch transaction with partner
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: { partner: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json({ error: "Transaction is already processed" }, { status: 400 });
    }

    if (action === "REJECT") {
      const updated = await db.transaction.update({
        where: { id: transactionId },
        data: { status: "REJECTED" },
      });

      await db.activityLog.create({
        data: {
          user: user.name,
          action: `Rejected withdrawal request of ৳${transaction.amount.toLocaleString()} BDT for ${transaction.partner.name}.`,
        },
      });

      return NextResponse.json({ success: true, transaction: updated });
    }

    if (action === "APPROVE") {
      // If it's a withdrawal, verify insufficient balance limit
      if (transaction.type === "WITHDRAWAL") {
        // Fetch all orders and expenses to compute net profit
        const [orders, expenses, allTransactions] = await Promise.all([
          db.order.findMany({ where: { deliveryStatus: { not: "CANCELLED" } } }),
          db.expense.findMany(),
          db.transaction.findMany({
            where: { partnerId: transaction.partnerId, status: "APPROVED" },
          }),
        ]);

        const companySalesProfit = orders.reduce((sum, o) => sum + o.profit, 0);
        const companyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = companySalesProfit - companyExpenses;

        const partner = transaction.partner;
        const pInvestments = allTransactions
          .filter((t) => t.type === "INVESTMENT")
          .reduce((sum, t) => sum + t.amount, 0);
        const pWithdrawals = allTransactions
          .filter((t) => t.type === "WITHDRAWAL")
          .reduce((sum, t) => sum + t.amount, 0);

        const pProfitShare = netProfit > 0 ? netProfit * (partner.ownershipPercentage / 100) : 0;
        const remainingBalance = pProfitShare + pInvestments - pWithdrawals;

        if (remainingBalance < transaction.amount) {
          return NextResponse.json(
            {
              error: `Insufficient partner balance. Remaining balance is ৳${remainingBalance.toLocaleString()} BDT, cannot approve a withdrawal of ৳${transaction.amount.toLocaleString()} BDT.`,
            },
            { status: 400 }
          );
        }
      }

      // Approve the transaction
      const updated = await db.transaction.update({
        where: { id: transactionId },
        data: {
          status: "APPROVED",
          approvedBy: user.name,
        },
      });

      // If this is an investment, we also increment the partner's cached investmentAmount
      if (transaction.type === "INVESTMENT") {
        await db.partner.update({
          where: { id: transaction.partnerId },
          data: {
            investmentAmount: {
              increment: transaction.amount,
            },
          },
        });
      }

      await db.activityLog.create({
        data: {
          user: user.name,
          action: `Approved ${transaction.type.toLowerCase()} of ৳${transaction.amount.toLocaleString()} BDT for ${transaction.partner.name}.`,
        },
      });

      return NextResponse.json({ success: true, transaction: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Approve transaction API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
