const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Proxy to Langflow — avoids CORS from browser
app.post('/proxy/langflow', async (req, res) => {
  try {
    const { url, apiKey, body } = req.body;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.json({ ok: response.ok, status: response.status, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Proxy file upload to Langflow's flow-scoped upload endpoint — avoids CORS,
// keeps the API key server-side. Browser sends raw file bytes + headers
// carrying filename/flowId/baseUrl/apiKey; we rebuild the multipart form here
// since Node's fetch/FormData/Blob are all native (no multer dependency).
app.post('/proxy/upload', express.raw({ type: '*/*', limit: '25mb' }), async (req, res) => {
  try {
    const { filename, flowid: flowId, baseurl: baseUrl, apikey: apiKey } = req.headers;
    if (!filename || !flowId || !baseUrl || !apiKey) {
      return res.status(400).json({ ok: false, error: 'Missing filename/flowId/baseUrl/apiKey header' });
    }

    const form = new FormData();
    form.append('file', new Blob([req.body]), filename);

    const response = await fetch(`${baseUrl}/api/v1/files/upload/${flowId}`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: form,
    });

    const data = await response.json();
    res.json({ ok: response.ok, status: response.status, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = 3030;
app.listen(PORT, () => {
  console.log(`\n  Playwright Test Analyzer`);
  console.log(`  → http://localhost:${PORT}\n`);
});
