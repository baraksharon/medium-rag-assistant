require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { Pinecone } = require('@pinecone-database/pinecone');

async function main() {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const indexName = process.env.PINECONE_INDEX_NAME;

  const existing = await pinecone.listIndexes();
  const names = (existing.indexes || []).map(i => i.name);

  if (names.includes(indexName)) {
    console.log(`Index "${indexName}" already exists.`);
    return;
  }

  console.log(`Creating index "${indexName}"...`);
  await pinecone.createIndex({
    name: indexName,
    dimension: 1536,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',
      },
    },
  });

  console.log('Index created successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
