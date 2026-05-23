// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("klader_session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(sessionCookie.value);

    if (!payload) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    // Clean up internal exp from client-facing user object
    const { exp, ...user } = payload;

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth check API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
