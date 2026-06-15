import React, { useState, useEffect } from 'react';
import Generator from './components/Generator';
import Settings from './components/Settings';
import PlanViewer from './components/PlanViewer';

const TABS = ['Generate', 'Settings'];
const LS_KEY = 'testplanbuddy_config';

export default function App() {
  const [tab, setTab] = useState('Generate');
  const [config, setConfig] = useState({ jiraUrl: '', jiraEmail: '', jiraToken: '', groqKey: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage first
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try { setConfig(JSON.parse(stored)); return; } catch {}
    }
    // Fallback: pre-fill from server .env (masked)
    fetch('/api/config').then(r => r.json()).then(cfg => {
      setConfig(prev => ({
        jiraUrl:   prev.jiraUrl   || cfg.jiraUrl,
        jiraEmail: prev.jiraEmail || cfg.jiraEmail,
        jiraToken: prev.jiraToken || '',
        groqKey:   prev.groqKey   || ''
      }));
    }).catch(() => {});
  }, []);

  function saveConfig() {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function clearConfig() {
    localStorage.removeItem(LS_KEY);
    setConfig({ jiraUrl: '', jiraEmail: '', jiraToken: '', groqKey: '' });
  }
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate(jiraId) {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jiraId, config })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>⚡ TestPlanBuddy</div>
        <nav style={styles.nav}>
          {TABS.map(t => (
            <button
              key={t}
              style={{ ...styles.tabBtn, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >{t}</button>
          ))}
        </nav>
      </header>

      {/* Body */}
      <main style={styles.main}>
        {tab === 'Generate' && (
          <>
            <Generator onGenerate={generate} loading={loading} />
            {error && <div style={styles.error}>❌ {error}</div>}
            {result && <PlanViewer result={result} />}
          </>
        )}
        {tab === 'Settings' && (
          <Settings config={config} onChange={setConfig} onSave={saveConfig} onClear={clearConfig} saved={saved} />
        )}
      </main>
    </div>
  );
}

const styles = {
  root: { fontFamily: "'Segoe UI', Arial, sans-serif", minHeight: '100vh', background: '#f5f5f5' },
  header: {
    background: '#1a1a1a', color: '#fff', padding: '0 32px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56
  },
  logo: { fontSize: 20, fontWeight: 800, color: '#f8e71c', letterSpacing: -0.5 },
  nav: { display: 'flex', gap: 4 },
  tabBtn: {
    background: 'transparent', border: 'none', color: '#aaa',
    padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
    borderRadius: 6, transition: 'color 0.2s'
  },
  tabActive: { color: '#f8e71c', background: 'rgba(248,231,28,0.1)' },
  main: { maxWidth: 860, margin: '0 auto', padding: '32px 24px' },
  error: {
    background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 8,
    padding: '12px 16px', color: '#c62828', fontSize: 14, marginTop: 16
  }
};
