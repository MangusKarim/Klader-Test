// src/app/api/search/route.ts
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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({ products: [], orders: [], partners: [] });
    }

    // Run parallel Prisma queries to match records
    const [products, orders, partners] = await Promise.all([
      db.product.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { sku: { contains: query } },
            { category: { contains: query } },
          ],
        },
        take: 5,
      }),
      db.order.findMany({
        where: {
          OR: [
            { customerName: { contains: query } },
            { customerPhone: { contains: query } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.partner.findMany({
        where: {
          name: { contains: query },
        },
        take: 3,
      }),
    ]);

    return NextResponse.json({ products, orders, partners });
  } catch (error) {
    console.error("Global search API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
