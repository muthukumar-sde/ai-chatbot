import fs from "fs";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { calculateDistance } from "./utils.js";
import { geocodePlace } from "@/lib/agent/geocode";
import { queryDocument } from "./rag.js";
import { PROPERTIES_PATH } from "./config.js";

function formatPriceINR(price) {
  if (!Number.isFinite(price)) return "N/A";
  if (price >= 10000000) {
    const crores = price / 10000000;
    return `Rs ${crores.toFixed(2)} Crore`;
  }
  const lakhs = price / 100000;
  return `Rs ${lakhs.toFixed(0)} Lakhs`;
}

// Load property data (BOM-safe)
const rawProperties = fs.readFileSync(PROPERTIES_PATH, "utf-8").replace(/^\uFEFF/, "");
const properties = JSON.parse(rawProperties);

export const searchProperties = tool(
  async (input, config) => {
    let params = { ...input };
    const userLocation = config?.configurable?.userLocation;

    if (params.city) {
      delete params.nearLat;
      delete params.nearLon;
      delete params.nearPlace;
    } else if ((!params.nearLat || !params.nearLon) && userLocation) {
      params.nearLat = userLocation.lat;
      params.nearLon = userLocation.lon;
      params.nearPlace = userLocation.city;
    }

    const {
      city,
      type,
      department,
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
    } = params;

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
      const lowerCity = city.toLowerCase();
      filtered = filtered.filter(
        (p) => p.city.toLowerCase() === lowerCity || p.location.toLowerCase().includes(lowerCity)
      );
    }

    if (type) {
      const lowerType = type.toLowerCase();
      filtered = filtered.filter((p) => p.type.toLowerCase() === lowerType);
    }

    if (department) {
      const lowerDepartment = department.toLowerCase();
      filtered = filtered.filter((p) => (p.department || "").toLowerCase() === lowerDepartment);
    }

    if (search_type) {
      const lowerSearchType = search_type.toLowerCase();
      filtered = filtered.filter((p) => (p.search_type || "").toLowerCase() === lowerSearchType);
    }

    const commercialMode =
      String(department || "").toLowerCase() === "commercial" ||
      String(type || "").toLowerCase() === "commercial";

    if (bedrooms !== undefined && !commercialMode) {
      filtered = filtered.filter((p) => p.bedrooms === bedrooms);
    }

    if (minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= maxPrice);
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

    const isProximitySearch = !!(nearPlace || (nearLat && nearLon));

    if (isProximitySearch && resolvedLat && resolvedLon) {
      filtered = filtered.map((p) => ({
        ...p,
        distance: calculateDistance(resolvedLat, resolvedLon, p.latitude, p.longitude),
      }));
      if (distanceLimit) {
        filtered = filtered.filter((p) => p.distance <= distanceLimit);
      }
      filtered.sort((a, b) => a.distance - b.distance);
    }

    const results = filtered.slice(0, 5).map((p) => {
      const result = {
        name: p.propertyName,
        slug: p.slug,
        type: p.type,
        department: p.department,
        search_type: p.search_type,
        location: p.location,
        city: p.city,
        area_sqft: p.area,
        price_inr: formatPriceINR(p.price),
        amenities: p.amenities.join(", "),
      };
      if ((p.department || "").toLowerCase() !== "commercial" && String(p.type || "").toLowerCase() !== "commercial") {
        result.bedrooms = p.bedrooms;
      }
      if (isProximitySearch && p.distance !== undefined && p.distance <= 200) {
        result.distance = `${p.distance.toFixed(1)} km away`;
      }
      return result;
    });

    return JSON.stringify(results);
  },
  {
    name: "search_properties",
    description: "Search for properties in Tamil Nadu based on filters like city, type, price, area, and amenities.",
    schema: z.object({
      city: z.string().optional().describe("City name to filter by (e.g., Coimbatore, Chennai)"),
      type: z.string().optional().describe("Property type (e.g., House, Apartment, Commercial, Villa, Plot)"),
      department: z.enum(["residential", "commercial"]).optional().describe("Property department category"),
      search_type: z.enum(["buy", "rent"]).optional().describe("Whether user wants buy or rent listings"),
      minPrice: z.number().optional().describe("Minimum price in Rupees"),
      maxPrice: z.number().optional().describe("Maximum price in Rupees"),
      bedrooms: z.number().optional().describe("Number of bedrooms (residential only)"),
      maxDistance: z.number().optional().describe("Maximum distance in km for nearby properties."),
      amenities: z.array(z.string()).optional().describe("List of amenities to filter by"),
      minArea: z.number().optional().describe("Minimum area in sqft"),
      maxArea: z.number().optional().describe("Maximum area in sqft"),
      nearLat: z.number().optional().describe("Latitude for nearest property search"),
      nearLon: z.number().optional().describe("Longitude for nearest property search"),
      nearPlace: z.string().optional().describe("Place name for proximity search"),
      userLocation: z.string().optional().describe("User current location"),
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
      "Query the RealEstates document for general real estate knowledge, guidelines, policies, or specific information not found in the property database.",
    schema: z.object({
      query: z.string().describe("The search query for the document knowledge base."),
    }),
  }
);
