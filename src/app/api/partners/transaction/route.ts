// src/app/api/partners/transaction/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Session check
    const cookieStore = await cookies();
    const session = cookieStore.get("klader_session");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = verifyToken(session.value);
    if (!user || (user.role !== "ADMIN" && user.role !== "PARTNER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const { partnerId, type, amount, description } = await req.json();

    if (!partnerId || !type || !amount || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const reqPartnerId = parseInt(partnerId);
    const reqAmount = parseFloat(amount);

    if (reqAmount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    // Verify that a partner user is not requesting a transaction on behalf of someone else
    if (user.role === "PARTNER") {
      // Find the partner profile corresponding to the logged in partner user
      const partnerProfile = await db.partner.findFirst({
        where: { name: user.name },
      });
      if (!partnerProfile || partnerProfile.id !== reqPartnerId) {
        return NextResponse.json({ error: "You can only request transactions for your own account" }, { status: 403 });
      }
    }

    // Auto-approve if requested by the Main Admin (Zadid)
    const isApproved = user.role === "ADMIN";
    const status = isApproved ? "APPROVED" : "PENDING";
    const approvedBy = isApproved ? user.name : null;

    // Create transaction log
    const transaction = await db.transaction.create({
      data: {
        partnerId: reqPartnerId,
        type,
        amount: reqAmount,
        status,
        requestedBy: user.name,
        approvedBy,
        description,
      },
    });

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Submitted a ${type.toLowerCase()} request of ৳${reqAmount.toLocaleString()} BDT (${status}).`,
      },
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error("Partner transaction API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
