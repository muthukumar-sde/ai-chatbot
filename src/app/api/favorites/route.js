import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.js";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json({ favorites: [] });
    }

    const favs = await prisma.favorite.findMany({
      where: { threadId },
      include: { property: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = favs.map((f) => {
      const p = f.property;
      return {
        id: p.id,
        name: p.propertyName,
        location: p.location,
        city: p.city,
        type: p.type,
        bedrooms: p.bedrooms,
        price: p.price,
        search_type: p.searchType,
        area: p.area,
      };
    });

    return NextResponse.json({ favorites: formatted });
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { threadId, propertyId } = await req.json();

    if (!threadId || !propertyId) {
      return NextResponse.json({ error: "threadId and propertyId are required" }, { status: 400 });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        threadId_propertyId: { threadId, propertyId },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ action: "removed", propertyId });
    } else {
      await prisma.favorite.create({
        data: { threadId, propertyId },
      });
      return NextResponse.json({ action: "added", propertyId });
    }
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
  }
}
