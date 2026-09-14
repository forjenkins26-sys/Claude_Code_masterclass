/* Shared helpers. No framework: every page is one form and one fetch, and a
   build step would be more machinery than the whole demo needs. */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape before any innerHTML write. Chunk text is file-supplied, so a cell
 *  containing "<img onerror=...>" would otherwise execute in the page. */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const fmt = n => (n ?? 0).toLocaleString();

/** Stage tracker in the left rail.
 *  Stages are given once; set() moves the pointer and stamps a note. */
class Stages {
  constructor(el, names) {
    this.el = el;
    this.names = names;
    this.state = {};
    this.render();
  }
  render() {
    this.el.innerHTML = this.names.map(([key, label]) => {
      const st = this.state[key] || {};
      const cls = [st.status, st.status === 'active' ? 'running' : ''].filter(Boolean).join(' ');
      const mark = st.status === 'done' ? '✓' : st.status === 'failed' ? '!' : '';
      return `<li class="${cls}">
        <span class="marker">${mark}</span>
        <div class="name">${esc(label)}</div>
        ${st.note ? `<div class="note">${esc(st.note)}</div>` : ''}
      </li>`;
    }).join('');
  }
  set(key, status, note) {
    this.state[key] = { status, note: note ?? this.state[key]?.note };
    this.render();
  }
  /** Mark this stage active and every earlier one done — SSE events can arrive
   *  coalesced, so a stage may be skipped over rather than explicitly closed. */
  advance(key, note) {
    const idx = this.names.findIndex(([k]) => k === key);
    this.names.forEach(([k], i) => {
      if (i < idx && this.state[k]?.status !== 'done') this.state[k] = { ...this.state[k], status: 'done' };
    });
    this.set(key, 'active', note);
  }
  reset() { this.state = {}; this.render(); }
  failAll(note) {
    const active = this.names.find(([k]) => this.state[k]?.status === 'active');
    if (active) this.set(active[0], 'failed', note);
    else this.set(this.names[0][0], 'failed', note);
  }
}

/** Horizontal bar histogram from [{from,to,count}]. */
function histogram(el, bins) {
  if (!bins?.length) { el.innerHTML = '<p class="hint">No data.</p>'; return; }
  const max = Math.max(...bins.map(b => b.count)) || 1;
  el.innerHTML = `
    <div class="hist">
      ${bins.map(b => `<div class="col" title="${b.from}–${b.to} chars: ${fmt(b.count)} chunks">
        <i style="height:${Math.round((b.count / max) * 100)}%"></i></div>`).join('')}
    </div>
    <div class="hist-axis"><span>${bins[0].from} chars</span><span>${bins.at(-1).to} chars</span></div>`;
}

/** Render [Chunk N] citations as chips and **bold** as bold. Input is escaped
 *  first, so the tags introduced below are the only markup that reaches the DOM. */
function renderAnswer(text) {
  return esc(text)
    .replace(/\[Chunk (\d+)\]/g, '<code class="cite">Chunk $1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function alertBox(kind, msg) {
  return `<div class="alert ${kind}">${esc(msg)}</div>`;
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* The column choice has to survive the hop from /upload to /ingest, and
   sessionStorage keeps it per-tab so two open tabs do not fight. */
const Session = {
  save(obj) { sessionStorage.setItem('arag', JSON.stringify(obj)); },
  load() { try { return JSON.parse(sessionStorage.getItem('arag') || 'null'); } catch { return null; } },
  clear() { sessionStorage.removeItem('arag'); },
};
