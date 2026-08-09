const INVALID_NAME_TOKENS = new Set([
  "hi", "hello", "hey", "buy", "rent", "any budget", "visit", "tomorrow", "2mro", "yes", "no",
  "my name", "coimbatore", "chennai", "trichy", "salem", "madurai", "vellore", "thanjavur", "tirupur",
  "apartment", "house", "villa", "penthouse", "plot", "flat", "flats", "bhk", "lakhs", "crores",
  "looking", "searching", "interested", "show", "find", "cheapest", "under", "budget", "near"
]);

function normalizeName(value) {
  if (!value || typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 30) return undefined;
  
  // A person's name standalone reply should not be longer than 3 words
  const words = cleaned.split(" ");
  if (words.length > 3) return undefined;

  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(cleaned)) return undefined;

  const lower = cleaned.toLowerCase();
  if (INVALID_NAME_TOKENS.has(lower)) return undefined;

  // Reject if any word in the name is a property/search keyword
  for (const word of words) {
    if (INVALID_NAME_TOKENS.has(word.toLowerCase())) return undefined;
  }

  return cleaned;
}

function extractName(text) {
  const namePatterns = [
    /\bmy name is\s+([a-z][a-z\s.'-]{1,30})/i,
    /\bmy name\s+([a-z][a-z\s.'-]{1,30})/i,
    /\bname is\s+([a-z][a-z\s.'-]{1,30})/i,
    /\bi am\s+([a-z][a-z\s.'-]{1,30})/i,
    /\bi'm\s+([a-z][a-z\s.'-]{1,30})/i,
  ];
  for (const p of namePatterns) {
    const match = text.match(p);
    if (match?.[1]) {
      const cleaned = normalizeName(match[1]);
      if (cleaned && !/\blooking|interested|searching|flat|bhk|house|villa|rent|buy\b/i.test(cleaned)) {
        return cleaned;
      }
    }
  }
  return undefined;
}

export function extractStandaloneNameReply(text) {
  if (/\b(looking|want|search|flat|apartment|house|bhk|rent|buy|lakh|crore|chennai|coimbatore|madurai)\b/i.test(text)) {
    return undefined;
  }
  return normalizeName(text);
}

function extractSearchType(text) {
  if (/\b(rent|rental|lease|vadagai|vadakai|வாடகை)\b/i.test(text)) return "rent";
  if (/\b(buy|purchase|own|vaanga|vanga|வாங்கு)\b/i.test(text)) return "buy";
  return undefined;
}


export function extractProfileFromText(text) {
  if (!text) return {};
  const emailMatch = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  const phoneMatch = text.match(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/);

  return {
    name: extractName(text),
    email: emailMatch?.[0]?.toLowerCase(),
    phone: phoneMatch?.[0]?.replace(/[\s-]/g, ""),
    search_type: extractSearchType(text),
  };
}
