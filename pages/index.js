import Head from "next/head";
import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Medium Article RAG Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f4f8; color: #1a1a1a; }
        .hero { background: linear-gradient(135deg, #0070f3 0%, #7c3aed 100%); color: #fff; padding: 48px 24px 40px; text-align: center; }
        .hero h1 { font-size: 30px; font-weight: 800; margin-bottom: 10px; letter-spacing: -0.5px; }
        .hero p { font-size: 15px; opacity: .85; max-width: 520px; margin: 0 auto; line-height: 1.6; }
        .hero-chips { display: flex; justify-content: center; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
        .chip { background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3); border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; }
        .main { max-width: 780px; margin: 0 auto; padding: 32px 20px 60px; }
        .card { background: #fff; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,.07); padding: 28px; margin-bottom: 20px; }
        .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #888; margin-bottom: 16px; }
        textarea { width: 100%; padding: 14px 16px; font-size: 15px; font-family: inherit; border: 1.5px solid #e0e0e0; border-radius: 10px; resize: vertical; min-height: 88px; outline: none; transition: border .2s; line-height: 1.5; }
        textarea:focus { border-color: #0070f3; box-shadow: 0 0 0 3px rgba(0,112,243,.1); }
        .ask-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
        .btn { padding: 11px 28px; background: linear-gradient(135deg, #0070f3, #7c3aed); color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity .15s; }
        .btn:disabled { opacity: .45; cursor: not-allowed; }
        .hint { font-size: 12px; color: #aaa; }
        .loading-bar { height: 3px; background: linear-gradient(90deg, #0070f3, #7c3aed, #0070f3); background-size: 200%; animation: slide 1.4s linear infinite; border-radius: 2px; margin-top: 14px; }
        @keyframes slide { 0%{background-position:0%} 100%{background-position:200%} }
        .loading-text { font-size: 13px; color: #888; font-style: italic; margin-top: 8px; }
        .error-box { background: #fff5f5; border: 1px solid #fca5a5; border-radius: 8px; padding: 14px 16px; color: #dc2626; font-size: 14px; margin-top: 16px; }
        .answer-box { background: #f8fbff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 20px; font-size: 15px; line-height: 1.75; white-space: pre-wrap; word-break: break-word; margin-top: 4px; }
        .context-grid { display: flex; flex-direction: column; gap: 10px; }
        .ctx-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; background: #fff; position: relative; overflow: hidden; }
        .ctx-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(135deg, #0070f3, #7c3aed); }
        .ctx-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
        .ctx-title { font-weight: 700; font-size: 14px; color: #1a1a1a; }
        .score-badge { flex-shrink: 0; background: #e8f4ff; color: #0070f3; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 12px; }
        .ctx-meta { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
        .ctx-chunk { font-size: 13px; color: #4b5563; line-height: 1.55; font-style: italic; border-left: none; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .stat-card { background: #f8f9fb; border-radius: 10px; padding: 16px; text-align: center; }
        .stat-value { font-size: 26px; font-weight: 800; color: #0070f3; }
        .stat-label { font-size: 12px; color: #888; font-weight: 600; margin-top: 2px; }
        .endpoints { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .endpoint { background: #f8f9fb; border-radius: 8px; padding: 12px 14px; }
        .endpoint-method { font-size: 11px; font-weight: 700; color: #7c3aed; background: #f3e8ff; padding: 2px 8px; border-radius: 4px; margin-right: 6px; }
        .endpoint-path { font-size: 13px; font-weight: 600; font-family: monospace; color: #333; }
        .endpoint-desc { font-size: 12px; color: #888; margin-top: 4px; }
        @media (max-width: 500px) { .stats-grid { grid-template-columns: 1fr 1fr; } .endpoints { grid-template-columns: 1fr; } .hero h1 { font-size: 22px; } }
      `}</style>

      {/* Hero */}
      <div className="hero">
        <h1>Medium Article RAG Assistant</h1>
        <p>Ask any question — grounded answers from 7,682 Medium articles using Retrieval-Augmented Generation</p>
        <div className="hero-chips">
          <span className="chip">32,211 vectors</span>
          <span className="chip">Pinecone</span>
          <span className="chip">4UHRUIN-gpt-5-mini</span>
          <span className="chip">top-k = 7</span>
        </div>
      </div>

      <div className="main">

        {/* Ask */}
        <div className="card">
          <div className="card-title">Ask a question</div>
          <textarea
            placeholder="e.g. Find an article that reframes marketing as a conversation with readers, aimed at writers who find self-promotion uncomfortable."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAsk(); }}
          />
          <div className="ask-row">
            <button className="btn" onClick={handleAsk} disabled={loading || !question.trim()}>
              {loading ? "Thinking…" : "Ask"}
            </button>
            <span className="hint">Ctrl + Enter to submit</span>
          </div>
          {loading && (
            <>
              <div className="loading-bar" />
              <p className="loading-text">Retrieving from Pinecone and generating answer…</p>
            </>
          )}
          {error && <div className="error-box">⚠ {error}</div>}
        </div>

        {/* Answer */}
        {result && (
          <div className="card">
            <div className="card-title">Answer</div>
            <div className="answer-box">{result.response}</div>
          </div>
        )}

        {/* Context */}
        {result && result.context?.length > 0 && (
          <div className="card">
            <div className="card-title">Retrieved context — {result.context.length} chunks</div>
            <div className="context-grid">
              {result.context.map((c, i) => (
                <div className="ctx-card" key={i}>
                  <div className="ctx-header">
                    <span className="ctx-title">{c.title || "Untitled"}</span>
                    <span className="score-badge">{c.score?.toFixed(4)}</span>
                  </div>
                  <div className="ctx-meta">
                    ID {c.article_id}
                    {c.authors && c.authors !== "[]" && c.authors !== "" &&
                      <> · {c.authors.replace(/[\[\]'"]/g, "")}</>}
                  </div>
                  <div className="ctx-chunk">
                    {c.chunk?.slice(0, 200)}{c.chunk?.length > 200 ? "…" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="card">
          <div className="card-title">RAG configuration &nbsp;<a href="/api/stats" style={{fontSize:11,color:'#0070f3',fontWeight:600,textTransform:'none',letterSpacing:0}}>view /api/stats →</a></div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">512</div>
              <div className="stat-label">chunk_size (tokens)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0.2</div>
              <div className="stat-label">overlap_ratio</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">7</div>
              <div className="stat-label">top_k</div>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="card">
          <div className="card-title">API endpoints</div>
          <div className="endpoints">
            <div className="endpoint">
              <div><span className="endpoint-method">POST</span><span className="endpoint-path">/api/prompt</span></div>
              <div className="endpoint-desc">Query the RAG system with a natural-language question</div>
            </div>
            <div className="endpoint">
              <div><span className="endpoint-method">GET</span><span className="endpoint-path">/api/stats</span></div>
              <div className="endpoint-desc">Returns current hyperparameter configuration</div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
