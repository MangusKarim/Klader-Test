// src/app/api/sales/route.ts
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

// Helper to update product status based on stock level
function getProductStatus(quantity: number): string {
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= 5) return "LOW_STOCK";
  return "IN_STOCK";
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const deliveryStatus = searchParams.get("deliveryStatus") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    if (deliveryStatus) where.deliveryStatus = deliveryStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const orders = await db.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Sales GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create new sales order
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      customerName,
      customerPhone,
      customerAddress,
      printedOrSolid,
      printSize,
      printCost,
      deliveryCharge,
      advancePayment,
      paymentMethod,
      items, // Array of { productId: number, quantity: number, sellingPrice: number }
    } = await req.json();

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing customer details or items" }, { status: 400 });
    }

    const pCost = parseFloat(printCost || 0);
    const dCharge = parseFloat(deliveryCharge || 0);
    const advPay = parseFloat(advancePayment || 0);

    // 1. Validate stock level availability and calculate totals
    let computedItemsTotal = 0;
    let computedTotalBuyingCost = 0;

    const validatedItems: any[] = [];

    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json({ error: `Product not found (ID: ${item.productId})` }, { status: 400 });
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for product: ${product.name}. Requested: ${item.quantity}, Available: ${product.stockQuantity}.`
        }, { status: 400 });
      }

      computedItemsTotal += item.sellingPrice * item.quantity;
      computedTotalBuyingCost += product.buyingPrice * item.quantity;

      validatedItems.push({
        productId: product.id,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        size: product.size,
        color: product.color,
        product,
      });
    }

    // Formulas:
    // Total Customer Invoice = Item Retail Prices + printCost + deliveryCharge
    const invoiceTotal = computedItemsTotal + pCost + dCharge;
    const remainingDue = invoiceTotal - advPay;
    
    let paymentStatus = "UNPAID";
    if (advPay >= invoiceTotal) {
      paymentStatus = "PAID";
    } else if (advPay > 0) {
      paymentStatus = "PARTIAL";
    }

    // Profit = Total Retail Selling Price - Total Production Buying Cost
    const totalProfit = computedItemsTotal - computedTotalBuyingCost;

    // 2. Perform DB operations in a transaction to guarantee atomicity
    const result = await db.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          customerName,
          customerPhone,
          customerAddress: customerAddress || "",
          printedOrSolid,
          printSize: printedOrSolid === "PRINTED" ? printSize : null,
          printCost: pCost,
          deliveryCharge: dCharge,
          advancePayment: advPay,
          remainingDue,
          paymentStatus,
          paymentMethod,
          deliveryStatus: "PENDING",
          totalAmount: invoiceTotal,
          profit: totalProfit,
          orderItems: {
            create: validatedItems.map((v) => ({
              productId: v.productId,
              quantity: v.quantity,
              sellingPrice: v.sellingPrice,
              size: v.size,
              color: v.color,
            })),
          },
        },
      });

      // Deduct inventory quantities and update statuses
      for (const item of validatedItems) {
        const nextQty = item.product.stockQuantity - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: nextQty,
            status: getProductStatus(nextQty),
          },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          user: user.name,
          action: `Placed Order #${newOrder.id} for ${customerName} (৳${invoiceTotal.toLocaleString()} BDT).`,
        },
      });

      return newOrder;
    });

    return NextResponse.json({ success: true, orderId: result.id });
  } catch (error) {
    console.error("Sales POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Edit Order details (Change Delivery or Payment Status)
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, deliveryStatus, paymentStatus, advancePayment } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const existingOrder = await db.order.findUnique({
      where: { id: parseInt(id) },
      include: { orderItems: { include: { product: true } } },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatedData: any = {};

    // 1. If modifying advance payment or paymentStatus
    if (advancePayment !== undefined || paymentStatus !== undefined) {
      const advPay = advancePayment !== undefined ? parseFloat(advancePayment) : existingOrder.advancePayment;
      const finalTotal = existingOrder.totalAmount;
      const remainingDue = finalTotal - advPay;

      updatedData.advancePayment = advPay;
      updatedData.remainingDue = remainingDue;

      if (paymentStatus) {
        updatedData.paymentStatus = paymentStatus;
      } else {
        if (advPay >= finalTotal) {
          updatedData.paymentStatus = "PAID";
        } else if (advPay > 0) {
          updatedData.paymentStatus = "PARTIAL";
        } else {
          updatedData.paymentStatus = "UNPAID";
        }
      }
    }

    // 2. If modifying deliveryStatus (handle cancellation replenishment)
    if (deliveryStatus && deliveryStatus !== existingOrder.deliveryStatus) {
      updatedData.deliveryStatus = deliveryStatus;

      // Handle stock replenishment upon cancellation
      if (deliveryStatus === "CANCELLED" && existingOrder.deliveryStatus !== "CANCELLED") {
        await db.$transaction(async (tx) => {
          for (const item of existingOrder.orderItems) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product) {
              const nextQty = product.stockQuantity + item.quantity;
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: nextQty,
                  status: getProductStatus(nextQty),
                },
              });
            }
          }
        });
      }

      // Handle stock re-deduction if an order is restored from CANCELLED to another status
      if (existingOrder.deliveryStatus === "CANCELLED" && deliveryStatus !== "CANCELLED") {
        // First check if there is sufficient stock to restore
        for (const item of existingOrder.orderItems) {
          const product = await db.product.findUnique({ where: { id: item.productId } });
          if (!product || product.stockQuantity < item.quantity) {
            return NextResponse.json({
              error: `Cannot restore order. Insufficient stock in inventory for ${product?.name || "Product"}.`
            }, { status: 400 });
          }
        }

        // Deduct inventory
        await db.$transaction(async (tx) => {
          for (const item of existingOrder.orderItems) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product) {
              const nextQty = product.stockQuantity - item.quantity;
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: nextQty,
                  status: getProductStatus(nextQty),
                },
              });
            }
          }
        });
      }
    }

    const result = await db.order.update({
      where: { id: parseInt(id) },
      data: updatedData,
    });

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Updated status for Order #${result.id} (Delivery: ${result.deliveryStatus}, Payment: ${result.paymentStatus}).`,
      },
    });

    return NextResponse.json({ success: true, order: result });
  } catch (error) {
    console.error("Sales PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
