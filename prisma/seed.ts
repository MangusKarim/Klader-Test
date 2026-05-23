// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding fresh database...");

  // 1. Clean database
  await prisma.activityLog.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.partner.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Main Admin User
  console.log("Creating main admin user...");
  const adminPassword = hashPassword("Zadu00789");
  
  await prisma.user.create({
    data: {
      username: "Zadid",
      name: "Zadid",
      passwordHash: adminPassword,
      role: "ADMIN",
      permissions: "all",
    },
  });

  // 3. Create Initial Activity Log
  await prisma.activityLog.create({
    data: {
      user: "System",
      action: "Fresh database initialized. Main admin configured.",
    },
  });

  console.log("Database initialized fresh successfully!");
}

main()
  .catch((e) => {
    console.error("Error in seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
