import React from 'react';

export default function Settings({ config, onChange, onSave, onClear, saved, theme: t }) {
  function update(key, val) {
    onChange(prev => ({ ...prev, [key]: val }));
  }

  const fields = [
    { key: 'jiraUrl',   label: 'Jira URL',    placeholder: 'https://yoursite.atlassian.net', type: 'text' },
    { key: 'jiraEmail', label: 'Jira Email',   placeholder: 'you@example.com', type: 'email' },
    { key: 'jiraToken', label: 'Jira Token',   placeholder: 'ATATT…', type: 'password' },
    { key: 'groqKey',   label: 'GROQ API Key', placeholder: 'gsk_…', type: 'password' }
  ];

  return (
    <div style={{ ...styles.card, background: t.card, border: `1px solid ${t.border}` }}>
      <h2 style={{ ...styles.title, color: t.text }}>Settings</h2>
      <p style={{ ...styles.sub, color: t.muted }}>
        Override .env defaults. Saved to browser localStorage — never sent to a server.
      </p>

      {fields.map(({ key, label, placeholder, type }) => (
        <div key={key} style={styles.group}>
          <label style={{ ...styles.label, color: t.muted }}>{label}</label>
          <input
            style={{ ...styles.input, background: t.sectionBg, border: `1.5px solid ${t.border}`, color: t.text }}
            type={type}
            placeholder={placeholder}
            value={config[key]}
            onChange={e => update(key, e.target.value)}
          />
        </div>
      ))}

      <div style={styles.actions}>
        <button
          style={{ ...styles.saveBtn, background: t.accent, color: '#fff' }}
          onClick={onSave}
        >
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
        <button
          style={{ ...styles.clearBtn, background: t.sectionBg, border: `1.5px solid ${t.border}`, color: t.text }}
          onClick={onClear}
        >
          🗑 Clear Saved
        </button>
      </div>

      <p style={{ ...styles.note, color: t.muted }}>
        ⚠️ Token + API key stored in localStorage (this browser only). Clear anytime.
      </p>
    </div>
  );
}

const styles = {
  card: { borderRadius: 14, padding: '28px 32px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  sub: { fontSize: 13, marginBottom: 24 },
  group: { marginBottom: 18 },
  label: { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    width: '100%', borderRadius: 8, padding: '11px 14px',
    fontSize: 14, outline: 'none', boxSizing: 'border-box'
  },
  actions: { display: 'flex', gap: 10, marginTop: 8 },
  saveBtn: { border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  clearBtn: { borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  note: { fontSize: 12, marginTop: 14 }
};
