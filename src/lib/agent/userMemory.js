const INVALID_NAME_TOKENS = new Set([
  "hi",
  "hello",
  "hey",
  "buy",
  "rent",
  "residential",
  "commercial",
  "any budget",
  "visit",
  "tomorrow",
  "2mro",
  "yes",
  "no",
  "my name",
  "coimbatore",
  "chennai",
  "trichy",
  "salem",
  "madurai",
  "vellore",
  "thanjavur",
]);

function normalizeName(value) {
  if (!value || typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 40) return undefined;
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(cleaned)) return undefined;
  if (INVALID_NAME_TOKENS.has(cleaned.toLowerCase())) return undefined;
  return cleaned;
}

function extractName(text) {
  const namePatterns = [
    /\bmy name is\s+([a-z][a-z\s.'-]{1,40})/i,
    /\bmy name\s+([a-z][a-z\s.'-]{1,40})/i,
    /\bname is\s+([a-z][a-z\s.'-]{1,40})/i,
    /\bi am\s+([a-z][a-z\s.'-]{1,40})/i,
    /\bi'm\s+([a-z][a-z\s.'-]{1,40})/i,
  ];
  for (const p of namePatterns) {
    const match = text.match(p);
    if (match?.[1]) {
      const cleaned = normalizeName(match[1]);
      if (cleaned && !/\blooking for|interested in|searching\b/i.test(cleaned)) {
        return cleaned;
      }
    }
  }
  return undefined;
}

export function extractStandaloneNameReply(text) {
  return normalizeName(text);
}

function extractSearchType(text) {
  if (/\brent|rental|lease\b/i.test(text)) return "rent";
  if (/\bbuy|purchase|own\b/i.test(text)) return "buy";
  return undefined;
}

function extractDepartment(text) {
  if (/\bcommercial|office|shop|showroom\b/i.test(text)) return "commercial";
  if (/\bresidential|house|apartment|villa|flat|plot\b/i.test(text)) return "residential";
  return undefined;
}

export function extractProfileFromText(text) {
  if (!text) return {};
  const emailMatch = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);

  return {
    name: extractName(text),
    email: emailMatch?.[0]?.toLowerCase(),
    search_type: extractSearchType(text),
    department: extractDepartment(text),
  };
}
