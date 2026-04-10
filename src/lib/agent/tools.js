import fs from "fs";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { calculateDistance } from "./utils.js";
import { queryDocument } from "./rag.js";
import { PROPERTIES_PATH } from "./config.js";

// Load property data
const properties = JSON.parse(fs.readFileSync(PROPERTIES_PATH, "utf-8"));

export const searchProperties = tool(
  async ({ city, type, minPrice, maxPrice, bedrooms, amenities, minArea, maxArea, nearLat, nearLon }) => {
    let filtered = properties;

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
    if (nearLat && nearLon) {
      filtered = filtered.map((p) => ({
        ...p,
        distance: calculateDistance(nearLat, nearLon, p.latitude, p.longitude),
      }));
      filtered.sort((a, b) => a.distance - b.distance);
    }

    return JSON.stringify(filtered.slice(0, 5));
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
      amenities: z.array(z.string()).optional().describe("List of amenities to filter by (e.g., Swimming Pool, Gym, Garden)"),
      minArea: z.number().optional().describe("Minimum area in sqft"),
      maxArea: z.number().optional().describe("Maximum area in sqft"),
      nearLat: z.number().optional().describe("Latitude for nearest property search"),
      nearLon: z.number().optional().describe("Longitude for nearest property search"),
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
