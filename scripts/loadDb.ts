// loadDb.ts
import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { HfInference } from "@huggingface/inference"
import "dotenv/config"

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  HF_TOKEN
} = process.env

if (
  !ASTRA_DB_NAMESPACE ||
  !ASTRA_DB_COLLECTION ||
  !ASTRA_DB_API_ENDPOINT ||
  !ASTRA_DB_APPLICATION_TOKEN ||
  !HF_TOKEN
) {
  throw new Error("❌ Missing required environment variables")
}

// ✅ HuggingFace client
const hf = new HfInference(HF_TOKEN)

// ✅ SAME MODEL YOU USE IN PYTHON
const HF_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

// ✅ URLs to scrape
const f1Data = [
  "https://paysofter.com/",
  "https://paysofter.com/about-paysofter",
  "https://paysofter.com/about-paysofter-promise",
  "https://sellangle.com/",
  "https://sellangle.com/about-sellangle",
  "https://softglobal.org/",
]

// ✅ Astra setup
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

// ✅ Text splitter
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
})

// ✅ Create vector collection (MiniLM = 384 dimensions)
const createCollection = async (similarityMetric: SimilarityMetric = "cosine") => {
  await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 384, // ✅ MiniLM embedding size
      metric: similarityMetric,
    },
  })
}

// ✅ Scraper
const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded" },
  })

  const docs = await loader.load()
  return docs[0].pageContent.replace(/<[^>]*>?/gm, "")
}

// ✅ Vector seeding
const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION)

  for (const url of f1Data) {
    console.log("🔎 Scraping:", url)

    const content = await scrapePage(url)
    const chunks = await splitter.splitText(content)

    for (const chunk of chunks) {
      const embedding = await hf.featureExtraction({
        model: HF_EMBED_MODEL,
        inputs: chunk,
      })

      const vector = Array.isArray(embedding[0])
        ? embedding[0]
        : embedding

      await collection.insertOne({
        $vector: vector,
        text: chunk,
      })
    }
  }
}

// ✅ Safe execution wrapper
const main = async () => {
  await createCollection()
  await loadSampleData()
  console.log("✅ HuggingFace → Astra seeding complete")
}

main().catch(console.error)

// // loadDb.ts
// import { DataAPIClient } from "@datastax/astra-db-ts"
// import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
// import OpenAI from "openai"
// import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
// import "dotenv/config"

// type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

// const {
//   ASTRA_DB_NAMESPACE,
//   ASTRA_DB_COLLECTION,
//   ASTRA_DB_API_ENDPOINT,
//   ASTRA_DB_APPLICATION_TOKEN,
//   OPENAI_API_KEY
// } = process.env

// if (
//   !ASTRA_DB_NAMESPACE ||
//   !ASTRA_DB_COLLECTION ||
//   !ASTRA_DB_API_ENDPOINT ||
//   !ASTRA_DB_APPLICATION_TOKEN ||
//   !OPENAI_API_KEY
// ) {
//   throw new Error("❌ Missing required environment variables")
// }

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// const f1Data = [
//   "https://en.wikipedia.org/wiki/Formula_One",
//   "https://www.skysports.com/f1/news/12433/13117256/lewis-hamilton-says-move-to-ferrari-is-huge-opportunity",
//   "https://www.formula1.com/en/latest/all", 
//   "https://paysofter.com/",
//   "https://paysofter.com/about-paysofter",
//   "https://paysofter.com/about-paysofter-promise",
//   "https://sellangle.com/",
//   "https://sellangle.com/about-sellangle",
// ]

// const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
// const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

// const splitter = new RecursiveCharacterTextSplitter({
//   chunkSize: 512,
//   chunkOverlap: 100
// })

// const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
//   await db.createCollection(ASTRA_DB_COLLECTION, {
//     vector: {
//       dimension: 1536,
//       metric: similarityMetric
//     }
//   })
// }

// const scrapePage = async (url: string) => {
//   const loader = new PuppeteerWebBaseLoader(url, {
//     launchOptions: { headless: true },
//     gotoOptions: { waitUntil: "domcontentloaded" }
//   })

//   const docs = await loader.load()
//   return docs[0].pageContent.replace(/<[^>]*>?/gm, "")
// }

// const loadSampleData = async () => {
//   const collection = await db.collection(ASTRA_DB_COLLECTION)

//   for (const url of f1Data) {
//     const content = await scrapePage(url)
//     const chunks = await splitter.splitText(content)

//     for (const chunk of chunks) {
//       const embedding = await openai.embeddings.create({
//         model: "text-embedding-3-small",
//         input: chunk
//       })

//       const vector = embedding.data[0].embedding

//       await collection.insertOne({
//         $vector: vector,
//         text: chunk
//       })
//     }
//   }
// }

// // await createCollection()
// // await loadSampleData()

// const main = async () => {
//   await createCollection()
//   await loadSampleData()
//   console.log("✅ Database seeded successfully")
// }

// main().catch(console.error)
