import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Medium Article RAG Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '40px auto', padding: '0 20px' }}>
        <h1>Medium Article RAG Assistant</h1>
        <p>AI assistant that answers questions based on a dataset of ~7,600 Medium articles.</p>
        <h2>API Endpoints</h2>
        <ul>
          <li><strong>POST /api/prompt</strong> — query the RAG system with a natural language question</li>
          <li><strong>GET /api/stats</strong> — get current RAG configuration (chunk_size, overlap_ratio, top_k)</li>
        </ul>
        <h2>Example Request</h2>
        <pre style={{ background: '#f4f4f4', padding: 16, borderRadius: 4, overflow: 'auto', fontSize: 13 }}>{`POST /api/prompt
Content-Type: application/json

{
  "question": "Find an article about machine learning for beginners"
}`}</pre>
      </main>
    </>
  );
}
