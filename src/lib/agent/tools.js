import fs from "fs";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { calculateDistance, geocodeLocation } from "./utils.js";
import { queryDocument } from "./rag.js";
import { PROPERTIES_PATH } from "./config.js";

// Load property data
const properties = JSON.parse(fs.readFileSync(PROPERTIES_PATH, "utf-8"));

export const searchProperties = tool(
  async ({ city, type, minPrice, maxPrice, bedrooms, amenities, minArea, maxArea, nearLat, nearLon, nearPlace, maxDistance }) => {
    let filtered = properties;
    let resolvedLat = nearLat;
    let resolvedLon = nearLon;

    // Only filter by distance if explicitly specified by user
    const distanceLimit = maxDistance || null;

    // Only geocode for nearPlace (nearby/proximity searches)
    if (nearPlace && (!resolvedLat || !resolvedLon)) {
      const coords = await geocodeLocation(nearPlace);
      if (coords) {
        resolvedLat = coords.lat;
        resolvedLon = coords.lon;
        console.log(`📍 Geocoded "${nearPlace}" → ${resolvedLat}, ${resolvedLon}`);
      }
    }
    
    // City search: just match city name, NO geocoding
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
      filtered = filtered.filter((p) => p.bedrooms >= bedrooms);
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

    // Nearest property logic
    if (resolvedLat && resolvedLon) {
      filtered = filtered.map((p) => ({
        ...p,
        distance: calculateDistance(resolvedLat, resolvedLon, p.latitude, p.longitude),
      }));
      
      // Filter by distance if limit is set
      if (distanceLimit) {
        filtered = filtered.filter((p) => p.distance <= distanceLimit);
      }
      
      filtered.sort((a, b) => a.distance - b.distance);
    }

    // Format results for display
    const results = filtered.slice(0, 5).map((p) => {
      const result = {
        name: p.name,
        type: p.type,
        city: p.city,
        bedrooms: p.bedrooms,
        "area (sqft)": p.area,
        "price (₹)": p.price.toLocaleString(),
        amenities: p.amenities.join(", "),
      };
      
      // Only add distance if it exists
      if (p.distance !== undefined) {
        result["Distance"] = `${p.distance.toFixed(1)} km away`;
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
    }),
  }
);

// Define the knowledge base tool
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
