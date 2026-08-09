const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with real estate properties...");

  const propertiesPath = path.join(__dirname, "../src/data/properties.json");
  const raw = fs.readFileSync(propertiesPath, "utf-8").replace(/^\uFEFF/, "");
  const properties = JSON.parse(raw);

  for (const item of properties) {
    await prisma.property.upsert({
      where: { id: item.id },
      update: {
        propertyName: item.propertyName,
        slug: item.slug,
        type: item.type,
        location: item.location,
        city: item.city,
        latitude: item.latitude,
        longitude: item.longitude,
        price: item.price,
        bedrooms: item.bedrooms || null,
        area: item.area,
        areaUnit: item.areaUnit || "sqft",
        amenities: JSON.stringify(item.amenities || []),
        searchType: item.search_type || "buy",
      },
      create: {
        id: item.id,
        propertyName: item.propertyName,
        slug: item.slug,
        type: item.type,
        location: item.location,
        city: item.city,
        latitude: item.latitude,
        longitude: item.longitude,
        price: item.price,
        bedrooms: item.bedrooms || null,
        area: item.area,
        areaUnit: item.areaUnit || "sqft",
        amenities: JSON.stringify(item.amenities || []),
        searchType: item.search_type || "buy",
      },
    });
  }

  console.log(`✅ Successfully seeded ${properties.length} properties into Prisma DB!`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
