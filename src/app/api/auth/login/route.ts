// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    // Query user by username
    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Check password hash
    const inputHash = hashPassword(password);
    if (user.passwordHash !== inputHash) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Generate session token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions.split(","),
    };
    const token = generateToken(tokenPayload);

    // Save session in HTTP-Only cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "klader_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60, // 1 day in seconds
    });

    // Log login activity
    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Logged into the dashboard.`,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions.split(","),
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
