const https = require('https');

function flattenADF(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.content) return node.content.map(flattenADF).join(' ');
  return '';
}

async function fetchJiraIssue(jiraId, config) {
  const { jiraUrl, jiraEmail, jiraToken } = config;
  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const url = `${jiraUrl}/rest/api/3/issue/${jiraId}`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Jira returned ${res.statusCode}: ${data}`));
        }
        try {
          const raw = JSON.parse(data);
          const f = raw.fields;
          resolve({
            key: raw.key,
            summary: f.summary || '',
            description: flattenADF(f.description),
            issueType: f.issuetype?.name || 'Unknown',
            status: f.status?.name || 'Unknown',
            priority: f.priority?.name || 'Medium',
            components: (f.components || []).map(c => c.name),
            labels: f.labels || [],
            fixVersions: (f.fixVersions || []).map(v => v.name),
            reporter: f.reporter?.displayName || 'Unknown',
            assignee: f.assignee?.displayName || null
          });
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
  });
}

module.exports = { fetchJiraIssue };
