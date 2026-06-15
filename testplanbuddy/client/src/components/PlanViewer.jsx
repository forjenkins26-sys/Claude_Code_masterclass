import React from 'react';

export default function PlanViewer({ result }) {
  const { issue, plan, markdown } = result;

  function download() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `test-plan-${issue.key}.md`;
    a.click();
  }

  return (
    <div style={styles.wrap}>
      {/* Issue summary bar */}
      <div style={styles.issuebar}>
        <span style={styles.key}>{issue.key}</span>
        <span style={styles.summary}>{issue.summary}</span>
        <span style={styles.badge}>{issue.issueType}</span>
        <span style={styles.badge}>{issue.priority}</span>
      </div>

      {/* Plan header */}
      <div style={styles.planHeader}>
        <div>
          <h2 style={styles.planTitle}>{plan.title}</h2>
          <p style={styles.planId}>Plan ID: {plan.testPlanId}</p>
        </div>
        <button style={styles.dlBtn} onClick={download}>⬇ Download .md</button>
      </div>

      {/* Sections */}
      <Section title="1. Objective" text={plan.objective} />
      <ScopeSection scope={plan.scope} />
      <ListSection title="3. Inclusions" items={plan.inclusions} />
      <ListSection title="4. Test Environments" items={plan.testEnvironments} />
      <Section title="5. Defect Reporting" text={plan.defectReporting} />
      <ListSection title="6. Test Strategy" items={plan.testStrategy} />
      <TableSection
        title="7. Schedule"
        headers={['Phase', 'Owner', 'Dates']}
        rows={plan.schedule.map(s => [s.phase, s.owner, s.dates])}
      />
      <ListSection title="8. Deliverables" items={plan.deliverables} />
      <ListSection title="9. Entry Criteria" items={plan.entryCriteria} />
      <ListSection title="10. Exit Criteria" items={plan.exitCriteria} />
      <ListSection title="11. Tools" items={plan.tools} />
      <TableSection
        title="12. Risks & Mitigations"
        headers={['Risk', 'Mitigation']}
        rows={plan.risks.map(r => [r.risk, r.mitigation])}
      />
      <TableSection
        title="13. Approvals"
        headers={['Role', 'Name']}
        rows={plan.approvals.map(a => [a.role, a.name])}
      />
    </div>
  );
}

function Section({ title, text }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <p style={s.text}>{text}</p>
    </div>
  );
}

function ListSection({ title, items }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <ul style={s.list}>
        {items.map((item, i) => <li key={i} style={s.li}>{item}</li>)}
      </ul>
    </div>
  );
}

function ScopeSection({ scope }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>2. Scope</h3>
      <p style={{ ...s.text, fontWeight: 600, marginBottom: 6 }}>In Scope:</p>
      <ul style={s.list}>{scope.inScope.map((i, k) => <li key={k} style={s.li}>{i}</li>)}</ul>
      <p style={{ ...s.text, fontWeight: 600, marginTop: 12, marginBottom: 6 }}>Out of Scope:</p>
      <ul style={s.list}>{scope.outOfScope.map((i, k) => <li key={k} style={s.li}>{i}</li>)}</ul>
    </div>
  );
}

function TableSection({ title, headers, rows }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <table style={s.table}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={s.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={i % 2 === 0 ? {} : { background: '#f9f9f9' }}>
              {row.map((cell, j) => <td key={j} style={s.td}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  wrap: { marginTop: 24 },
  issuebar: {
    display: 'flex', alignItems: 'center', gap: 10, background: '#1a1a1a',
    borderRadius: '10px 10px 0 0', padding: '12px 20px'
  },
  key: { color: '#f8e71c', fontWeight: 800, fontSize: 14 },
  summary: { color: '#fff', fontSize: 14, flex: 1 },
  badge: {
    background: 'rgba(248,231,28,0.15)', color: '#f8e71c',
    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4
  },
  planHeader: {
    background: '#fff', padding: '20px 24px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #eee'
  },
  planTitle: { fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  planId: { fontSize: 12, color: '#888', marginTop: 4 },
  dlBtn: {
    background: '#f8e71c', border: 'none', borderRadius: 8,
    padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer'
  }
};

const s = {
  section: {
    background: '#fff', padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0'
  },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 },
  text: { fontSize: 14, color: '#444', lineHeight: 1.6 },
  list: { paddingLeft: 20 },
  li: { fontSize: 14, color: '#444', lineHeight: 1.8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { background: '#f5f5f5', padding: '8px 12px', textAlign: 'left', fontWeight: 700, border: '1px solid #e0e0e0' },
  td: { padding: '8px 12px', border: '1px solid #e0e0e0', color: '#444', verticalAlign: 'top' }
};
