const https = require('https');

function flattenADF(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  if (node.content) {
    const text = node.content.map(flattenADF).join('');
    if (node.type === 'paragraph') return text + '\n';
    if (node.type === 'heading') return text + '\n';
    if (node.type === 'listItem') return '- ' + text;
    if (node.type === 'bulletList' || node.type === 'orderedList') return text;
    return text;
  }
  return '';
}

function fetchJiraIssue(issueKey, cfg) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${cfg.jiraEmail}:${cfg.jiraToken}`).toString('base64');
    const url = new URL(`/rest/api/3/issue/${issueKey}`, cfg.jiraUrl);

    const options = {
      hostname: url.hostname,
      path: url.pathname + '?fields=summary,description,issuetype,status,priority,labels,assignee',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Jira fetch failed: ${res.statusCode} — ${data}`));
        }
        try {
          const json = JSON.parse(data);
          const f = json.fields;
          const descRaw = f.description;
          const description = descRaw
            ? (descRaw.type === 'doc' ? flattenADF(descRaw) : String(descRaw))
            : 'No description provided.';

          resolve({
            key: json.key,
            summary: f.summary,
            description: description.trim(),
            issueType: f.issuetype?.name || 'Story',
            status: f.status?.name || 'To Do',
            priority: f.priority?.name || 'Medium',
            labels: f.labels || [],
            assignee: f.assignee?.displayName || 'Unassigned'
          });
        } catch (e) {
          reject(new Error('Failed to parse Jira response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

module.exports = { fetchJiraIssue };
