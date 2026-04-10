import fs from "fs";
import pdfParse from "pdf-parse";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { PDF_PATH } from "./config.js";

// ---------------------------------------------------------------------------
// Minimal in-memory vector store (no external server required)
// ---------------------------------------------------------------------------
class SimpleMemoryVectorStore {
  constructor(embeddings) {
    this.embeddings = embeddings;
    this.docs = [];       // { pageContent, metadata }
    this.vectors = [];    // Float32Array per doc
  }

  static async fromDocuments(docs, embeddings) {
    const store = new SimpleMemoryVectorStore(embeddings);
    const texts = docs.map((d) => d.pageContent);
    const vectors = await embeddings.embedDocuments(texts);
    store.docs = docs;
    store.vectors = vectors;
    return store;
  }

  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  async similaritySearch(query, k = 3) {
    const queryVec = await this.embeddings.embedQuery(query);
    const scored = this.vectors.map((vec, i) => ({
      score: this.cosineSimilarity(queryVec, vec),
      doc: this.docs[i],
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map((s) => s.doc);
  }
}

// ---------------------------------------------------------------------------
// Vector store singleton
// ---------------------------------------------------------------------------
let vectorStore = null;

export async function initializeVectorStore() {
  try {
    if (vectorStore) return vectorStore;

    console.log("📄 Checking PDF path:", PDF_PATH);

    if (!fs.existsSync(PDF_PATH)) {
      throw new Error("PDF file not found at path: " + PDF_PATH);
    }

    console.log("📄 Loading PDF...");
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const pdfData = await pdfParse(pdfBuffer);
    
    // Convert pdf-parse output to LangChain Document format
    const rawDocs = pdfData.text
      .split("\n\n")
      .filter((text) => text.trim().length > 0)
      .map((text, i) => new Document({
        pageContent: text,
        metadata: { source: PDF_PATH, page: Math.floor(i / 10) },
      }));
    
    console.log("📄 Raw docs loaded:", rawDocs.length);

    if (!rawDocs.length) {
      throw new Error("No content extracted from PDF");
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.splitDocuments(rawDocs);
    console.log("✂️ Split into chunks:", docs.length);

    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
    });

    vectorStore = await SimpleMemoryVectorStore.fromDocuments(docs, embeddings);
    console.log("✅ In-memory vector store ready");
    return vectorStore;

  } catch (error) {
    console.error("❌ Error initializing vector store:", error.message);
    return null;
  }
}

export async function queryDocument(query) {
  try {
    console.log("🔍 Querying knowledge base:", query);

    const store = await initializeVectorStore();
    if (!store) return "Knowledge base is currently unavailable.";

    const results = await store.similaritySearch(query, 3);
    console.log("📊 Results found:", results.length);

    if (!results.length) {
      return "No relevant information found in the knowledge base.";
    }

    return results
      .map((r, i) => `Result ${i + 1}:\n${r.pageContent}`)
      .join("\n\n---\n\n");

  } catch (error) {
    console.error("❌ Error querying document:", error);
    return "Error retrieving information from knowledge base.";
  }
}