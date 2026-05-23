// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function ensureDatabaseSchema() {
  // Ensure .env file exists with default DATABASE_URL
  const envPath = path.resolve(process.cwd(), ".env");
  if (!process.env.DATABASE_URL && !fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, 'DATABASE_URL="file:./dev.db"\n');
    process.env.DATABASE_URL = "file:./dev.db";
  }

  // Check if User table exists
  try {
    await db.user.count();
  } catch (error: any) {
    if (error.message?.includes("does not exist") || error.code === "P2021" || error.message?.includes("User")) {
      console.log("Database table missing. Running prisma db push programmatically...");
      try {
        const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
        const prismaCliPath = path.resolve(process.cwd(), "node_modules", "prisma", "build", "index.js");
        const cmd = `node "${prismaCliPath}" db push --schema="${schemaPath}" --accept-data-loss`;
        const output = execSync(cmd, {
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db" }
        });
        console.log("Database schema pushed successfully! Output:", output.toString());
      } catch (pushError: any) {
        const stdout = pushError.stdout ? pushError.stdout.toString() : "";
        const stderr = pushError.stderr ? pushError.stderr.toString() : "";
        console.error("Failed to push prisma schema. stdout:", stdout, "stderr:", stderr);
        throw new Error(`Failed to push prisma schema: ${pushError.message}. stdout: ${stdout}. stderr: ${stderr}`);
      }
    } else {
      throw error;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Ensure database schema and tables exist
    await ensureDatabaseSchema();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    // Check if user table is completely empty (e.g., on a fresh database deployment)
    const userCount = await db.user.count();
    if (userCount === 0) {
      const adminPassword = hashPassword("Zadu00789");
      await db.user.create({
        data: {
          username: "Zadid",
          name: "Zadid",
          passwordHash: adminPassword,
          role: "ADMIN",
          permissions: "all",
        },
      });
      await db.activityLog.create({
        data: {
          user: "System",
          action: "Fresh database initialized. Main admin configured.",
        },
      });
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
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error.message || String(error),
    }, { status: 500 });
  }
}
