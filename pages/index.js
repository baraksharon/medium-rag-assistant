import Head from "next/head";
import { useState } from "react";

const styles = {
  page: { fontFamily: "'Segoe UI', sans-serif", maxWidth: 800, margin: "0 auto", padding: "32px 20px", color: "#1a1a1a" },
  h1: { fontSize: 26, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: "#555", marginBottom: 32, fontSize: 15 },
  section: { marginBottom: 32 },
  h2: { fontSize: 17, fontWeight: 600, marginBottom: 10, borderBottom: "1px solid #e5e5e5", paddingBottom: 6 },
  textarea: { width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 15, border: "1px solid #ccc", borderRadius: 6, resize: "vertical", minHeight: 80, fontFamily: "inherit", outline: "none" },
  button: { marginTop: 10, padding: "10px 24px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer", fontWeight: 600 },
  buttonDisabled: { marginTop: 10, padding: "10px 24px", background: "#aaa", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "not-allowed", fontWeight: 600 },
  responseBox: { background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 6, padding: 18, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  errorBox: { background: "#fff3f3", border: "1px solid #f5a0a0", borderRadius: 6, padding: 14, color: "#c0392b", fontSize: 14 },
  contextCard: { border: "1px solid #e0e0e0", borderRadius: 6, padding: "12px 14px", marginBottom: 10, background: "#fff", fontSize: 14 },
  contextTitle: { fontWeight: 600, marginBottom: 4, color: "#0070f3" },
  contextMeta: { color: "#888", fontSize: 12, marginBottom: 6 },
  contextChunk: { color: "#444", lineHeight: 1.5, fontStyle: "italic", borderLeft: "3px solid #e0e0e0", paddingLeft: 10 },
  scoreTag: { display: "inline-block", background: "#e8f4ff", color: "#0070f3", borderRadius: 4, padding: "1px 8px", fontSize: 12, marginLeft: 8 },
  loading: { color: "#888", fontStyle: "italic", marginTop: 12 },
  divider: { border: "none", borderTop: "1px solid #e5e5e5", margin: "36px 0" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  infoCard: { background: "#f4f4f4", borderRadius: 6, padding: "10px 14px", fontSize: 13 },
  code: { background: "#f0f0f0", padding: "2px 6px", borderRadius: 3, fontFamily: "monospace", fontSize: 13 },
  pre: { background: "#f4f4f4", padding: 14, borderRadius: 6, overflow: "auto", fontSize: 13, margin: 0 },
};

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

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAsk();
  }

  return (
    <>
      <Head>
        <title>Medium Article RAG Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="AI assistant that answers questions from 7,600 Medium articles using RAG." />
      </Head>
      <div style={styles.page}>
        <h1 style={styles.h1}>Medium Article RAG Assistant</h1>
        <p style={styles.subtitle}>
          Ask any question — the system retrieves relevant passages from ~7,600 Medium articles
          and generates a grounded answer using only the dataset.
        </p>

        {/* ── Chat UI ── */}
        <div style={styles.section}>
          <h2 style={styles.h2}>Ask a Question</h2>
          <textarea
            style={styles.textarea}
            placeholder="e.g. Find an article about machine learning for beginners and summarise it."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              style={loading || !question.trim() ? styles.buttonDisabled : styles.button}
              onClick={handleAsk}
              disabled={loading || !question.trim()}
            >
              {loading ? "Thinking…" : "Ask"}
            </button>
            <span style={{ fontSize: 12, color: "#aaa" }}>Ctrl+Enter to submit</span>
          </div>

          {loading && <p style={styles.loading}>Retrieving from Pinecone and generating answer…</p>}
          {error && <div style={styles.errorBox}>Error: {error}</div>}

          {result && (
            <>
              <div style={{ ...styles.section, marginTop: 24, marginBottom: 0 }}>
                <h2 style={styles.h2}>Answer</h2>
                <div style={styles.responseBox}>{result.response}</div>
              </div>

              {result.context && result.context.length > 0 && (
                <div style={{ ...styles.section, marginTop: 20, marginBottom: 0 }}>
                  <h2 style={styles.h2}>Retrieved Context ({result.context.length} chunks)</h2>
                  {result.context.map((c, i) => (
                    <div key={i} style={styles.contextCard}>
                      <div style={styles.contextTitle}>
                        {c.title || "Untitled"}
                        <span style={styles.scoreTag}>score {c.score?.toFixed(4)}</span>
                      </div>
                      <div style={styles.contextMeta}>
                        ID: {c.article_id}
                        {c.authors && c.authors !== "[]" && c.authors !== "" && (
                          <> &nbsp;·&nbsp; {c.authors.replace(/[\[\]'"]/g, "")}</>
                        )}
                      </div>
                      <div style={styles.contextChunk}>
                        {c.chunk?.slice(0, 220)}{c.chunk?.length > 220 ? "…" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <hr style={styles.divider} />

        {/* ── API Info ── */}
        <div style={styles.section}>
          <h2 style={styles.h2}>API Endpoints</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <strong>POST /api/prompt</strong><br />
              <span style={{ color: "#555", fontSize: 12 }}>Query the RAG system with a natural-language question.</span>
            </div>
            <div style={styles.infoCard}>
              <strong>GET /api/stats</strong><br />
              <span style={{ color: "#555", fontSize: 12 }}>Returns chunk_size, overlap_ratio, top_k.</span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.h2}>System Configuration</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}><span style={styles.code}>chunk_size</span> = 512 tokens</div>
            <div style={styles.infoCard}><span style={styles.code}>overlap_ratio</span> = 0.2 (20%)</div>
            <div style={styles.infoCard}><span style={styles.code}>top_k</span> = 7 chunks</div>
            <div style={styles.infoCard}><span style={styles.code}>dimensions</span> = 1536</div>
            <div style={styles.infoCard}><span style={styles.code}>embedding</span> 4UHRUIN-text-embedding-3-small</div>
            <div style={styles.infoCard}><span style={styles.code}>generation</span> 4UHRUIN-gpt-5-mini</div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.h2}>Example Request</h2>
          <pre style={styles.pre}>{`POST /api/prompt
Content-Type: application/json

{
  "question": "Find an article about machine learning for beginners"
}`}</pre>
        </div>
      </div>
    </>
  );
}
