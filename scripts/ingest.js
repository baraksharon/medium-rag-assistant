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

const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT) : null;
const CHECKPOINT_FILE = path.join(__dirname, '.ingest-checkpoint');

function sanitize(text) {
  // Remove lone surrogate characters which are invalid UTF-8
  return text.replace(/[\uD800-\uDFFF]/g, '');
}

function chunkText(text) {
  if (!text || text.trim().length === 0) return [];
  text = sanitize(text);
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

function saveCheckpoint(chunkIndex) {
  fs.writeFileSync(CHECKPOINT_FILE, String(chunkIndex));
}

function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    return parseInt(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
  }
  return 0;
}

async function embedBatch(openai, texts) {
  const res = await openai.embeddings.create({
    model: '4UHRUIN-text-embedding-3-small',
    input: texts,
  });
  return res.data.map(d => d.embedding);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

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

  const resumeFrom = force ? 0 : loadCheckpoint();
  const stats = await index.describeIndexStats();
  if (stats.totalRecordCount > 0) {
    console.log(`Index already has ${stats.totalRecordCount} vectors.`);
    if (!force && resumeFrom === 0) {
      console.log('Pass --force to re-ingest. Exiting.');
      return;
    }
    if (resumeFrom > 0) {
      console.log(`Checkpoint found — resuming from chunk ${resumeFrom}.`);
    } else {
      console.log('--force flag set, starting from scratch...');
    }
  }

  // Build all chunks
  const allChunks = [];
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

  const startFrom = resumeFrom;

  const vectors = [];
  let done = startFrom;

  for (let i = startFrom; i < allChunks.length; i += EMBED_BATCH) {
    const batch = allChunks.slice(i, i + EMBED_BATCH);
    const texts = batch.map(c => c.text);

    let embeddings;
    try {
      embeddings = await embedBatch(openai, texts);
    } catch (err) {
      console.error(`\nEmbedding error at batch ${i}: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000));
      try {
        embeddings = await embedBatch(openai, texts);
      } catch (err2) {
        // Skip this batch and save checkpoint so we can resume after it
        console.error(`Skipping batch ${i} after second failure: ${err2.message}`);
        saveCheckpoint(i + EMBED_BATCH);
        done += batch.length;
        continue;
      }
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

    if (vectors.length >= UPSERT_BATCH) {
      const toUpsert = vectors.splice(0, UPSERT_BATCH);
      await index.upsert({ records: toUpsert });
      saveCheckpoint(i + EMBED_BATCH);
    }
  }

  // Upsert remaining
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
    await index.upsert({ records: vectors.slice(i, i + UPSERT_BATCH) });
  }

  // Clear checkpoint on success
  if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);

  console.log('\nIngestion complete!');
  const finalStats = await index.describeIndexStats();
  console.log(`Total vectors in index: ${finalStats.totalRecordCount}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
