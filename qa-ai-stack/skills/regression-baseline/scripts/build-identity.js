#!/usr/bin/env node
/**
 * build-identity.js — resolve a machine-checkable build identity for a target URL.
 *
 * WHY THIS IS A COMPOSITE, NOT AN ETag
 * ------------------------------------
 * Empirically disproved 2026-09-14 against https://blinkit-demo-qa.vercel.app/:
 *   ETag          6fd46ec3818f08374b290e4e4d601830  (identical on 2026-08-23, 08-24, 09-14)
 *   Last-Modified Aug 24 11:25:15 GMT -> Sep 14 02:05:24 GMT   (moved)
 *
 * On Vercel the ETag is a content hash of the served asset, so a redeploy of
 * byte-identical content keeps the SAME ETag across weeks. Consequences:
 *   - ETag alone          => "same build" forever  => stale results treated as valid
 *   - Last-Modified alone => "new build" on every no-op redeploy => needless re-runs
 * Neither field is sufficient. We hash all three available fields together.
 *
 * THREE STATES, NO SILENT MIDDLE (mirrors requirement-drift / AH Rule 30):
 *   SAME    - every captured field matches the baseline
 *   CHANGED - any captured field differs
 *   UNKNOWN - no identity fields exposed at all -> caller MUST treat as CHANGED,
 *             never as SAME. progress.md:752 records a real run where the app
 *             exposed no build hash; that case is handled, not assumed away.
 *
 * Read-only. Performs a single HEAD request. Writes nothing.
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

const IDENTITY_FIELDS = ['etag', 'last-modified', 'content-length'];

function headRequest(url, timeoutMs = 15000, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return reject(new Error(`Invalid URL: ${url}`));
    }
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(
      parsed,
      { method: 'HEAD', timeout: timeoutMs },
      (res) => {
        const loc = res.headers.location;
        if (res.statusCode >= 300 && res.statusCode < 400 && loc && redirectsLeft > 0) {
          res.resume();
          const next = new URL(loc, parsed).toString();
          return resolve(headRequest(next, timeoutMs, redirectsLeft - 1));
        }
        res.resume();
        resolve({ status: res.statusCode, headers: res.headers, finalUrl: parsed.toString() });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`HEAD timed out after ${timeoutMs}ms`)));
    req.on('error', reject);
    req.end();
  });
}

/**
 * Capture identity fields and fold them into one id.
 * Returns { build_id, fields, state: 'RESOLVED'|'UNKNOWN', url, status, captured_at }
 */
async function resolveBuildIdentity(url, opts = {}) {
  const captured_at = new Date().toISOString();
  let res;
  try {
    res = await headRequest(url, opts.timeoutMs);
  } catch (err) {
    return {
      build_id: null,
      state: 'UNKNOWN',
      reason: `HEAD failed: ${err.message}`,
      fields: {},
      url,
      status: null,
      captured_at,
    };
  }

  const fields = {};
  for (const f of IDENTITY_FIELDS) {
    if (res.headers[f] != null) fields[f] = String(res.headers[f]).trim();
  }

  if (Object.keys(fields).length === 0) {
    return {
      build_id: null,
      state: 'UNKNOWN',
      reason: 'target exposed no etag/last-modified/content-length',
      fields,
      url: res.finalUrl,
      status: res.status,
      captured_at,
    };
  }

  // Stable ordering so the hash does not depend on header arrival order.
  const canonical = IDENTITY_FIELDS.filter((f) => fields[f] != null)
    .map((f) => `${f}=${fields[f]}`)
    .join('|');

  return {
    build_id: crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16),
    state: 'RESOLVED',
    canonical,
    fields,
    url: res.finalUrl,
    status: res.status,
    captured_at,
  };
}

/**
 * Compare a freshly resolved identity against a stored baseline identity.
 * UNKNOWN on either side => CHANGED (never SAME). Results are expired, not trusted.
 */
function compareIdentity(current, baseline) {
  if (!baseline || baseline.state === 'UNKNOWN' || !baseline.build_id) {
    return { verdict: 'CHANGED', why: 'no usable baseline build identity — prior results expired' };
  }
  if (!current || current.state === 'UNKNOWN' || !current.build_id) {
    return { verdict: 'CHANGED', why: `current build identity unavailable (${current?.reason || 'unknown'}) — results expired` };
  }
  if (current.build_id === baseline.build_id) {
    return { verdict: 'SAME', why: `build identity matches (${current.build_id})` };
  }
  const diffs = [];
  for (const f of IDENTITY_FIELDS) {
    const a = baseline.fields?.[f];
    const b = current.fields?.[f];
    if (a !== b) diffs.push(`${f}: ${a ?? '(absent)'} -> ${b ?? '(absent)'}`);
  }
  return { verdict: 'CHANGED', why: 'build identity differs', diffs };
}

module.exports = { resolveBuildIdentity, compareIdentity, IDENTITY_FIELDS };

if (require.main === module) {
  const url = process.argv[2];
  const asJson = process.argv.includes('--json');
  if (!url) {
    console.error('usage: node build-identity.js <url> [--json]');
    process.exit(2);
  }
  resolveBuildIdentity(url).then((id) => {
    if (asJson) {
      console.log(JSON.stringify(id, null, 2));
    } else {
      console.log(`URL        ${id.url}`);
      console.log(`State      ${id.state}`);
      console.log(`Build ID   ${id.build_id ?? '(none)'}`);
      if (id.reason) console.log(`Reason     ${id.reason}`);
      for (const [k, v] of Object.entries(id.fields)) console.log(`  ${k.padEnd(15)} ${v}`);
      console.log(`Captured   ${id.captured_at}`);
    }
    process.exit(id.state === 'RESOLVED' ? 0 : 1);
  });
}
