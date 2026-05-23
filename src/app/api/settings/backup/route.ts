// src/app/api/settings/backup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/crypto";

async function getAuthUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klader_session");
  if (!session) return null;
  return verifyToken(session.value);
}

function parseDates(obj: any, dateFields: string[]) {
  const parsed = { ...obj };
  for (const field of dateFields) {
    if (parsed[field]) {
      parsed[field] = new Date(parsed[field]);
    }
  }
  return parsed;
}

// Export database as JSON
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin permissions required." }, { status: 401 });
    }

    const users = await db.user.findMany();
    const partners = await db.partner.findMany();
    const transactions = await db.transaction.findMany();
    const products = await db.product.findMany();
    const orders = await db.order.findMany();
    const orderItems = await db.orderItem.findMany();
    const expenses = await db.expense.findMany();
    const activityLogs = await db.activityLog.findMany();

    // Sensitive data filter (do not output passwords hashes for non-admins if they export, but here admin is exporting so it's fine)
    // We return everything so it can be restored perfectly.

    return NextResponse.json({
      exportDate: new Date().toISOString(),
      exportedBy: user.username,
      users,
      partners,
      transactions,
      products,
      orders,
      orderItems,
      expenses,
      activityLogs,
    });
  } catch (error) {
    console.error("Backup export GET error:", error);
    return NextResponse.json({ error: "Internal server error during export" }, { status: 500 });
  }
}

// Restore database from JSON
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin permissions required." }, { status: 401 });
    }

    const data = await req.json();

    // Structure validation
    if (!data.users || !data.partners || !data.products || !data.orders || !data.expenses) {
      return NextResponse.json({ error: "Invalid backup file structure. Missing core collections." }, { status: 400 });
    }

    // Verify there is at least one admin account in the backup to avoid complete lockout
    const hasAdmin = data.users.some((u: any) => u.role === "ADMIN");
    if (!hasAdmin) {
      return NextResponse.json({ error: "Restore cancelled. The uploaded backup does not contain any Admin accounts, which would result in lockout." }, { status: 400 });
    }

    // Perform restoration in a Prisma Transaction
    await db.$transaction(async (tx) => {
      // 1. Clear all existing data in reverse dependency order
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.transaction.deleteMany();
      await tx.partner.deleteMany();
      await tx.product.deleteMany();
      await tx.expense.deleteMany();
      await tx.activityLog.deleteMany();
      await tx.user.deleteMany();

      // 2. Insert records in dependency order
      for (const item of data.users) {
        await tx.user.create({
          data: parseDates(item, ["createdAt", "updatedAt"]),
        });
      }

      for (const item of data.partners) {
        await tx.partner.create({
          data: parseDates(item, ["createdAt", "updatedAt"]),
        });
      }

      for (const item of data.products) {
        await tx.product.create({
          data: parseDates(item, ["createdAt", "updatedAt"]),
        });
      }

      for (const item of data.orders) {
        await tx.order.create({
          data: parseDates(item, ["createdAt", "updatedAt"]),
        });
      }

      for (const item of data.orderItems) {
        await tx.orderItem.create({
          data: item,
        });
      }

      for (const item of data.transactions) {
        await tx.transaction.create({
          data: parseDates(item, ["createdAt", "updatedAt"]),
        });
      }

      for (const item of data.expenses) {
        await tx.expense.create({
          data: parseDates(item, ["date", "createdAt", "updatedAt"]),
        });
      }

      if (data.activityLogs && Array.isArray(data.activityLogs)) {
        for (const item of data.activityLogs) {
          await tx.activityLog.create({
            data: parseDates(item, ["timestamp"]),
          });
        }
      }

      // Log successful restoration
      await tx.activityLog.create({
        data: {
          user: user.name,
          action: `Restored entire database from backup file.`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Database restored successfully." });
  } catch (error: any) {
    console.error("Backup restore POST error:", error);
    return NextResponse.json({ error: `Internal server error during restore: ${error.message || error}` }, { status: 500 });
  }
}
