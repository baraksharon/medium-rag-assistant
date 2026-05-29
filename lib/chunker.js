// Approximate: 1 token ≈ 4 chars for English text
function chunkText(text, chunkSize = 512, overlapRatio = 0.2) {
  if (!text || text.trim().length === 0) return [];

  const chunkChars = chunkSize * 4;
  const overlapChars = Math.floor(chunkChars * overlapRatio);
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

module.exports = { chunkText };
