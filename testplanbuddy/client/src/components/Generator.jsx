import React, { useState } from 'react';

export default function Generator({ onGenerate, loading }) {
  const [jiraId, setJiraId] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (jiraId.trim()) onGenerate(jiraId.trim().toUpperCase());
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Generate QA Test Plan</h2>
      <p style={styles.sub}>Enter a Jira issue key to auto-generate a formal test plan.</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g. SCRUM-121"
          value={jiraId}
          onChange={e => setJiraId(e.target.value)}
          disabled={loading}
        />
        <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
          {loading ? '⏳ Generating...' : '⚡ Generate'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  card: { background: '#fff', borderRadius: 12, padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  title: { fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 },
  sub: { fontSize: 13, color: '#888', marginBottom: 24 },
  form: { display: 'flex', gap: 12 },
  input: {
    flex: 1, border: '1.5px solid #e0e0e0', borderRadius: 8,
    padding: '11px 16px', fontSize: 15, outline: 'none', background: '#fafafa'
  },
  btn: {
    background: '#f8e71c', border: 'none', borderRadius: 8,
    padding: '11px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer'
  }
};
