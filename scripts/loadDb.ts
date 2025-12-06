// scripts/loadDb.ts
import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { HfInference } from "@huggingface/inference"
import "dotenv/config"

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

// ✅ Clients
const hf = new HfInference(HF_TOKEN)
const HF_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

// ✅ URLs to scrape
const urls = [
  "https://paysofter.com/",
  "https://paysofter.com/about-paysofter",
  "https://paysofter.com/about-paysofter-promise",
  "https://sellangle.com/",
  "https://sellangle.com/about-sellangle",
  "https://softglobal.org/",
]

// ✅ Text splitter
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
})


// ✅ FULL RESET (DROP + RECREATE)
const resetCollection = async () => {
  const collections = await db.listCollections()
  const exists = collections.some((c) => c.name === ASTRA_DB_COLLECTION)

  if (exists) {
    console.log("⚠️ Deleting existing collection...")
    await db.dropCollection(ASTRA_DB_COLLECTION)
    console.log("✅ Collection deleted")
  }

  console.log("🚀 Creating fresh vector collection...")
  await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 384,
      metric: "cosine",
    },
  })

  console.log("✅ Fresh collection created")
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
const seedVectors = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION)

  for (const url of urls) {
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

// ✅ Main runner
const main = async () => {
  await resetCollection()   // ✅ FIXED
  await seedVectors()
  console.log("✅ FULL DB RESET & RESEED COMPLETE")
}

main().catch(console.error)

// import { DataAPIClient } from "@datastax/astra-db-ts"
// import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
// import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
// import { HfInference } from "@huggingface/inference"
// import "dotenv/config"

// type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

// const {
//   ASTRA_DB_NAMESPACE,
//   ASTRA_DB_COLLECTION,
//   ASTRA_DB_API_ENDPOINT,
//   ASTRA_DB_APPLICATION_TOKEN,
//   HF_TOKEN
// } = process.env

// if (
//   !ASTRA_DB_NAMESPACE ||
//   !ASTRA_DB_COLLECTION ||
//   !ASTRA_DB_API_ENDPOINT ||
//   !ASTRA_DB_APPLICATION_TOKEN ||
//   !HF_TOKEN
// ) {
//   throw new Error("❌ Missing required environment variables")
// }

// // ✅ HuggingFace client
// const hf = new HfInference(HF_TOKEN)

// // ✅ SAME MODEL YOU USE IN PYTHON
// const HF_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

// // ✅ URLs to scrape
// const f1Data = [
//   "https://paysofter.com/",
//   "https://paysofter.com/about-paysofter",
//   "https://paysofter.com/about-paysofter-promise",
//   "https://sellangle.com/",
//   "https://sellangle.com/about-sellangle",
//   "https://softglobal.org/",
// ]

// // ✅ Astra setup
// const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
// const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

// // ✅ Text splitter
// const splitter = new RecursiveCharacterTextSplitter({
//   chunkSize: 512,
//   chunkOverlap: 100,
// })

// // ✅ Create vector collection (MiniLM = 384 dimensions)
// const createCollection = async (similarityMetric: SimilarityMetric = "cosine") => {
//   await db.createCollection(ASTRA_DB_COLLECTION, {
//     vector: {
//       dimension: 384, // ✅ MiniLM embedding size
//       metric: similarityMetric,
//     },
//   })
// }

// // ✅ Scraper
// const scrapePage = async (url: string) => {
//   const loader = new PuppeteerWebBaseLoader(url, {
//     launchOptions: { headless: true },
//     gotoOptions: { waitUntil: "domcontentloaded" },
//   })

//   const docs = await loader.load()
//   return docs[0].pageContent.replace(/<[^>]*>?/gm, "")
// }

// // ✅ Vector seeding
// const loadSampleData = async () => {
//   const collection = await db.collection(ASTRA_DB_COLLECTION)

//   for (const url of f1Data) {
//     console.log("🔎 Scraping:", url)

//     const content = await scrapePage(url)
//     const chunks = await splitter.splitText(content)

//     for (const chunk of chunks) {
//       const embedding = await hf.featureExtraction({
//         model: HF_EMBED_MODEL,
//         inputs: chunk,
//       })

//       const vector = Array.isArray(embedding[0])
//         ? embedding[0]
//         : embedding

//       await collection.insertOne({
//         $vector: vector,
//         text: chunk,
//       })
//     }
//   }
// }

// // ✅ Safe execution wrapper
// const main = async () => {
//   await createCollection()
//   await loadSampleData()
//   console.log("✅ HuggingFace → Astra seeding complete")
// }

// main().catch(console.error)
