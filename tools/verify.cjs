#!/usr/bin/env node
// tools/verify.cjs — flip a desk-ledger receipt or PT-input from draft → confirmed.
// Stamps verification_log[], updates stars_confirmed, and prints implied PT delta.
//
// Usage:
//   node tools/verify.cjs <ticker>                       — print ledger status
//   node tools/verify.cjs <ticker> <receipt-id>          — flip receipt to confirmed
//   node tools/verify.cjs <ticker> pt:<input-key>        — flip PT input to confirmed
//   node tools/verify.cjs <ticker> --by <name>           — set verifier name (default: env USER)
//   node tools/verify.cjs <ticker> --note "<text>"       — append a note
//   node tools/verify.cjs <ticker> --unverify <id>       — flip back to draft
//
// Examples:
//   node tools/verify.cjs 3037
//   node tools/verify.cjs 3037 3037-T1-phase2-capex --by CL
//   node tools/verify.cjs 3037 pt:fy_revenue --by HW --note "verified vs Q4 法說會"

'use strict';
const fs = require('fs');
const path = require('path');

const LEDGER_DIR = path.join(__dirname, '..', 'public', 'data', 'desk');

function die(msg, code) { console.error('  [verify] ' + msg); process.exit(code || 1); }
function today() { return new Date().toISOString().slice(0, 10); }

function readLedger(tk) {
  const p = path.join(LEDGER_DIR, tk + '.json');
  if (!fs.existsSync(p)) die('no ledger at ' + p);
  return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
}
function writeLedger(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function computePT(d) {
  if (!d.price_target || !d.price_target.compute) return null;
  const i = d.price_target.inputs || {};
  const fyR = i.fy_revenue && i.fy_revenue.value;
  const opM = i.operating_margin && i.operating_margin.value;
  const nAI = i.non_ai_contribution && i.non_ai_contribution.value;
  const mlt = i.multiple && i.multiple.value;
  const sho = d.shares_out_m;
  if ([fyR, opM, nAI, mlt, sho].some(v => typeof v !== 'number')) return null;
  const earnings = fyR * (opM / 100) + nAI;
  return earnings * mlt * 1000 / sho;
}

function countConfirmed(d) {
  const recs = (d.order_visibility && d.order_visibility.receipts) || [];
  return recs.filter(r => (r.verify_status || '').toLowerCase() === 'confirmed').length;
}

function status(d) {
  const ov = d.order_visibility || {};
  const recs = ov.receipts || [];
  const confirmed = countConfirmed(d);
  const target = ov.stars_draft_target || 4;

  console.log('  ' + d.ticker + ' · ' + (d.name_en || '—') + ' · ' + (d.layer_label_en || d.layer || ''));
  console.log('  stars: ' + (ov.stars || 'pending') + ' · confirmed receipts: ' + confirmed + ' / target ' + target);
  console.log('  receipts:');
  recs.forEach(r => {
    const v = (r.verify_status || 'draft').toLowerCase();
    const mark = v === 'confirmed' ? '✓' : '·';
    console.log('    ' + mark + ' [T' + r.tier + '] ' + (r.id || '(no id)') + ' — ' + v + (r.dated ? ' · ' + r.dated : ''));
  });
  const inputs = (d.price_target && d.price_target.inputs) || {};
  console.log('  PT inputs:');
  Object.keys(inputs).forEach(k => {
    const v = inputs[k];
    const vs = (v.verify_status || 'draft').toLowerCase();
    const mark = vs === 'confirmed' ? '✓' : '·';
    console.log('    ' + mark + ' ' + k + ' = ' + v.value + (v.unit ? (' ' + v.unit) : '') + ' · ' + vs);
  });
  const pt = computePT(d);
  if (pt != null) console.log('  PT (live compute): NT$' + (Math.round(pt * 10) / 10).toFixed(1));
}

function appendLog(d, entry) {
  d.verification_log = d.verification_log || [];
  d.verification_log.push(entry);
}

function flipReceipt(d, id, to, by, note) {
  const recs = (d.order_visibility && d.order_visibility.receipts) || [];
  const r = recs.find(x => x.id === id);
  if (!r) die('no receipt with id ' + id);
  const before = (r.verify_status || 'draft').toLowerCase();
  if (before === to) { console.log('  [verify] ' + id + ' already ' + to); return false; }
  r.verify_status = to;
  if (to === 'confirmed' && (!r.dated || /^\[draft/.test(r.dated))) r.dated = today();
  appendLog(d, {
    as_of: today(), by: by, action: to === 'confirmed' ? 'confirm receipt' : 'unverify receipt',
    receipts_confirmed: to === 'confirmed' ? [id] : [],
    pt_revisions: [],
    note: note || ''
  });
  return true;
}

function flipPTInput(d, key, to, by, note, newValue) {
  const inputs = (d.price_target && d.price_target.inputs) || {};
  if (!inputs[key]) die('no PT input ' + key);
  const beforeStatus = (inputs[key].verify_status || 'draft').toLowerCase();
  const valueChange = (typeof newValue === 'number');
  if (beforeStatus === to && !valueChange) { console.log('  [verify] PT input ' + key + ' already ' + to); return false; }
  const ptBefore = computePT(d);
  const valueBefore = inputs[key].value;
  inputs[key].verify_status = to;
  if (valueChange) inputs[key].value = newValue;
  inputs[key].last_revision = {
    date: today(), by: by,
    from: beforeStatus, to: to,
    value_before: valueBefore,
    value_after: inputs[key].value
  };
  const ptAfter = computePT(d);
  appendLog(d, {
    as_of: today(), by: by,
    action: valueChange
      ? ('revise PT input · ' + key + ' ' + valueBefore + ' → ' + newValue)
      : (to === 'confirmed' ? 'confirm PT input' : 'unverify PT input'),
    receipts_confirmed: [],
    pt_revisions: [{
      key: key, from: beforeStatus, to: to,
      value_before: valueBefore, value_after: inputs[key].value,
      pt_before: ptBefore, pt_after: ptAfter
    }],
    note: note || ''
  });
  return true;
}

function recomputeStars(d) {
  const ov = d.order_visibility || {};
  const target = ov.stars_draft_target || 4;
  const confirmed = countConfirmed(d);
  ov.stars_confirmed = confirmed;
  // Stars only set when target met. Until then, stars stays null (page renders "★ pending").
  ov.stars = confirmed >= target ? target : null;
  return { confirmed, target, stars: ov.stars };
}

(function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    console.log('Usage:');
    console.log('  node tools/verify.cjs <ticker>');
    console.log('  node tools/verify.cjs <ticker> <receipt-id> [--by NAME] [--note "..."]');
    console.log('  node tools/verify.cjs <ticker> pt:<input-key> [--set <number>] [--by NAME] [--note "..."]');
    console.log('  node tools/verify.cjs <ticker> --unverify <id-or-pt:key>');
    console.log('');
    console.log('  --set <number>  Revise the PT input value (logs PT-before vs PT-after).');
    process.exit(0);
  }

  const tk = argv[0];
  const ledger = readLedger(tk);
  const d = ledger.data;

  // No subcommand → status
  if (argv.length === 1) { status(d); return; }

  // Parse flags
  let target = null;
  let unverify = false;
  let by = process.env.USER || 'CL';
  let note = '';
  let setValue = null;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--by') { by = argv[++i] || by; }
    else if (a === '--note') { note = argv[++i] || ''; }
    else if (a === '--set') {
      const raw = argv[++i];
      const num = Number(raw);
      if (Number.isFinite(num)) setValue = num;
      else die('--set expects a number, got: ' + raw);
    }
    else if (a === '--unverify') { unverify = true; target = argv[++i]; }
    else if (!target) { target = a; }
  }
  if (!target) die('missing receipt-id or pt:<key>');

  const to = unverify ? 'draft' : 'confirmed';
  let changed = false;

  if (target.startsWith('pt:')) {
    changed = flipPTInput(d, target.slice(3), to, by, note, setValue);
  } else {
    if (setValue != null) die('--set only valid with pt:<key>');
    changed = flipReceipt(d, target, to, by, note);
  }

  if (changed) {
    const stars = recomputeStars(d);
    writeLedger(ledger.path, d);
    console.log('  [verify] ' + tk + ' · ' + target + ' → ' + to + ' (by ' + by + ')');
    console.log('  [verify] confirmed receipts: ' + stars.confirmed + ' / target ' + stars.target +
                ' · stars: ' + (stars.stars || 'pending'));
    const pt = computePT(d);
    if (pt != null) console.log('  [verify] PT (live compute): NT$' + (Math.round(pt * 10) / 10).toFixed(1));
  }
})();
