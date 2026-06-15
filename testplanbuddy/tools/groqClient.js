const https = require('https');

async function generateTestPlan(issue, groqKey) {
  const prompt = `You are a senior QA engineer. Generate a formal QA Test Plan as JSON for this Jira issue.

Issue:
Key: ${issue.key}
Summary: ${issue.summary}
Type: ${issue.issueType}
Priority: ${issue.priority}
Status: ${issue.status}
Components: ${issue.components.join(', ') || 'N/A'}
Labels: ${issue.labels.join(', ') || 'N/A'}
Reporter: ${issue.reporter}
Description: ${issue.description || 'No description provided'}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "testPlanId": "TP-${issue.key}",
  "sourceIssue": "${issue.key}",
  "title": "Test Plan — <summary>",
  "objective": "string",
  "scope": { "inScope": ["string"], "outOfScope": ["string"] },
  "inclusions": ["string"],
  "testEnvironments": ["string"],
  "defectReporting": "string",
  "testStrategy": ["string"],
  "schedule": [{ "phase": "string", "owner": "string", "dates": "string" }],
  "deliverables": ["string"],
  "entryCriteria": ["string"],
  "exitCriteria": ["string"],
  "tools": ["string"],
  "risks": [{ "risk": "string", "mitigation": "string" }],
  "approvals": [{ "role": "string", "name": "string" }]
}

Where ticket is silent on a field, use "TBD". Be formal and professional.`;

  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2048
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`GROQ returned ${res.statusCode}: ${data}`));
        }
        try {
          const resp = JSON.parse(data);
          const content = resp.choices[0].message.content.trim();
          const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
          resolve(JSON.parse(cleaned));
        } catch (e) {
          reject(new Error(`GROQ parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { generateTestPlan };
