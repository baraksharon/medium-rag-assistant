import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const CHUNK_SIZE = 512;
const OVERLAP_RATIO = 0.2;
const TOP_K = 7;

const SYSTEM_PROMPT = `You are a Medium-article assistant that answers questions strictly and only based on the Medium articles dataset context provided to you (metadata and article passages). You must not use any external knowledge, the open internet, or information that is not explicitly contained in the retrieved context. If the answer cannot be determined from the provided context, respond: "I don't know based on the provided Medium articles data."
Always explain your answer using the given context, quoting or paraphrasing the relevant article passage or metadata when helpful.`;

let openaiClient = null;
let pineconeClient = null;

function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }
  return openaiClient;
}

function getPinecone() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pineconeClient;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "question" field' });
  }

  try {
    const openai = getOpenAI();

    // 1. Embed the question
    const embeddingRes = await openai.embeddings.create({
      model: '4UHRUIN-text-embedding-3-small',
      input: question,
    });
    const queryVector = embeddingRes.data[0].embedding;

    // 2. Query Pinecone
    const index = getPinecone().index(process.env.PINECONE_INDEX_NAME);
    const queryRes = await index.query({
      vector: queryVector,
      topK: TOP_K,
      includeMetadata: true,
    });

    // 3. Build context array
    const seen = new Set();
    const contextChunks = [];
    for (const match of queryRes.matches) {
      const meta = match.metadata || {};
      contextChunks.push({
        article_id: String(meta.article_id ?? ''),
        title: String(meta.title ?? ''),
        authors: String(meta.authors ?? ''),
        chunk: String(meta.chunk ?? ''),
        score: match.score,
      });
      seen.add(meta.article_id);
    }

    // 4. Build augmented user prompt
    const contextText = contextChunks
      .map((c, i) => {
        const authorLine = c.authors ? `Authors: ${c.authors}\n` : '';
        return `[Article ${i + 1}]\nTitle: ${c.title}\nID: ${c.article_id}\n${authorLine}\n${c.chunk}`;
      })
      .join('\n\n---\n\n');

    const userPrompt = `Context from Medium articles:\n\n${contextText}\n\n---\n\nQuestion: ${question}`;

    // 5. Generate answer
    const chatRes = await openai.chat.completions.create({
      model: '4UHRUIN-gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const answer = chatRes.choices[0].message.content;

    res.status(200).json({
      response: answer,
      context: contextChunks,
      Augmented_prompt: {
        System: SYSTEM_PROMPT,
        User: userPrompt,
      },
    });
  } catch (err) {
    console.error('Error in /api/prompt:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
