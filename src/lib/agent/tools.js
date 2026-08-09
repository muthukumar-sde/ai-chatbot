import fs from "fs";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { calculateDistance } from "./utils.js";
import { geocodePlace } from "@/lib/agent/geocode";
import { queryDocument } from "./rag.js";
import { PROPERTIES_PATH } from "./config.js";
import { prisma } from "@/lib/prisma.js";

function formatPrice(price, searchType) {
  if (!Number.isFinite(price)) return "N/A";

  const lowerSearchType = String(searchType || "").toLowerCase();
  if (lowerSearchType === "rent") {
    return `₹ ${new Intl.NumberFormat("en-IN").format(price)}/mo`;
  }

  if (price >= 10000000) {
    const crores = (price / 10000000).toFixed(2).replace(/\.00$/, "");
    return `₹ ${crores} Crores`;
  }
  if (price >= 100000) {
    const lakhs = (price / 100000).toFixed(2).replace(/\.00$/, "");
    return `₹ ${lakhs} Lakhs`;
  }

  return `₹ ${new Intl.NumberFormat("en-IN").format(price)}`;
}

async function getFreshProperties() {
  try {
    const records = await prisma.property.findMany();
    if (records && records.length > 0) {
      return records.map((r) => ({
        ...r,
        amenities: typeof r.amenities === "string" ? JSON.parse(r.amenities) : (r.amenities || []),
        search_type: r.searchType,
      }));
    }
  } catch (e) {
    console.warn("Prisma property query fallback:", e.message);
  }

  try {
    const raw = fs.readFileSync(PROPERTIES_PATH, "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load properties.json fallback", e);
    return [];
  }
}

export const searchProperties = tool(
  async (input, config) => {
    let params = { ...input };
    const userLocation = config?.configurable?.userLocation;
    console.log("mklogs search filter input", params);

    const properties = await getFreshProperties();

    let {
      city,
      type,
      search_type,
      minPrice,
      maxPrice,
      bedrooms,
      amenities,
      minArea,
      maxArea,
      nearLat,
      nearLon,
      nearPlace,
      maxDistance,
      sortBy,
      limit = 5,
    } = params;

    // Smart location fallback if user explicitly asks for "near me" or no location specified
    if ((!nearLat || !nearLon) && !nearPlace && !city && userLocation) {
      nearLat = userLocation.lat;
      nearLon = userLocation.lon;
      nearPlace = userLocation.city;
    }

    // Normalize price inputs if passed in Lakhs/Thousands instead of raw INR
    const isRent = String(search_type || "").toLowerCase() === "rent";

    if (maxPrice !== undefined) {
      if (!isRent && maxPrice <= 500) {
        maxPrice = maxPrice * 100000;
      } else if (isRent && maxPrice <= 150) {
        maxPrice = maxPrice * 1000;
      }
    }

    if (minPrice !== undefined) {
      if (!isRent && minPrice <= 500) {
        minPrice = minPrice * 100000;
      } else if (isRent && minPrice <= 150) {
        minPrice = minPrice * 1000;
      }
    }

    let filtered = properties;
    let resolvedLat = nearLat;
    let resolvedLon = nearLon;
    const distanceLimit = maxDistance || null;

    if (nearPlace && (!resolvedLat || !resolvedLon)) {
      const coords = await geocodePlace(nearPlace);
      if (coords) {
        resolvedLat = coords.lat;
        resolvedLon = coords.lon;
      }
    }

    if (city) {
      const lowerCity = city.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.city.toLowerCase() === lowerCity ||
          p.location.toLowerCase().includes(lowerCity)
      );
    }

    if (type) {
      const lowerType = type.toLowerCase().trim();
      if (lowerType === "residential") {
        filtered = filtered.filter((p) =>
          ["apartment", "house", "villa", "penthouse"].includes(p.type.toLowerCase())
        );
      } else if (lowerType === "flat" || lowerType === "flats") {
        filtered = filtered.filter((p) => p.type.toLowerCase() === "apartment");
      } else if (lowerType === "home" || lowerType === "independent house") {
        filtered = filtered.filter((p) => p.type.toLowerCase() === "house");
      } else {
        filtered = filtered.filter((p) => p.type.toLowerCase() === lowerType);
      }
    }

    if (search_type) {
      const lowerSearchType = search_type.toLowerCase().trim();
      filtered = filtered.filter(
        (p) => (p.search_type || "").toLowerCase() === lowerSearchType
      );
    }

    const commercialMode = String(type || "").toLowerCase() === "commercial";

    if (bedrooms !== undefined && !commercialMode) {
      filtered = filtered.filter((p) => p.bedrooms === bedrooms);
    }

    if (minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= maxPrice * 1.1);
    }

    if (minArea !== undefined) {
      filtered = filtered.filter((p) => p.area >= minArea);
    }

    if (maxArea !== undefined) {
      filtered = filtered.filter((p) => p.area <= maxArea);
    }

    if (amenities && amenities.length > 0) {
      const requestedAmenities = Array.isArray(amenities) ? amenities : [amenities];
      filtered = filtered.filter((p) =>
        requestedAmenities.every((req) =>
          p.amenities.some((am) => am.toLowerCase().includes(req.toLowerCase()))
        )
      );
    }

    const isProximitySearch = !!(nearPlace || (resolvedLat && resolvedLon));

    if (isProximitySearch && resolvedLat && resolvedLon) {
      filtered = filtered.map((p) => ({
        ...p,
        distance: calculateDistance(resolvedLat, resolvedLon, p.latitude, p.longitude),
      }));
      if (distanceLimit) {
        filtered = filtered.filter((p) => p.distance <= distanceLimit);
      }
      if (!sortBy) {
        filtered.sort((a, b) => a.distance - b.distance);
      }
    }

    // Apply custom sorting
    if (sortBy) {
      if (sortBy === "price_asc") {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sortBy === "price_desc") {
        filtered.sort((a, b) => b.price - a.price);
      } else if (sortBy === "area_desc") {
        filtered.sort((a, b) => b.area - a.area);
      } else if (sortBy === "distance_asc" && isProximitySearch) {
        filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }
    }

    const resultsCount = Math.min(Math.max(1, limit), 10);
    const results = filtered.slice(0, resultsCount).map((p) => {
      const isOverBudget = maxPrice !== undefined && p.price > maxPrice;
      const result = {
        id: p.id,
        name: p.propertyName,
        slug: p.slug,
        type: p.type,
        search_type: p.search_type,
        location: p.location,
        city: p.city,
        area_sqft: p.area,
        price_inr: formatPrice(p.price, p.search_type),
        raw_price: p.price,
        amenities: Array.isArray(p.amenities) ? p.amenities.join(", ") : String(p.amenities),
        is_over_budget: isOverBudget,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`,
      };
      if (String(p.type || "").toLowerCase() !== "commercial") {
        result.bedrooms = p.bedrooms;
      }
      if (isProximitySearch && p.distance !== undefined && p.distance <= 200) {
        result.distance = `${p.distance.toFixed(1)} km away`;
      }
      return result;
    });

    console.log("mklogs search results count:", results.length, "total filtered:", filtered.length);

    return JSON.stringify({
      totalCount: filtered.length,
      showingCount: results.length,
      properties: results,
    });
  },
  {
    name: "search_properties",
    description:
      "Search for real estate properties in Tamil Nadu based on filters like city, property type, buy vs rent, budget, bedrooms, amenities, and sorting.",
    schema: z.object({
      city: z.string().optional().describe("City or neighborhood name (e.g., Coimbatore, Chennai, Velachery, Madurai)"),
      type: z.string().optional().describe("Property type (e.g., House, Apartment, Villa, Commercial, Plot)"),
      search_type: z.enum(["buy", "rent"]).optional().describe("Whether user wants to buy or rent listings"),
      minPrice: z.number().optional().describe("Minimum price in Rupees or Lakhs/Thousands"),
      maxPrice: z.number().optional().describe("Maximum price in Rupees or Lakhs/Thousands"),
      bedrooms: z.number().optional().describe("Number of bedrooms (1, 2, 3, 4) for residential properties"),
      maxDistance: z.number().optional().describe("Maximum distance in km for nearby properties"),
      amenities: z.array(z.string()).optional().describe("List of desired amenities (Gym, Swimming Pool, Parking, etc.)"),
      minArea: z.number().optional().describe("Minimum area in sqft"),
      maxArea: z.number().optional().describe("Maximum area in sqft"),
      nearLat: z.number().optional().describe("Latitude for proximity search"),
      nearLon: z.number().optional().describe("Longitude for proximity search"),
      nearPlace: z.string().optional().describe("Place or landmark for proximity search"),
      sortBy: z.enum(["price_asc", "price_desc", "area_desc", "distance_asc"]).optional().describe("Sort option: price_asc (cheapest), price_desc (luxury), area_desc (spacious), distance_asc (closest)"),
      limit: z.number().optional().describe("Number of properties to return (default 5, max 10)"),
    }),
  }
);

export const queryKnowledgeBase = tool(
  async ({ query }) => {
    return await queryDocument(query);
  },
  {
    name: "query_knowledge_base",
    description:
      "Query the MK Properties knowledge base for company info, legal guidelines, home loan assistance, required documents, or real estate policies.",
    schema: z.object({
      query: z.string().describe("The search query for the real estate knowledge base."),
    }),
  }
);

export const searchNearbyAmenities = tool(
  async (input, config) => {
    let { lat, lon, place, amenityTypes, radius, propertyId, propertyName } = input;
    let propertyDetails = null;
    const properties = getFreshProperties();

    if (propertyId) {
      const matchedProperty = properties.find((p) => p.id === propertyId);
      if (matchedProperty) {
        lat = matchedProperty.latitude;
        lon = matchedProperty.longitude;
        propertyDetails = matchedProperty;
      } else {
        return `Could not find property with ID '${propertyId}'.`;
      }
    } else if (propertyName) {
      const lowerName = propertyName.toLowerCase();
      const matchedProperty = properties.find(
        (p) =>
          p.propertyName.toLowerCase().includes(lowerName) ||
          (p.slug && p.slug.toLowerCase() === lowerName)
      );
      if (matchedProperty) {
        lat = matchedProperty.latitude;
        lon = matchedProperty.longitude;
        propertyDetails = matchedProperty;
      } else {
        return `Could not find property matching '${propertyName}'. Please provide a valid property name from the search results.`;
      }
    } else if (place && (!lat || !lon)) {
      const coords = await geocodePlace(place);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      } else {
        return `Could not find location coordinates for '${place}'.`;
      }
    }

    if (!lat || !lon) {
      return "Latitude and Longitude, a valid place name, or a propertyId/propertyName are required.";
    }

    radius = radius || 3000; // default 3km

    const rawTypes = Array.isArray(amenityTypes) ? amenityTypes : [amenityTypes];

    const getQueryTag = (typeStr) => {
      const lower = typeStr.toLowerCase().trim();
      if (lower.includes("school") || lower.includes("education")) return `node["amenity"="school"]`;
      if (lower.includes("college") || lower.includes("university")) return `node["amenity"="college"]`;
      if (lower.includes("hospital") || lower.includes("clinic") || lower.includes("medical")) return `node["amenity"="hospital"]`;
      if (lower.includes("supermarket") || lower.includes("grocery") || lower.includes("store")) return `node["shop"="supermarket"]`;
      if (lower.includes("park") || lower.includes("garden")) return `node["leisure"="park"]`;
      if (lower.includes("railway") || lower.includes("train") || lower.includes("metro")) return `node["railway"="station"]`;
      if (lower.includes("bus")) return `node["highway"="bus_stop"]`;
      if (lower.includes("bank")) return `node["amenity"="bank"]`;
      if (lower.includes("atm")) return `node["amenity"="atm"]`;
      if (lower.includes("restaurant") || lower.includes("food") || lower.includes("cafe")) return `node["amenity"="restaurant"]`;
      if (lower.includes("mall") || lower.includes("shopping")) return `node["shop"="mall"]`;
      if (lower.includes("temple") || lower.includes("worship") || lower.includes("church")) return `node["amenity"="place_of_worship"]`;
      if (lower.includes("gym") || lower.includes("fitness")) return `node["leisure"="fitness_centre"]`;
      return `node["amenity"~"${lower.replace(/s$/, "")}",i]`;
    };

    const queryParts = rawTypes
      .map((t) => {
        const tag = getQueryTag(t);
        return `
        ${tag}(around:${radius},${lat},${lon});
        way${tag.substring(4)}(around:${radius},${lat},${lon});
      `;
      })
      .join("\n");

    const overpassQuery = `[out:json][timeout:10];
    (
      ${queryParts}
    );
    out center 15;`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Overpass API status " + res.status);
      const data = await res.json();

      let amenitiesOutput = "";

      if (data && data.elements && data.elements.length > 0) {
        const grouped = {};
        data.elements.forEach((e) => {
          let category = "Local Point";
          const tags = e.tags || {};
          if (tags.amenity) category = tags.amenity;
          else if (tags.shop) category = tags.shop;
          else if (tags.leisure) category = tags.leisure;
          else if (tags.highway) category = tags.highway;
          else if (tags.railway) category = tags.railway;

          if (!grouped[category]) grouped[category] = [];

          const name = tags.name || tags["name:en"] || "Nearby " + category;
          const elat = e.lat || e.center?.lat;
          const elon = e.lon || e.center?.lon;
          const dist = calculateDistance(lat, lon, elat, elon).toFixed(1);
          grouped[category].push(`${name} (${dist} km away)`);
        });

        const sections = Object.entries(grouped).map(([cat, list]) => {
          const top5 = Array.from(new Set(list)).slice(0, 4);
          const categoryTitle = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ");
          return `**${categoryTitle}**:\n- ${top5.join("\n- ")}`;
        });
        amenitiesOutput = sections.join("\n\n");
      } else {
        amenitiesOutput = `No resources matching '${rawTypes.join(", ")}' found within ${radius} meters radius.`;
      }

      if (propertyDetails) {
        return `Property Details:\n- Name: ${propertyDetails.propertyName}\n- Location: ${propertyDetails.location}\n- Price: ${formatPrice(propertyDetails.price, propertyDetails.search_type)}\n- Area: ${propertyDetails.area} sqft\n- Type: ${propertyDetails.type}\n\nNearby Places & Amenities:\n${amenitiesOutput}`;
      }
      return amenitiesOutput;
    } catch (err) {
      console.warn("Overpass API fallback triggered:", err.message);
      if (propertyDetails) {
        return `Property Details:\n- Name: ${propertyDetails.propertyName}\n- Location: ${propertyDetails.location}\n- Price: ${formatPrice(propertyDetails.price, propertyDetails.search_type)}\n- Area: ${propertyDetails.area} sqft\n\nNearby Amenities search timed out. Prime amenities (schools, hospitals, transit) are located within 2-3 km in ${propertyDetails.location}.`;
      }
      return `Nearby amenities search is temporarily unavailable for this area. Please ask about specific property details.`;
    }
  },
  {
    name: "search_nearby_amenities",
    description: "Search for nearby amenities (schools, hospitals, supermarkets, parks, transit stops, ATMs, gyms) near a property or location.",
    schema: z.object({
      lat: z.number().optional().describe("Latitude of the center point"),
      lon: z.number().optional().describe("Longitude of the center point"),
      place: z.string().optional().describe("Name of the place if lat/lon is not available"),
      propertyId: z.string().optional().describe("Unique ID of the property (e.g. MK1001)"),
      propertyName: z.string().optional().describe("Name of the property to lookup"),
      amenityTypes: z.union([z.string(), z.array(z.string())]).describe("Amenity category (school, hospital, supermarket, park, atm, bus, train, restaurant, mall)"),
      radius: z.number().optional().describe("Search radius in meters (default 3000)"),
    }),
  }
);

export const saveFavoriteProperty = tool(
  async ({ propertyId, threadId }) => {
    try {
      if (!propertyId) return "Property ID is required.";
      const targetThread = threadId || "default-thread";
      const existing = await prisma.favorite.findUnique({
        where: { threadId_propertyId: { threadId: targetThread, propertyId } },
      });
      if (existing) {
        return `Property ${propertyId} is already saved in your favorites!`;
      }
      await prisma.favorite.create({
        data: { threadId: targetThread, propertyId },
      });
      const prop = await prisma.property.findUnique({ where: { id: propertyId } });
      return `Successfully saved **${prop?.propertyName || propertyId}** to your favorites! You can view all saved listings by tapping the Heart ❤️ icon in the header.`;
    } catch (e) {
      console.error("saveFavoriteProperty tool error:", e);
      return `Failed to save property ${propertyId}.`;
    }
  },
  {
    name: "save_favorite_property",
    description: "Save a property to the user's saved favorites list by property ID (e.g., MK1001).",
    schema: z.object({
      propertyId: z.string().describe("The ID of the property to save (e.g. MK1001, MK1002)"),
      threadId: z.string().optional().describe("Current user conversation thread ID"),
    }),
  }
);
