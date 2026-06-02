const STATS = { chunk_size: 512, overlap_ratio: 0.2, top_k: 7 };

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RAG Stats — Medium Article Assistant</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f4f8; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 40px 48px; max-width: 520px; width: 100%; }
    .badge { display: inline-block; background: #e8f4ff; color: #0070f3; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; letter-spacing: .5px; text-transform: uppercase; }
    h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 6px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
    .params { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
    .param { display: flex; align-items: center; justify-content: space-between; background: #f8f9fb; border-radius: 10px; padding: 16px 20px; }
    .param-left { display: flex; align-items: center; gap: 14px; }
    .icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 17px; }
    .icon-blue { background: #e8f4ff; }
    .icon-purple { background: #f0eaff; }
    .icon-green { background: #e6faf0; }
    .param-name { font-size: 14px; font-weight: 600; color: #333; }
    .param-desc { font-size: 12px; color: #888; margin-top: 2px; }
    .param-value { font-size: 22px; font-weight: 700; color: #0070f3; }
    .divider { border: none; border-top: 1px solid #eee; margin-bottom: 24px; }
    .json-block { background: #1e1e2e; border-radius: 10px; padding: 18px 20px; }
    .json-label { font-size: 11px; font-weight: 600; color: #888; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 10px; }
    pre { font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: 13px; color: #cdd6f4; line-height: 1.6; }
    .k { color: #89b4fa; }
    .v { color: #a6e3a1; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #aaa; }
    .footer a { color: #0070f3; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">RAG Configuration</div>
    <h1>Medium Article RAG Assistant</h1>
    <p class="subtitle">Current hyperparameter settings for the retrieval pipeline</p>

    <div class="params">
      <div class="param">
        <div class="param-left">
          <div class="icon icon-blue">✂️</div>
          <div>
            <div class="param-name">chunk_size</div>
            <div class="param-desc">Tokens per text chunk (~2,048 chars)</div>
          </div>
        </div>
        <div class="param-value">512</div>
      </div>
      <div class="param">
        <div class="param-left">
          <div class="icon icon-purple">🔗</div>
          <div>
            <div class="param-name">overlap_ratio</div>
            <div class="param-desc">20% overlap between consecutive chunks</div>
          </div>
        </div>
        <div class="param-value">0.2</div>
      </div>
      <div class="param">
        <div class="param-left">
          <div class="icon icon-green">🎯</div>
          <div>
            <div class="param-name">top_k</div>
            <div class="param-desc">Chunks retrieved per query</div>
          </div>
        </div>
        <div class="param-value">7</div>
      </div>
    </div>

    <hr class="divider" />

    <div class="json-block">
      <div class="json-label">Raw JSON response</div>
      <pre>{
  <span class="k">"chunk_size"</span>:    <span class="v">512</span>,
  <span class="k">"overlap_ratio"</span>: <span class="v">0.2</span>,
  <span class="k">"top_k"</span>:         <span class="v">7</span>
}</pre>
    </div>

    <div class="footer">
      <a href="/">← Back to assistant</a> &nbsp;·&nbsp; 32,211 vectors in Pinecone
    </div>
  </div>
</body>
</html>`;

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const acceptsHtml = (req.headers.accept || '').includes('text/html');
  if (acceptsHtml) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(HTML);
  }

  res.status(200).json(STATS);
}
