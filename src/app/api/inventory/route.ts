// src/app/api/inventory/route.ts
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
    const category = searchParams.get("category") || "";
    const size = searchParams.get("size") || "";
    const color = searchParams.get("color") || "";
    const status = searchParams.get("status") || "";

    // Build query conditions
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { supplierName: { contains: search } },
      ];
    }

    if (category) where.category = category;
    if (size) where.size = size;
    if (color) where.color = color;
    if (status) where.status = status;

    const products = await db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    // Fetch list of unique categories, sizes, and colors for filter dropdowns
    const allProducts = await db.product.findMany({
      select: { category: true, size: true, color: true },
    });

    const categories = Array.from(new Set(allProducts.map((p) => p.category))).filter(Boolean);
    const sizes = Array.from(new Set(allProducts.map((p) => p.size))).filter(Boolean);
    const colors = Array.from(new Set(allProducts.map((p) => p.color))).filter(Boolean);

    return NextResponse.json({
      products,
      filters: {
        categories,
        sizes,
        colors,
      },
    });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create new product (Admin & Staff only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Access Denied. Admins and Staff only." }, { status: 403 });
    }

    const { name, sku, category, color, size, buyingPrice, sellingPrice, stockQuantity, supplierName, imageUrl } = await req.json();

    if (!name || !sku || !category || !buyingPrice || !sellingPrice || stockQuantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check SKU uniqueness
    const existing = await db.product.findUnique({
      where: { sku },
    });
    if (existing) {
      return NextResponse.json({ error: "Product SKU must be unique. This SKU is already registered." }, { status: 400 });
    }

    const qty = parseInt(stockQuantity);
    const productStatus = getProductStatus(qty);

    const product = await db.product.create({
      data: {
        name,
        sku,
        category,
        color: color || "",
        size: size || "",
        buyingPrice: parseFloat(buyingPrice),
        sellingPrice: parseFloat(sellingPrice),
        stockQuantity: qty,
        supplierName: supplierName || "Direct Clothing Manufacturer",
        imageUrl: imageUrl || null,
        status: productStatus,
      },
    });

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Added product ${name} (SKU: ${sku}) with ${qty} items in stock.`,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Edit product (Admin & Staff only)
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Access Denied. Admins and Staff only." }, { status: 403 });
    }

    const { id, name, sku, category, color, size, buyingPrice, sellingPrice, stockQuantity, supplierName, imageUrl } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Verify product exists
    const existingProduct = await db.product.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check SKU uniqueness if changed
    if (sku && sku !== existingProduct.sku) {
      const existingSku = await db.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        return NextResponse.json({ error: "Product SKU must be unique. This SKU is already registered." }, { status: 400 });
      }
    }

    const qty = stockQuantity !== undefined ? parseInt(stockQuantity) : existingProduct.stockQuantity;
    const productStatus = getProductStatus(qty);

    const updated = await db.product.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingProduct.name,
        sku: sku || existingProduct.sku,
        category: category || existingProduct.category,
        color: color !== undefined ? color : existingProduct.color,
        size: size !== undefined ? size : existingProduct.size,
        buyingPrice: buyingPrice !== undefined ? parseFloat(buyingPrice) : existingProduct.buyingPrice,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : existingProduct.sellingPrice,
        stockQuantity: qty,
        supplierName: supplierName !== undefined ? supplierName : existingProduct.supplierName,
        imageUrl: imageUrl !== undefined ? imageUrl : existingProduct.imageUrl,
        status: productStatus,
      },
    });

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Updated product details for ${updated.name} (SKU: ${updated.sku}).`,
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error("Inventory PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete product (Admin & Staff only)
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
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const target = await db.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!target) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await db.product.delete({
      where: { id: parseInt(id) },
    });

    await db.activityLog.create({
      data: {
        user: user.name,
        action: `Deleted product: ${target.name} (SKU: ${target.sku}).`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inventory DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
