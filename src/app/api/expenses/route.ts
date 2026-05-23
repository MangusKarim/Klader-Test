// src/app/api/expenses/route.ts
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
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const where: any = {};

    if (search) {
      where.description = { contains: search };
    }

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // Calculate sum per category for visual charts
    const allExpenses = await db.expense.findMany();
    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown: { [key: string]: number } = {};
    allExpenses.forEach((e) => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    });

    const categoryChartData = Object.keys(categoryBreakdown).map((cat) => ({
      category: cat,
      amount: categoryBreakdown[cat],
      percentage: totalExpenses > 0 ? (categoryBreakdown[cat] / totalExpenses) * 100 : 0,
    }));

    return NextResponse.json({
      expenses,
      totalExpenses,
      categoryChartData,
    });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Log new expense (Admin & Staff only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Access Denied. Admins and Staff only." }, { status: 403 });
    }

    const { category, amount, description, date, attachmentUrl } = await req.json();

    if (!category || !amount || !description || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        attachmentUrl: attachmentUrl || null,
      },
    });

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Logged expense of ৳${parseFloat(amount).toLocaleString()} BDT in category: ${category}.`,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Edit expense (Admin & Staff only)
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Access Denied. Admins and Staff only." }, { status: 403 });
    }

    const { id, category, amount, description, date, attachmentUrl } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    const existing = await db.expense.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense entry not found" }, { status: 404 });
    }

    const updated = await db.expense.update({
      where: { id: parseInt(id) },
      data: {
        category: category || existing.category,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        description: description || existing.description,
        date: date ? new Date(date) : existing.date,
        attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : existing.attachmentUrl,
      },
    });

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Updated details for logged expense (ID: ${updated.id}).`,
      },
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (error) {
    console.error("Expenses PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete expense (Admin & Staff only)
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Access Denied. Admins and Staff only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    const target = await db.expense.findUnique({
      where: { id: parseInt(id) },
    });

    if (!target) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await db.expense.delete({
      where: { id: parseInt(id) },
    });

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Deleted expense entry of ৳${target.amount.toLocaleString()} BDT (${target.category}).`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Expenses DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
