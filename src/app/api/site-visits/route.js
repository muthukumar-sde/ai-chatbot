import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.js";

export async function POST(req) {
  try {
    const { propertyId, userName, userEmail, userPhone, visitDate, visitTime, threadId } = await req.json();

    if (!propertyId || !userName || !userPhone || !visitDate || !visitTime) {
      return NextResponse.json(
        { error: "Property, Name, Phone, Visit Date, and Visit Time are required." },
        { status: 400 }
      );
    }

    // Verify property exists
    const prop = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!prop) {
      return NextResponse.json({ error: `Property ${propertyId} not found.` }, { status: 404 });
    }

    // Store Site Visit record in Prisma DB
    const siteVisit = await prisma.siteVisit.create({
      data: {
        propertyId,
        userName,
        userEmail: userEmail || null,
        userPhone,
        visitDate,
        visitTime,
        status: "CONFIRMED",
      },
    });

    // Update user memory profile if threadId provided
    if (threadId) {
      try {
        await prisma.userMemory.upsert({
          where: { threadId },
          update: {
            name: userName,
            email: userEmail || undefined,
            phone: userPhone,
          },
          create: {
            threadId,
            name: userName,
            email: userEmail || undefined,
            phone: userPhone,
          },
        });
      } catch (e) {
        console.warn("UserMemory update warning on site visit:", e.message);
      }
    }

    return NextResponse.json({
      success: true,
      visitId: siteVisit.id,
      propertyName: prop.propertyName,
      location: prop.location,
      city: prop.city,
      visitDate,
      visitTime,
    });
  } catch (error) {
    console.error("POST /api/site-visits error:", error);
    return NextResponse.json({ error: "Failed to schedule site visit" }, { status: 500 });
  }
}
