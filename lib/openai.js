const OpenAI = require('openai');

let client = null;

function getOpenAIClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }
  return client;
}

module.exports = { getOpenAIClient };
