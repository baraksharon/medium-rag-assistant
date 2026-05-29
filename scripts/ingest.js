require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

// RAG hyperparameters
const CHUNK_SIZE = 512;      // tokens (approx 4 chars/token)
const OVERLAP_RATIO = 0.2;
const EMBED_BATCH = 50;      // embeddings per API call
const UPSERT_BATCH = 100;    // vectors per Pinecone upsert

// Set LIMIT env var to test with fewer articles, e.g. LIMIT=100 node scripts/ingest.js
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT) : null;

function chunkText(text) {
  if (!text || text.trim().length === 0) return [];
  const chunkChars = CHUNK_SIZE * 4;
  const overlapChars = Math.floor(chunkChars * OVERLAP_RATIO);
  const stepChars = chunkChars - overlapChars;
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkChars, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end >= text.length) break;
    start += stepChars;
  }
  return chunks;
}

async function embedBatch(openai, texts) {
  const res = await openai.embeddings.create({
    model: '4UHRUIN-text-embedding-3-small',
    input: texts,
  });
  return res.data.map(d => d.embedding);
}

async function main() {
  const csvPath = path.join(__dirname, '../../medium-english-50mb.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at: ${csvPath}`);
    process.exit(1);
  }

  console.log('Reading CSV...');
  const raw = fs.readFileSync(csvPath, 'utf8');
  let records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  if (LIMIT) {
    records = records.slice(0, LIMIT);
    console.log(`Limited to ${LIMIT} articles for testing.`);
  }
  console.log(`Total articles: ${records.length}`);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

  // Check if already ingested
  const stats = await index.describeIndexStats();
  if (stats.totalRecordCount > 0) {
    console.log(`Index already has ${stats.totalRecordCount} vectors.`);
    const args = process.argv.slice(2);
    if (!args.includes('--force')) {
      console.log('Pass --force to re-ingest. Exiting.');
      return;
    }
    console.log('--force flag set, continuing...');
  }

  // Build all chunks first
  const allChunks = []; // { id, text, metadata }
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const text = row.text || '';
    const title = (row.title || '').trim();
    const articleId = String(i);

    const chunks = chunkText(text);
    for (let j = 0; j < chunks.length; j++) {
      allChunks.push({
        id: `article_${i}_chunk_${j}`,
        text: chunks[j],
        metadata: {
          article_id: articleId,
          title: title,
          chunk: chunks[j],
          authors: row.authors || '',
          url: row.url || '',
          tags: row.tags || '',
        },
      });
    }
  }
  console.log(`Total chunks to embed: ${allChunks.length}`);

  // Embed in batches and upsert to Pinecone
  const vectors = [];
  let done = 0;

  for (let i = 0; i < allChunks.length; i += EMBED_BATCH) {
    const batch = allChunks.slice(i, i + EMBED_BATCH);
    const texts = batch.map(c => c.text);

    let embeddings;
    try {
      embeddings = await embedBatch(openai, texts);
    } catch (err) {
      console.error(`Embedding error at batch ${i}: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000));
      embeddings = await embedBatch(openai, texts);
    }

    for (let j = 0; j < batch.length; j++) {
      vectors.push({
        id: batch[j].id,
        values: embeddings[j],
        metadata: batch[j].metadata,
      });
    }

    done += batch.length;
    if (done % 500 === 0 || done === allChunks.length) {
      process.stdout.write(`\rEmbedded: ${done}/${allChunks.length}`);
    }

    // Upsert when we have enough vectors
    if (vectors.length >= UPSERT_BATCH) {
      const toUpsert = vectors.splice(0, UPSERT_BATCH);
      await index.upsert({ records: toUpsert });
    }
  }

  // Upsert remaining
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
    await index.upsert({ records: vectors.slice(i, i + UPSERT_BATCH) });
  }

  console.log('\nIngestion complete!');
  const finalStats = await index.describeIndexStats();
  console.log(`Total vectors in index: ${finalStats.totalRecordCount}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
