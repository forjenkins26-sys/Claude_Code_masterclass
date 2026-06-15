import React from 'react';

export default function Settings({ config, onChange, onSave, onClear, saved }) {
  function update(key, val) {
    onChange(prev => ({ ...prev, [key]: val }));
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Settings</h2>
      <p style={styles.sub}>Override .env defaults. Saved to browser localStorage — never sent to a server.</p>

      {[
        { key: 'jiraUrl',   label: 'Jira URL',    placeholder: 'https://yoursite.atlassian.net', type: 'text' },
        { key: 'jiraEmail', label: 'Jira Email',   placeholder: 'you@example.com', type: 'email' },
        { key: 'jiraToken', label: 'Jira Token',   placeholder: 'ATATT...', type: 'password' },
        { key: 'groqKey',   label: 'GROQ API Key', placeholder: 'gsk_...', type: 'password' }
      ].map(({ key, label, placeholder, type }) => (
        <div key={key} style={styles.group}>
          <label style={styles.label}>{label}</label>
          <input
            style={styles.input}
            type={type}
            placeholder={placeholder}
            value={config[key]}
            onChange={e => update(key, e.target.value)}
          />
        </div>
      ))}

      <div style={styles.actions}>
        <button style={styles.saveBtn} onClick={onSave}>
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
        <button style={styles.clearBtn} onClick={onClear}>
          🗑 Clear Saved
        </button>
      </div>

      <p style={styles.note}>
        ⚠️ Token + API key stored in localStorage (this browser only). Clear anytime with the button above.
      </p>
    </div>
  );
}

const styles = {
  card: { background: '#fff', borderRadius: 12, padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  title: { fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 },
  sub: { fontSize: 13, color: '#888', marginBottom: 24 },
  group: { marginBottom: 18 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8,
    padding: '11px 14px', fontSize: 14, outline: 'none', background: '#fafafa', boxSizing: 'border-box'
  },
  actions: { display: 'flex', gap: 10, marginTop: 8 },
  saveBtn: {
    background: '#f8e71c', border: 'none', borderRadius: 8,
    padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer'
  },
  clearBtn: {
    background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 8,
    padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#666'
  },
  note: { fontSize: 12, color: '#aaa', marginTop: 12 }
};
