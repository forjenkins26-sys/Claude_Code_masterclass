const https = require('https');

function generateTestStrategy(issue, groqKey) {
  return new Promise((resolve, reject) => {
    const systemPrompt = `You are a senior QA architect. Generate a formal, professional QA Test Strategy document in strict JSON format.
Base the strategy entirely on the provided Jira feature description. Do not invent facts not present in the description.
Use "TBD" for any field that cannot be determined from the feature description.
Return ONLY valid JSON — no markdown fences, no explanation text.`;

    const userPrompt = `Create a QA Test Strategy for this Jira feature:

**Issue Key:** ${issue.key}
**Summary:** ${issue.summary}
**Type:** ${issue.issueType}
**Priority:** ${issue.priority}
**Labels:** ${issue.labels.join(', ') || 'none'}
**Description:**
${issue.description}

Return a JSON object with EXACTLY these fields:
{
  "featureName": "short feature name",
  "objective": "2-3 sentence testing objective",
  "scope": {
    "inScope": ["list of in-scope items based on description"],
    "outOfScope": ["list of out-of-scope items"]
  },
  "focusAreas": ["Functional", "Security", "Performance", "Compatibility", "Usability", ...add relevant ones],
  "approach": ["testing technique 1", "testing technique 2", ...],
  "deliverables": ["deliverable 1", "deliverable 2", ...],
  "teamAndSchedule": {
    "teamSize": "recommended team size",
    "duration": "estimated testing duration",
    "phases": [
      {"phase": "Phase 1", "activity": "activity description"},
      {"phase": "Phase 2", "activity": "activity description"}
    ]
  },
  "entryCriteria": ["criterion 1", "criterion 2", ...],
  "exitCriteria": ["criterion 1", "criterion 2", ...],
  "risks": [
    {"risk": "risk description", "mitigation": "mitigation action"},
    {"risk": "risk description", "mitigation": "mitigation action"}
  ],
  "tools": ["tool 1", "tool 2", ...],
  "approvals": [
    {"role": "QA Lead", "name": "TBD", "date": "TBD"},
    {"role": "Product Owner", "name": "TBD", "date": "TBD"},
    {"role": "Dev Lead", "name": "TBD", "date": "TBD"}
  ]
}`;

    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2048
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`GROQ failed: ${res.statusCode} — ${data}`));
        }
        try {
          const json = JSON.parse(data);
          let content = json.choices[0].message.content.trim();
          // Strip markdown fences if present
          content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          const strategy = JSON.parse(content);
          resolve(strategy);
        } catch (e) {
          reject(new Error('Failed to parse GROQ response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { generateTestStrategy };
