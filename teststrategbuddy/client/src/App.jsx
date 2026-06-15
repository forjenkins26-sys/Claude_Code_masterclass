import React, { useState, useEffect } from 'react';
import Generator from './components/Generator';
import Settings from './components/Settings';
import StrategyViewer from './components/StrategyViewer';

const TABS = ['Generate', 'Settings'];
const LS_KEY = 'teststrategbuddy_config';

export default function App() {
  const [tab, setTab] = useState('Generate');
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('teststrategbuddy_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [config, setConfig] = useState({ jiraUrl: '', jiraEmail: '', jiraToken: '', groqKey: '' });
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = dark ? theme.dark : theme.light;

  useEffect(() => {
    localStorage.setItem('teststrategbuddy_theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try { setConfig(JSON.parse(stored)); return; } catch {}
    }
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
    <div style={{ ...styles.root, background: t.bg, color: t.text, minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ ...styles.header, background: t.header, borderBottom: `1px solid ${t.border}` }}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🎯</span>
          <span style={{ ...styles.logoText, color: t.accent }}>TestStrategyBuddy</span>
        </div>
        <nav style={styles.nav}>
          {TABS.map(tb => (
            <button
              key={tb}
              style={{
                ...styles.tabBtn,
                color: tab === tb ? t.accent : t.muted,
                background: tab === tb ? t.tabActiveBg : 'transparent',
                border: 'none'
              }}
              onClick={() => setTab(tb)}
            >{tb}</button>
          ))}
        </nav>
        <button
          style={{ ...styles.themeBtn, background: t.card, color: t.text, border: `1px solid ${t.border}` }}
          onClick={() => setDark(d => !d)}
          title="Toggle dark/light mode"
        >
          {dark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      {/* Body */}
      <main style={styles.main}>
        {tab === 'Generate' && (
          <>
            <Generator onGenerate={generate} loading={loading} theme={t} />
            {error && (
              <div style={{ ...styles.errorBox, background: t.errorBg, color: t.errorText, border: `1px solid ${t.errorBorder}` }}>
                ❌ {error}
              </div>
            )}
            {result && <StrategyViewer result={result} theme={t} />}
          </>
        )}
        {tab === 'Settings' && (
          <Settings config={config} onChange={setConfig} onSave={saveConfig} onClear={clearConfig} saved={saved} theme={t} />
        )}
      </main>
    </div>
  );
}

const theme = {
  light: {
    bg: '#f4f6fa',
    header: '#ffffff',
    card: '#ffffff',
    text: '#1a1a2e',
    muted: '#888',
    accent: '#6c47ff',
    border: '#e5e7eb',
    tabActiveBg: 'rgba(108,71,255,0.08)',
    sectionBg: '#f8f9ff',
    sectionBorder: '#e0e4ff',
    badge: '#ede9ff',
    badgeText: '#6c47ff',
    errorBg: '#fff0f0',
    errorText: '#c62828',
    errorBorder: '#ffcdd2',
    tableHead: '#f0eeff',
    tag: '#eef2ff',
    tagText: '#4f46e5'
  },
  dark: {
    bg: '#0f1117',
    header: '#1a1d27',
    card: '#1e2130',
    text: '#e8eaf6',
    muted: '#6b7280',
    accent: '#a78bfa',
    border: '#2d3148',
    tabActiveBg: 'rgba(167,139,250,0.12)',
    sectionBg: '#181b2a',
    sectionBorder: '#2d3148',
    badge: '#2d2460',
    badgeText: '#a78bfa',
    errorBg: '#2d1515',
    errorText: '#ef9a9a',
    errorBorder: '#6b2a2a',
    tableHead: '#1e2130',
    tag: '#1e2540',
    tagText: '#818cf8'
  }
};

const styles = {
  root: { fontFamily: "'Segoe UI', Arial, sans-serif", transition: 'background 0.3s, color 0.3s' },
  header: {
    padding: '0 32px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: 20, fontWeight: 800, letterSpacing: -0.5 },
  nav: { display: 'flex', gap: 4 },
  tabBtn: {
    padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
    borderRadius: 8, transition: 'all 0.2s'
  },
  themeBtn: {
    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, transition: 'all 0.2s'
  },
  main: { maxWidth: 900, margin: '0 auto', padding: '32px 24px' },
  errorBox: { borderRadius: 8, padding: '12px 16px', fontSize: 14, marginTop: 16 }
};
