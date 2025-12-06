// app/chat/route.ts
import { HfInference } from "@huggingface/inference";
import { DataAPIClient } from "@datastax/astra-db-ts";
import Groq from "groq-sdk";
import "dotenv/config";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  HF_TOKEN,
  GROQ_API_KEY,
} = process.env;

if (
  !ASTRA_DB_NAMESPACE ||
  !ASTRA_DB_COLLECTION ||
  !ASTRA_DB_API_ENDPOINT ||
  !ASTRA_DB_APPLICATION_TOKEN ||
  !HF_TOKEN ||
  !GROQ_API_KEY
) {
  throw new Error("❌ Missing required environment variables");
}

// ✅ Clients
const hf = new HfInference(HF_TOKEN);
const groq = new Groq({ apiKey: GROQ_API_KEY });

// ✅ Models
const HF_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"; // ✅ FAST + SMART

// ✅ AstraDB
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages?.[messages.length - 1]?.content;

    if (!latestMessage) {
      return new Response("No message provided", { status: 400 });
    }

    // ✅ 1️⃣ Embedding
    const embeddingRaw = await hf.featureExtraction({
      model: HF_EMBED_MODEL,
      inputs: latestMessage,
    });

    const embedding = Array.isArray(embeddingRaw[0])
      ? embeddingRaw[0]
      : embeddingRaw;

    // ✅ 2️⃣ Astra Vector Search
    let docContext = "";
    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const cursor = collection.find(null, {
        sort: { $vector: embedding } as any,
        limit: 5,
      });

      const documents = await cursor.toArray();
      docContext =
        documents.length > 0
          ? documents.map((d) => d.text).join("\n\n")
          : "No relevant content found.";
    } catch (dbErr) {
      console.error("AstraDB error:", dbErr);
      docContext = "Database lookup failed.";
    }

    // ✅ 3️⃣ Build Smart Prompt
    const prompt = `
You are an expert AI assistant for:
- Sellangle
- Paysofter
- Softglobal

ONLY use the context below to answer accurately.
If the context is weak, reason carefully and be honest.

CONTEXT:
${docContext}

USER QUESTION:
${latestMessage}

Return a clean, professional, well-structured answer in markdown.
`;

    // ✅ 4️⃣ GROQ Reasoning (FAST + SMART)
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content;

    return new Response(answer || "No answer generated.", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err: any) {
    console.error("API Route Error:", err?.message || err);
    return new Response("Internal server error", { status: 500 });
  }
}
