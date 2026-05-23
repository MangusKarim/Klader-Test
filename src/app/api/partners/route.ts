// src/app/api/partners/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/crypto";

// Helper to check user authentication and role
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

    if (user.role !== "ADMIN" && user.role !== "PARTNER") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // 1. Fetch Partners, Transactions, Orders, and Expenses
    const [partners, transactions, orders, expenses] = await Promise.all([
      db.partner.findMany({
        include: { user: true },
        orderBy: { name: "asc" },
      }),
      db.transaction.findMany({
        include: { partner: true },
        orderBy: { createdAt: "desc" },
      }),
      db.order.findMany({
        where: { deliveryStatus: { not: "CANCELLED" } },
      }),
      db.expense.findMany(),
    ]);

    // 2. Financial Totals
    const companySalesProfit = orders.reduce((sum, o) => sum + o.profit, 0);
    const companyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = companySalesProfit - companyExpenses;

    const totalInvestments = transactions
      .filter((t) => t.type === "INVESTMENT" && t.status === "APPROVED")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = transactions
      .filter((t) => t.type === "WITHDRAWAL" && t.status === "APPROVED")
      .reduce((sum, t) => sum + t.amount, 0);

    const undistributedReserve = totalInvestments + netProfit - totalWithdrawals;

    // 3. Calculate metrics for each partner
    const partnerData = partners.map((p) => {
      const pTransactions = transactions.filter((t) => t.partnerId === p.id && t.status === "APPROVED");
      
      const pInvestments = pTransactions
        .filter((t) => t.type === "INVESTMENT")
        .reduce((sum, t) => sum + t.amount, 0);

      const pWithdrawals = pTransactions
        .filter((t) => t.type === "WITHDRAWAL")
        .reduce((sum, t) => sum + t.amount, 0);

      // Profit earned = netProfit * (ownershipPercentage / 100)
      const pProfitShare = netProfit > 0 ? netProfit * (p.ownershipPercentage / 100) : 0;

      // Remaining Balance = pProfitShare + pInvestments - pWithdrawals
      const remainingBalance = pProfitShare + pInvestments - pWithdrawals;

      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        investmentAmount: p.investmentAmount,
        ownershipPercentage: p.ownershipPercentage,
        partnerType: p.partnerType,
        createdAt: p.createdAt,
        userId: p.userId,
        username: p.user?.username || null,
        totalInvestments: pInvestments,
        totalWithdrawals: pWithdrawals,
        profitShare: pProfitShare,
        remainingBalance: remainingBalance,
      };
    });

    return NextResponse.json({
      companySummary: {
        companySalesProfit,
        companyExpenses,
        netProfit,
        undistributedReserve,
      },
      partners: partnerData,
      transactions,
    });
  } catch (error) {
    console.error("Partners GET API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create new partner (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, investmentAmount, ownershipPercentage, partnerType, username, password } = await req.json();

    if (!name || !phone || !partnerType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let createdUserId: number | null = null;

    if (username) {
      // Check if username is taken
      const existingUser = await db.user.findUnique({
        where: { username },
      });
      if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }

      if (!password) {
        return NextResponse.json({ error: "Password is required when username is provided" }, { status: 400 });
      }

      const { hashPassword } = await import("@/lib/crypto");
      const userRecord = await db.user.create({
        data: {
          username,
          name,
          passwordHash: hashPassword(password),
          role: "PARTNER",
          permissions: "read,request_withdrawal,request_investment",
        },
      });
      createdUserId = userRecord.id;
    }

    // Create the partner
    const partner = await db.partner.create({
      data: {
        name,
        phone,
        investmentAmount: parseFloat(investmentAmount || 0),
        ownershipPercentage: parseFloat(ownershipPercentage || 0),
        partnerType,
        userId: createdUserId,
      },
    });

    // If there is initial investment, log it as an approved transaction
    if (parseFloat(investmentAmount) > 0) {
      await db.transaction.create({
        data: {
          partnerId: partner.id,
          type: "INVESTMENT",
          amount: parseFloat(investmentAmount),
          status: "APPROVED",
          requestedBy: user.name,
          approvedBy: "System",
          description: "Initial Capital Investment",
        },
      });
    }

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Added new partner: ${name} (${partnerType}).`,
      },
    });

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error("Partners POST API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Edit partner details (Admin only)
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, phone, ownershipPercentage, partnerType, username, password, additionalInvestment } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Partner ID is required" }, { status: 400 });
    }

    const existingPartner = await db.partner.findUnique({
      where: { id: parseInt(id) },
      include: { user: true },
    });

    if (!existingPartner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    let nextUserId = existingPartner.userId;
    const { hashPassword } = await import("@/lib/crypto");

    if (username) {
      // Check if username is taken by another user
      const existingUser = await db.user.findFirst({
        where: {
          username,
          NOT: nextUserId ? { id: nextUserId } : undefined,
        },
      });
      if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }

      if (existingPartner.user) {
        // Update existing user details
        await db.user.update({
          where: { id: existingPartner.userId! },
          data: {
            username,
            name,
            passwordHash: password ? hashPassword(password) : undefined,
          },
        });
      } else {
        // Create new user and link
        if (!password) {
          return NextResponse.json({ error: "Password is required for new user login" }, { status: 400 });
        }
        const newUser = await db.user.create({
          data: {
            username,
            name,
            passwordHash: hashPassword(password),
            role: "PARTNER",
            permissions: "read,request_withdrawal,request_investment",
          },
        });
        nextUserId = newUser.id;
      }
    } else if (username === "") {
      // If username is cleared explicitly, unlink and delete the associated user
      if (existingPartner.userId) {
        await db.partner.update({
          where: { id: existingPartner.id },
          data: { userId: null },
        });
        await db.user.delete({
          where: { id: existingPartner.userId },
        });
        nextUserId = null;
      }
    }

    const updated = await db.partner.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phone,
        ownershipPercentage: parseFloat(ownershipPercentage || 0),
        partnerType,
        userId: nextUserId,
      },
    });

    // Record additional investment if provided
    const addInv = parseFloat(additionalInvestment || 0);
    if (addInv > 0) {
      await db.transaction.create({
        data: {
          partnerId: updated.id,
          type: "INVESTMENT",
          amount: addInv,
          status: "APPROVED",
          requestedBy: user.name,
          approvedBy: user.name,
          description: "Additional Capital Investment by Admin",
        },
      });

      await db.partner.update({
        where: { id: updated.id },
        data: {
          investmentAmount: {
            increment: addInv,
          },
        },
      });
    }

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Updated details for partner: ${name}.${addInv > 0 ? ` Added investment of ৳${addInv.toLocaleString()} BDT.` : ""}`,
      },
    });

    return NextResponse.json({ success: true, partner: updated });
  } catch (error) {
    console.error("Partners PUT API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete partner (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Partner ID is required" }, { status: 400 });
    }

    const partner = await db.partner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    await db.partner.delete({
      where: { id: parseInt(id) },
    });

    if (partner.userId) {
      await db.user.delete({
        where: { id: partner.userId },
      });
    }

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Removed partner: ${partner.name}.`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Partners DELETE API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
