import React, { useState } from 'react';

export default function Generator({ onGenerate, loading, theme: t }) {
  const [jiraId, setJiraId] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (jiraId.trim()) onGenerate(jiraId.trim().toUpperCase());
  }

  return (
    <div style={{ ...styles.card, background: t.card, border: `1px solid ${t.border}` }}>
      <h2 style={{ ...styles.title, color: t.text }}>Generate Test Strategy</h2>
      <p style={{ ...styles.sub, color: t.muted }}>
        Enter a Jira issue key. The feature description will be fetched and a formal 10-section QA Test Strategy generated.
      </p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={{ ...styles.input, background: t.sectionBg, border: `1.5px solid ${t.border}`, color: t.text }}
          type="text"
          placeholder="e.g. SCRUM-187"
          value={jiraId}
          onChange={e => setJiraId(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !jiraId.trim()}
          style={{
            ...styles.btn,
            background: loading || !jiraId.trim() ? t.muted : t.accent,
            opacity: loading || !jiraId.trim() ? 0.6 : 1,
            cursor: loading || !jiraId.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Generating…' : '🎯 Generate Strategy'}
        </button>
      </form>
      {loading && (
        <div style={{ ...styles.progress, color: t.muted }}>
          Fetching Jira issue → generating strategy with GROQ…
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { borderRadius: 14, padding: '28px 32px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  sub: { fontSize: 14, marginBottom: 22 },
  form: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  input: {
    flex: 1, minWidth: 200, borderRadius: 8, padding: '11px 16px',
    fontSize: 15, outline: 'none', fontFamily: 'monospace', fontWeight: 600,
    boxSizing: 'border-box', letterSpacing: 1
  },
  btn: {
    padding: '11px 28px', borderRadius: 8, border: 'none',
    fontWeight: 700, fontSize: 14, color: '#fff', transition: 'all 0.2s'
  },
  progress: { fontSize: 13, marginTop: 14, fontStyle: 'italic' }
};
