// Import embeddings
import { OpenAIEmbeddings } from "@langchain/openai";

// Cache storage
const semanticCache = [];

// Cache settings
const MAX_CACHE_SIZE = 150; // max items
const CACHE_TTL = 1000 * 60 * 30; // 30 mins

// Matching thresholds
const STRING_THRESHOLD = 0.9;
const EMBEDDING_THRESHOLD = 0.85;

// Lazy load embeddings (avoid build-time issues)
let embeddings = null;
const getEmbeddings = () => {
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return embeddings;
};

// String similarity (word match)
function stringSimilarity(a, b) {
  const s1 = new Set(a.toLowerCase().split(/\s+/));
  const s2 = new Set(b.toLowerCase().split(/\s+/));

  let match = 0;
  for (const word of s1) {
    if (s2.has(word)) match++;
  }

  const total = s1.size + s2.size - match;
  return total === 0 ? 1 : match / total;
}

// Cosine similarity (vector match)
function cosineSimilarity(a, b) {
  let dot = 0, n1 = 0, n2 = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    n1 += a[i] * a[i];
    n2 += b[i] * b[i];
  }

  return dot / (Math.sqrt(n1) * Math.sqrt(n2) + 1e-10);
}

// Context words to skip cache
const CONTEXT_WORDS = [
  "near", "nearby", "around me", "my area", "current location",
  "same", "previous", "that one", "those",
  "cheaper than", "more expensive than",
  "bigger than", "smaller than"
];

// Check if query depends on context
export function isContextDependent(query) {
  const q = query.toLowerCase();
  return CONTEXT_WORDS.some((w) => q.includes(w));
}

// Remove expired cache items
function cleanCache() {
  const now = Date.now();
  for (let i = semanticCache.length - 1; i >= 0; i--) {
    if (now - semanticCache[i].time > CACHE_TTL) {
      semanticCache.splice(i, 1);
    }
  }
}

// Check cache for response
export async function checkSemanticCache(query) {
  if (!query || semanticCache.length === 0) return null;

  cleanCache(); // remove old data

  // Skip context-based queries
  if (isContextDependent(query)) return null;

  // Exact match check
  for (const item of semanticCache) {
    if (item.query.toLowerCase() === query.toLowerCase()) {
      console.log("🎯 Cache HIT (exact):", query.substring(0, 40));
      return item.response;
    }
  }

  // String similarity check
  for (const item of semanticCache) {
    const score = stringSimilarity(query, item.query);
    if (score >= STRING_THRESHOLD) {
      console.log("🎯 Cache HIT (string):", query.substring(0, 40), "score:", score.toFixed(2));
      return item.response;
    }
  }

  // Embedding similarity check
  try {
    const embedder = getEmbeddings();
    const queryVec = await embedder.embedQuery(query);

    let best = null;
    let bestScore = 0;

    for (const item of semanticCache) {
      if (!item.embedding) continue;

      const score = cosineSimilarity(queryVec, item.embedding);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    if (bestScore >= EMBEDDING_THRESHOLD) {
      console.log("🎯 Cache HIT (embedding):", query.substring(0, 40), "score:", bestScore.toFixed(2));
      return best.response;
    }
  } catch (err) {
    console.error("Embedding error:", err.message);
  }

  console.log("❌ Cache MISS:", query.substring(0, 40));
  return null;
}

// Validate response format
function isValidResponse(res) {
  return res && typeof res === "object" && res.role && res.content;
}

// Add new item to cache
export async function addToSemanticCache(query, response) {
  if (!query || !response) return;

  // Skip invalid response
  if (!isValidResponse(response)) return;

  // Avoid duplicate queries
  const exists = semanticCache.some(
    (c) => stringSimilarity(c.query, query) > 0.92
  );

  if (exists) {
    console.log("⏭️  Skipped duplicate cache entry:", query.substring(0, 40));
    return;
  }

  // Create embedding
  let embedding = null;
  try {
    const embedder = getEmbeddings();
    embedding = await embedder.embedQuery(query);
  } catch (err) {
    console.warn("⚠️ Embedding failed:", err.message);
  }

  // Store in cache
  semanticCache.push({
    query,
    response,
    embedding,
    time: Date.now(),
  });

  console.log("💾 Cached query:", query.substring(0, 40), "| Cache size:", semanticCache.length);

  // Maintain max size
  if (semanticCache.length > MAX_CACHE_SIZE) {
    semanticCache.shift();
  }
}

// Clear all cache
export function clearCache() {
  semanticCache.length = 0;
}

// Get cache size
export function getCacheStats() {
  return {
    size: semanticCache.length,
  };
}