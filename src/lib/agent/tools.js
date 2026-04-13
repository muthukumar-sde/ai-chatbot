import fs from "fs";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { calculateDistance } from "./utils.js";
import { geocodePlace } from "@/lib/agent/geocode";
import { queryDocument } from "./rag.js";
import { PROPERTIES_PATH } from "./config.js";

// Load property data
const properties = JSON.parse(fs.readFileSync(PROPERTIES_PATH, "utf-8"));

export const searchProperties = tool(
  async (input, config) => {

    // ✅ Clone input (mutable)
    let params = { ...input };

    // ✅ Get user location from config
    const userLocation = config?.configurable?.userLocation;

    console.log("mklogs BEFORE:", params);

    /* =========================================================
       LOCATION PRIORITY LOGIC
       - If city → remove nearLat/nearLon
       - Else → use user location
    ========================================================= */
    if (params.city) {
      delete params.nearLat;
      delete params.nearLon;
      delete params.nearPlace;
    } else {
      if ((!params.nearLat || !params.nearLon) && userLocation) {
        params.nearLat = userLocation.lat;
        params.nearLon = userLocation.lon;
        params.nearPlace = userLocation.city;
      }
    }

    console.log("mklogs AFTER:", params);

    /* =========================================================
       EXTRACT PARAMS
    ========================================================= */
    const {
      city,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      amenities,
      minArea,
      maxArea,
      nearLat,
      nearLon,
      nearPlace,
      maxDistance
    } = params;

    let filtered = properties;
    let resolvedLat = nearLat;
    let resolvedLon = nearLon;
    const distanceLimit = maxDistance || null;


    // Only geocode for nearPlace (nearby/proximity searches)
    if (nearPlace && (!resolvedLat || !resolvedLon)) {
      const coords = await geocodePlace(nearPlace);
      if (coords) {
        resolvedLat = coords.lat;
        resolvedLon = coords.lon;
        console.log(`📍 Geocoded "${nearPlace}" → ${resolvedLat}, ${resolvedLon}`);
      }
    }

    if (city) {
      const lowerCity = city.toLowerCase();
      filtered = filtered.filter((p) =>
        p.city.toLowerCase() === lowerCity ||
        p.location.toLowerCase().includes(lowerCity)
      );
    }

    if (type) {
      const lowerType = type.toLowerCase();
      filtered = filtered.filter((p) =>
        p.type.toLowerCase() === lowerType
      );
    }

    if (bedrooms !== undefined) {
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
    console.log(`mklogs filtered down to ${filtered.length} properties after applying all filters.`);
    const results = filtered.slice(0, 5).map((p) => {
      const result = {
        name: p.propertyName,
        slug: p.slug,
        type: p.type,
        location: p.location,
        city: p.city,
        bedrooms: p.bedrooms,
        "area (sqft)": p.area,
        "price (₹)": p.price,
        amenities: p.amenities.join(", ")
      };
      if (isProximitySearch && p.distance !== undefined) {
        result["distance"] = `${p.distance.toFixed(1)} km away`;
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
      minPrice: z.number().optional().describe("Minimum price in Rupees"),
      maxPrice: z.number().optional().describe("Maximum price in Rupees"),
      bedrooms: z.number().optional().describe("Minimum number of bedrooms"),
      maxDistance: z.number().optional().describe("Maximum distance in km for nearby properties (e.g., 3 for 3km radius). Only applied if user specifies."),
      amenities: z.array(z.string()).optional().describe("List of amenities to filter by (e.g., Swimming Pool, Gym, Garden)"),
      minArea: z.number().optional().describe("Minimum area in sqft"),
      maxArea: z.number().optional().describe("Maximum area in sqft"),
      nearLat: z.number().optional().describe("Latitude for nearest property search"),
      nearLon: z.number().optional().describe("Longitude for nearest property search"),
      nearPlace: z.string().optional().describe("Place name for proximity search, e.g. 'RS Puram'. Will be geocoded automatically."),
      userLocation: z.string().optional().describe("user's current location"),
    }),
  }
);

export const queryKnowledgeBase = tool(
  async ({ query }) => {
    return await queryDocument(query);
  },
  {
    name: "query_knowledge_base",
    description: "Query the RealEstates document for general real estate knowledge, guidelines, policies, or specific information not found in the property database.",
    schema: z.object({
      query: z.string().describe("The search query for the document knowledge base."),
    }),
  }
);