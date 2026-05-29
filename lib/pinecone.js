const { Pinecone } = require('@pinecone-database/pinecone');

let client = null;

function getPineconeClient() {
  if (!client) {
    client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return client;
}

module.exports = { getPineconeClient };
