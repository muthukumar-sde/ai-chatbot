import fs from "fs";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { calculateDistance } from "./utils.js";
import { geocodePlace } from "@/lib/agent/geocode";
import { queryDocument } from "./rag.js";
import { PROPERTIES_PATH } from "./config.js";

function formatPrice(price) {
  if (!Number.isFinite(price)) return "N/A";

  return `₹ ${new Intl.NumberFormat("en-IN").format(price)}`;
}

// Load property data (BOM-safe)
const rawProperties = fs.readFileSync(PROPERTIES_PATH, "utf-8").replace(/^\uFEFF/, "");
const properties = JSON.parse(rawProperties);

export const searchProperties = tool(
  async (input, config) => {
    let params = { ...input };
    const userLocation = config?.configurable?.userLocation;
    console.log("mklogs search filter", params);
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
      if (lowerType === "residential") {
        filtered = filtered.filter((p) =>
          ["apartment", "house", "villa", "penthouse"].includes(p.type.toLowerCase())
        );
      } else {
        filtered = filtered.filter((p) => p.type.toLowerCase() === lowerType);
      }
    }


    if (search_type) {
      const lowerSearchType = search_type.toLowerCase();
      filtered = filtered.filter((p) => (p.search_type || "").toLowerCase() === lowerSearchType);
    }

    const commercialMode =
      String(type || "").toLowerCase() === "commercial";

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
        price_inr: formatPrice(p.price),
        amenities: p.amenities.join(", "),
        is_over_budget: isOverBudget
      };
      if (String(p.type || "").toLowerCase() !== "commercial") {
        result.bedrooms = p.bedrooms;
      }
      if (isProximitySearch && p.distance !== undefined && p.distance <= 200) {
        result.distance = `${p.distance.toFixed(1)} km away`;
      }
      return result;
    });
    console.log('mklogs results', results)
    return JSON.stringify({
      totalCount: filtered.length,
      showingCount: results.length,
      properties: results
    });
  },
  {
    name: "search_properties",
    description: "Search for properties in Tamil Nadu based on filters like city, type, price, area, and amenities.",
    schema: z.object({
      city: z.string().optional().describe("City name to filter by (e.g., Coimbatore, Chennai)"),
      type: z.string().optional().describe("Property type (e.g., House, Apartment, Commercial, Villa, Plot)"),
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

export const searchNearbyAmenities = tool(
  async (input, config) => {
    let { lat, lon, place, amenityTypes, radius, propertyId, propertyName } = input;
    let propertyDetails = null;
    console.log("mklogs searchNearbyAmenities", input);

    if (propertyId) {
      const matchedProperty = properties.find(p => p.id === propertyId);
      if (matchedProperty) {
        lat = matchedProperty.latitude;
        lon = matchedProperty.longitude;
        propertyDetails = matchedProperty;
      } else {
        return `Could not find property with ID '${propertyId}'.`;
      }
    } else if (propertyName) {
      const lowerName = propertyName.toLowerCase();
      const matchedProperty = properties.find(p => p.propertyName.toLowerCase().includes(lowerName) || (p.slug && p.slug.toLowerCase() === lowerName));
      if (matchedProperty) {
        lat = matchedProperty.latitude;
        lon = matchedProperty.longitude;
        propertyDetails = matchedProperty;
      } else {
        return `Could not find property matching '${propertyName}'. Please ask the user to provide a correct name from the list.`;
      }
    } else if (place && (!lat || !lon)) {
      const coords = await geocodePlace(place);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      } else {
        return "Could not find coordinates for the given place.";
      }
    }

    if (!lat || !lon) {
      return "Latitude and Longitude, or a valid place name, or a propertyName are required.";
    }    radius = radius || 3000; // default 3km

    const types = Array.isArray(amenityTypes) ? amenityTypes : [amenityTypes];
    
    const getQueryTag = (type) => {
      const lower = type.toLowerCase().trim();
      if (lower.includes("school")) return `node["amenity"="school"]`;
      if (lower.includes("hospital")) return `node["amenity"="hospital"]`;
      if (lower.includes("supermarket")) return `node["shop"="supermarket"]`;
      if (lower.includes("park")) return `node["leisure"="park"]`;
      if (lower.includes("railway") || lower.includes("train")) return `node["railway"="station"]`;
      if (lower.includes("bus")) return `node["highway"="bus_stop"]`;
      if (lower.includes("atm")) return `node["amenity"="atm"]`;
      if (lower.includes("restaurant") || lower.includes("food")) return `node["amenity"="restaurant"]`;
      if (lower.includes("mall")) return `node["shop"="mall"]`;
      if (lower.includes("temple")) return `node["amenity"="place_of_worship"]["religion"="hindu"]`;
      return `node["amenity"~"${lower}",i]`;
    };

    const queryParts = types.map(t => {
      const tag = getQueryTag(t);
      return `
        ${tag}(around:${radius},${lat},${lon});
        way${tag.substring(4)}(around:${radius},${lat},${lon});
        rel${tag.substring(4)}(around:${radius},${lat},${lon});
      `;
    }).join('\n');

    const overpassQuery = `[out:json];
    (
      ${queryParts}
    );
    out center;`;

    console.log('mklogs overpassQuery', overpassQuery)
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery
      });
      if (!res.ok) throw new Error("Overpass API error: " + res.status);
      const data = await res.json();

      let amenitiesOutput = "";

      if (data && data.elements && data.elements.length > 0) {
        // Group results by type if multiple types requested
        const grouped = {};
        data.elements.forEach(e => {
          let category = "Misc";
          const tags = e.tags || {};
          if (tags.amenity) category = tags.amenity;
          else if (tags.shop) category = tags.shop;
          else if (tags.leisure) category = tags.leisure;
          else if (tags.highway) category = tags.highway;
          else if (tags.railway) category = tags.railway;

          if (!grouped[category]) grouped[category] = [];
          
          const name = tags.name || "Unknown";
          const elat = e.lat || e.center?.lat;
          const elon = e.lon || e.center?.lon;
          const dist = calculateDistance(lat, lon, elat, elon).toFixed(1);
          grouped[category].push(`${name} (${dist}km away)`);
        });

        const sections = Object.entries(grouped).map(([cat, list]) => {
          const top5 = list.slice(0, 5);
          return `**${cat.charAt(0).toUpperCase() + cat.slice(1)}**:\n- ${top5.join("\n- ")}`;
        });
        amenitiesOutput = sections.join("\n\n");
      } else {
        amenitiesOutput = `No resources matching '${types.join(", ")}' found within ${radius} meters.`;
      }

      if (propertyDetails) {
        return `Property Details:\nName: ${propertyDetails.propertyName}\nLocation: ${propertyDetails.location}, ${propertyDetails.city}\nPrice: ${formatPrice(propertyDetails.price)}\nArea: ${propertyDetails.area} sqft\nType: ${propertyDetails.type}\nAmenities: ${propertyDetails.amenities.join(', ')}\n\nNearby Amenities:\n${amenitiesOutput}`;
      }
      return amenitiesOutput;
    } catch (err) {
      return `Error fetching amenities: ${err.message}`;
    }
  },
  {
    name: "search_nearby_amenities",
    description: "Search for nearby amenities (schools, hospitals, supermarkets, parks, transit, etc.) using OpenStreetMap.",
    schema: z.object({
      lat: z.number().optional().describe("Latitude of the center point"),
      lon: z.number().optional().describe("Longitude of the center point"),
      place: z.string().optional().describe("Name of the place if lat/lon is not available"),
      propertyId: z.string().optional().describe("Unique ID of the property to get details and nearby amenities for"),
      propertyName: z.string().optional().describe("Name of the specific property (for lookup if ID missing)"),
      amenityTypes: z.union([z.string(), z.array(z.string())]).describe("Type(s) of amenity to search for (e.g., school, hospital, supermarket, park, atm, bus stop)"),
      radius: z.number().optional().describe("Search radius in meters (default 3000)")
    })
  }
);
