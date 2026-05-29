export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    chunk_size: 512,
    overlap_ratio: 0.2,
    top_k: 7,
  });
}
