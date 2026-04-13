const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const HEADERS = { "User-Agent": "PropertyAssistant/1.0" };

// Lat/Lon → City name
export async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    const addr = data.address || {};
    console.log(`📍 Reverse geocoded ${lat}, ${lon} →`, addr);
    return (
      addr.state_district ||
      addr.city_district ||
      addr.village ||
      addr.city ||
      addr.town ||
      addr.county ||
      addr.suburb ||
      addr.state ||
      "Unknown"
    );
  } catch (err) {
    console.warn("⚠️ reverseGeocode failed:", err.message);
    return null;
  }
}

// Place name → { lat, lon }
export async function geocodePlace(placeName) {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (err) {
    console.warn("⚠️ geocodePlace failed:", err.message);
    return null;
  }
}