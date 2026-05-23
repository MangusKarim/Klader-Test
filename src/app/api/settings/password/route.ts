// src/app/api/settings/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken, hashPassword } from "@/lib/crypto";

async function getAuthUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klader_session");
  if (!session) return null;
  return verifyToken(session.value);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing current or new password" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentHash = hashPassword(currentPassword);
    if (dbUser.passwordHash !== currentHash) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    const newHash = hashPassword(newPassword);
    await db.user.update({
      where: { id: user.userId },
      data: { passwordHash: newHash },
    });

    // Log password change activity
    await db.activityLog.create({
      data: {
        user: dbUser.name,
        action: "Changed their account password.",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
