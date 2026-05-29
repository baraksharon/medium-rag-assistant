# Medium Article RAG Assistant

An AI assistant that answers questions strictly from a dataset of ~7,600 English-language Medium articles using a **Retrieval-Augmented Generation (RAG)** pipeline.

Live: **https://medium-rag-assistant-flax.vercel.app**  
GitHub: **https://github.com/baraksharon/medium-rag-assistant**

---

## Project Overview

The system embeds Medium article chunks into a Pinecone vector index. At query time it embeds the user's question, retrieves the top-k most similar chunks, and passes them as grounded context to a GPT model that generates an answer. The model is constrained by the system prompt to answer only from the retrieved context.

---

## System Architecture

```
medium-english-50mb.csv
        │
        ▼
  Chunking (512-token chunks, 20% overlap)
        │
        ▼
  Embeddings  ←  4UHRUIN-text-embedding-3-small (dim 1536)
        │
        ▼
  Pinecone Vector Index  (32,211 vectors)
        │
     [Query]
        │
  Embed question  →  Pinecone top-k retrieval
        │
        ▼
  Augmented prompt (system + retrieved chunks + question)
        │
        ▼
  4UHRUIN-gpt-5-mini  →  Grounded answer
```

---

## Hyperparameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `chunk_size` | 512 tokens (~2048 chars) | Captures a full argument or paragraph without exceeding context limits |
| `overlap_ratio` | 0.2 (20%) | Preserves context at chunk boundaries without excessive duplication |
| `top_k` | 7 | Retrieves enough diverse passages while keeping the prompt concise |

---

## Models

| Role | Model |
|------|-------|
| Embedding | `4UHRUIN-text-embedding-3-small` (1536 dimensions) |
| Generation | `4UHRUIN-gpt-5-mini` |
| API platform | LLMod.ai (OpenAI-compatible) |

---

## Pinecone Configuration

| Setting | Value |
|---------|-------|
| Index name | `medium-articles` |
| Dimensions | 1536 |
| Metric | cosine |
| Cloud | AWS us-east-1 (serverless) |
| Total vectors | 32,211 |

---

## API Reference

### `POST /api/prompt`

Query the RAG system with a natural-language question.

**Request**
```json
{
  "question": "Your natural language question here"
}
```

**Response**
```json
{
  "response": "Final natural language answer from the model.",
  "context": [
    {
      "article_id": "1234",
      "title": "Sample article title",
      "authors": "['Author Name']",
      "chunk": "article chunk retrieved",
      "score": 0.1234
    }
  ],
  "Augmented_prompt": {
    "System": "the system prompt used to query the chat model",
    "User": "the user prompt used to query the chat model"
  }
}
```

---

### `GET /api/stats`

Returns the current RAG hyperparameter configuration.

**Response**
```json
{
  "chunk_size": 512,
  "overlap_ratio": 0.2,
  "top_k": 7
}
```

---

## System Prompt

The following required system prompt is sent with every generation request:

> You are a Medium-article assistant that answers questions strictly and only based on the Medium articles dataset context provided to you (metadata and article passages). You must not use any external knowledge, the open internet, or information that is not explicitly contained in the retrieved context. If the answer cannot be determined from the provided context, respond: "I don't know based on the provided Medium articles data."
> Always explain your answer using the given context, quoting or paraphrasing the relevant article passage or metadata when helpful.

---

## Example Query and Response

**Request**
```bash
curl -X POST https://medium-rag-assistant-flax.vercel.app/api/prompt \
  -H "Content-Type: application/json" \
  -d '{"question": "Find an article that reframes marketing as a conversation with readers, aimed at writers who find self-promotion uncomfortable. Provide the title and author."}'
```

**Response**
```json
{
  "response": "Title: \"A Marketing Guide for Introverts\"\nAuthor: Shaunta Grimes\n\n\"Marketing is just a conversation between you and your readers. If you can remember that, then you can manage your fear about it.\"",
  "context": [
    {
      "article_id": "37",
      "title": "A Marketing Guide for Introverts",
      "authors": "['Shaunta Grimes']",
      "chunk": "Marketing is just a conversation between you and your readers...",
      "score": 0.6259
    }
  ],
  "Augmented_prompt": {
    "System": "You are a Medium-article assistant...",
    "User": "Context from Medium articles:\n\n[Article 1]\nTitle: A Marketing Guide for Introverts\n..."
  }
}
```

---

## Retrieval Quality Validation

The system was tested against all four assignment question types:

| Type | Example Question | Result |
|------|-----------------|--------|
| **Precise fact retrieval** | "Find an article that reframes marketing as a conversation..." | ✅ Correct article + author |
| **Multi-result topic listing** | "List exactly 3 articles about education." | ✅ 3 distinct, valid articles |
| **Key idea summary** | "Find an article about pandemics spurring innovation..." | ✅ Grounded summary, no hallucination |
| **Recommendation with evidence** | "Recommend a beginner-friendly habits article..." | ✅ Article chosen with direct quotes |

Additional tests confirmed the system correctly handles:
- Niche topics (quantum computing)
- Cross-article comparison questions
- "I don't know" responses for topics not in the dataset

---

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables (copy and fill in)
cp .env.local.example .env.local

# Run development server
npm run dev

# Create Pinecone index (first time only)
node scripts/create-index.js

# Ingest dataset
node scripts/ingest.js

# Resume interrupted ingestion from checkpoint
node scripts/ingest.js

# Re-ingest from scratch
node scripts/ingest.js --force
```

---

## Dataset

- **Source:** Medium Articles (public dataset)
- **File:** `medium-english-50mb.csv` (~50 MB, ~7,600 English articles)
- **Schema:** `title, text, url, authors, timestamp, tags`
- **Chunks indexed:** 32,211
