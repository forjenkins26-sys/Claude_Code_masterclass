require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { fetchJiraIssue } = require('./tools/jiraClient');
const { generateTestPlan } = require('./tools/groqClient');
const { planToMarkdown } = require('./tools/testPlan');

const app = express();
app.use(cors());
app.use(express.json());

// Serve React build
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// POST /api/generate
app.post('/api/generate', async (req, res) => {
  const { jiraId, config } = req.body;

  if (!jiraId) return res.status(400).json({ error: 'jiraId required' });

  const cfg = {
    jiraUrl:   config?.jiraUrl   || process.env.JIRA_URL,
    jiraEmail: config?.jiraEmail || process.env.JIRA_EMAIL,
    jiraToken: config?.jiraToken || process.env.JIRA_TOKEN,
    groqKey:   config?.groqKey   || process.env.GROQ_KEY
  };

  if (!cfg.jiraUrl || !cfg.jiraEmail || !cfg.jiraToken || !cfg.groqKey) {
    return res.status(400).json({ error: 'Missing credentials. Fill .env or use Settings tab.' });
  }

  try {
    const issue    = await fetchJiraIssue(jiraId, cfg);
    const plan     = await generateTestPlan(issue, cfg.groqKey);
    const markdown = planToMarkdown(plan);
    res.json({ issue, plan, markdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/config — return non-secret config for pre-filling Settings UI
app.get('/api/config', (req, res) => {
  res.json({
    jiraUrl:   process.env.JIRA_URL   || '',
    jiraEmail: process.env.JIRA_EMAIL || '',
    jiraToken: process.env.JIRA_TOKEN ? '••••••••' : '',
    groqKey:   process.env.GROQ_KEY   ? '••••••••' : ''
  });
});

// GET /api/handshake — verify Jira + GROQ credentials
app.get('/api/handshake', async (req, res) => {
  const cfg = {
    jiraUrl:   process.env.JIRA_URL,
    jiraEmail: process.env.JIRA_EMAIL,
    jiraToken: process.env.JIRA_TOKEN,
    groqKey:   process.env.GROQ_KEY
  };
  try {
    await fetchJiraIssue('SCRUM-121', cfg);
    res.json({ status: 'ok', jira: '✅ connected', groq: '✅ key present' });
  } catch (err) {
    res.status(500).json({ status: 'fail', error: err.message });
  }
});

// Catch-all → React
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`TestPlanBuddy server running on http://localhost:${PORT}`));
