# Softglobal Brand RAG Assistant

A **Next.js Retrieval-Augmented Generation (RAG) assistant** that answers questions about **Softglobal, Paysofter, and Sellangle** using:

* **Web scraping ETL pipeline**
* **Chunking + embedding**
* **Vector storage in AstraDB**
* **Semantic search**
* **Groq LLM reasoning**

The knowledge base is built automatically by scraping websites and transforming them into vector embeddings stored in **AstraDB**.

---

# Architecture Overview

```
Web Pages
   │
   ▼
Puppeteer Web Scraper
   │
   ▼
Text Cleaning
   │
   ▼
Chunking (LangChain Splitter)
   │
   ▼
Embeddings (HuggingFace)
   │
   ▼
Vector Storage (AstraDB)
   │
   ▼
Vector Search
   │
   ▼
Groq LLM
   │
   ▼
Answer Generation
```

---

# Key Features

* **Automated ETL scraping pipeline**
* **Dynamic page scraping using Puppeteer**
* **Text chunking for vector retrieval**
* **HuggingFace embeddings**
* **AstraDB vector storage**
* **Semantic search retrieval**
* **Groq Llama model for reasoning**
* **Simple Next.js chat UI**

---

# Project Structure

```
llm-nextjs
│
├── app/
│   ├── page.tsx          # Chat UI
│   └── chat/route.ts     # RAG API endpoint
│
├── scripts/
│   └── loadDb.ts         # ETL scraping + embedding pipeline
│
├── package.json
├── next.config.ts
└── README.md
```

---

# Step 1 — Install Dependencies

```bash
npm install
```

Required packages include:

```
langchain
puppeteer
@datastax/astra-db-ts
@huggingface/inference
groq-sdk
dotenv
ts-node
```

---

# Step 2 — Configure Environment Variables

Create a `.env` file in the root directory.

```
ASTRA_DB_NAMESPACE=
ASTRA_DB_COLLECTION=
ASTRA_DB_API_ENDPOINT=
ASTRA_DB_APPLICATION_TOKEN=

HF_TOKEN=
GROQ_API_KEY=
```

These credentials enable:

* **AstraDB vector storage**
* **HuggingFace embedding model**
* **Groq LLM inference**

---

# Step 3 — Run the ETL Web Scraping Pipeline

The entire knowledge base is created using:

```
npm run seed
```

This runs:

```
scripts/loadDb.ts
```

The script performs a **complete ETL pipeline**.

---

# ETL Pipeline Explained

## 1. Extract (Web Scraping)

Web pages are scraped using:

```
PuppeteerWebBaseLoader
```

Example sources:

```
https://softglobal.org/
https://softglobal.org/meet-jb
https://paysofter.com/
https://sellangle.com/
```

Puppeteer loads each page in **headless browser mode** to capture **fully rendered content**, including JavaScript-generated text.

HTML is then cleaned:

```
content.replace(/<[^>]*>?/gm, "")
```

This removes HTML tags, leaving only readable text.

---

## 2. Transform (Chunking)

Long documents are split into smaller chunks using:

```
RecursiveCharacterTextSplitter
```

Configuration:

```
chunkSize = 512
chunkOverlap = 100
```

Example transformation:

```
Large webpage
   ↓
Chunk 1 (512 chars)
Chunk 2 (512 chars)
Chunk 3 (512 chars)
```

Chunking improves **semantic search accuracy**.

---

## 3. Transform (Embedding)

Each chunk is converted into a **vector embedding** using HuggingFace:

```
sentence-transformers/all-MiniLM-L6-v2
```

Example embedding call:

```
hf.featureExtraction({
  model: HF_EMBED_MODEL,
  inputs: chunk
})
```

This produces a **384-dimension vector**.

---

## 4. Load (Vector Storage in AstraDB)

Vectors are stored in **AstraDB vector database**.

The seeding process performs a **full reset**:

```
DROP collection
CREATE fresh vector collection
INSERT vectors
```

Collection configuration:

```
dimension: 384
metric: cosine
```

Each record contains:

```
{
  $vector: embedding,
  text: chunk
}
```

---

# Vector Database Reset Behavior

Every `npm run seed` does:

1️⃣ Delete old collection
2️⃣ Create a fresh vector collection
3️⃣ Scrape websites
4️⃣ Generate embeddings
5️⃣ Insert vectors

Output example:

```
Deleting existing collection...
Creating fresh vector collection...
Scraping: https://softglobal.org/
Scraping: https://paysofter.com/
Scraping: https://sellangle.com/

FULL DB RESET & RESEED COMPLETE
```

---

# Step 4 — Run the Application

Start the development server:

```
npm run dev
```

Open:

```
http://localhost:3000
```

---

# How Question Answering Works

When a user asks a question:

### 1️⃣ User Query Embedding

The query is embedded using the same HuggingFace model.

---

### 2️⃣ Vector Search

AstraDB finds the **most similar text chunks**.

```
collection.find({
   sort: { $vector: embedding },
   limit: 5
})
```

---

### 3️⃣ Context Construction

The retrieved chunks are merged into a **context block**.

```
CONTEXT:
chunk1
chunk2
chunk3
```

---

### 4️⃣ LLM Reasoning

The context is passed to **Groq Llama 4**.

```
meta-llama/llama-4-scout-17b-16e-instruct
```

Groq provides **fast inference for structured answers**.

---

### 5️⃣ Response

The LLM generates a structured answer for the user.

---

# Example Query

```
What is Paysofter?
```

Process:

```
Query
↓
Embedding
↓
Vector search
↓
Retrieve relevant chunks
↓
Groq reasoning
↓
Answer
```

---

# Technology Stack

| Layer     | Technology  |
| --------- | ----------- |
| Frontend  | Next.js     |
| Scraping  | Puppeteer   |
| Chunking  | LangChain   |
| Embedding | HuggingFace |
| Vector DB | AstraDB     |
| LLM       | Groq        |
| Language  | TypeScript  |

---

# Useful Commands

Run development server

```
npm run dev
```

Rebuild vector knowledge base

```
npm run seed
```

Build production

```
npm run build
```

---

# Why This Pipeline Matters

This project demonstrates a **full RAG architecture** including:

* automated **web scraping ETL**
* **document chunking**
* **vector embedding**
* **vector database indexing**
* **semantic search retrieval**
* **LLM reasoning**

This is a **production-style AI knowledge retrieval system**.

---
