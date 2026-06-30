// optimize-loop self-modification audit — Move 2 of the grounded RCOF work
// (the "Meta / Gödel self-improvement" layer, made safe). The optimizer is the
// one tool that REWRITES the repo's own standing rules. RCOF's safeguards say a
// self-modifying system must keep an audit trail and be reversible. These tests
// pin that the audit ledger is real and append-only:
//   1. every recorded self-modification is timestamped (you can always say WHEN).
//   2. append→read round-trips faithfully (the ledger is not lossy).
//   3. the ledger is append-only — a second write never rewrites the first.
//
// The log lives at .mycelium/self-mod-log.jsonl (gitignored runtime ledger). To
// avoid clobbering any real ledger, we snapshot it, run against it, and restore.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { appendSelfMod, readSelfMod, SELF_MOD_LOG } = require('../../bin/optimize-loop.cjs');

let savedExisted = false;
let savedContent = null;

beforeEach(() => {
  savedExisted = fs.existsSync(SELF_MOD_LOG);
  savedContent = savedExisted ? fs.readFileSync(SELF_MOD_LOG, 'utf8') : null;
  // start each test from an empty ledger so counts are deterministic
  if (savedExisted) fs.rmSync(SELF_MOD_LOG);
});

afterEach(() => {
  // restore whatever was there before the test (or remove what we created)
  if (savedExisted) fs.writeFileSync(SELF_MOD_LOG, savedContent);
  else if (fs.existsSync(SELF_MOD_LOG)) fs.rmSync(SELF_MOD_LOG);
});

describe('optimize self-mod audit ledger', () => {
  it('stamps every record with a timestamp', () => {
    appendSelfMod({ action: 'optimize-apply', added: 2, rules: [] });
    const log = readSelfMod();
    expect(log).toHaveLength(1);
    expect(log[0].ts).toBeTruthy();
    expect(() => new Date(log[0].ts).toISOString()).not.toThrow();
    expect(log[0].action).toBe('optimize-apply');
    expect(log[0].added).toBe(2);
  });

  it('round-trips structured fields faithfully', () => {
    const rules = [{ category: 'i18n', rule: 'check PAGE_I18N' }];
    appendSelfMod({ action: 'optimize-apply', added: 1, rules, backup: 'fm.bak-1', backupPath: '/x/fm.bak-1' });
    const [rec] = readSelfMod();
    expect(rec.rules).toEqual(rules);
    expect(rec.backup).toBe('fm.bak-1');
    expect(rec.backupPath).toBe('/x/fm.bak-1');
  });

  it('is append-only — a second write keeps the first', () => {
    appendSelfMod({ action: 'optimize-apply', added: 1, rules: [] });
    appendSelfMod({ action: 'optimize-rollback', restoredFrom: '/x/fm.bak-1', undid: { added: 1 } });
    const log = readSelfMod();
    expect(log).toHaveLength(2);
    expect(log[0].action).toBe('optimize-apply');
    expect(log[1].action).toBe('optimize-rollback');
  });

  it('readSelfMod returns [] when the ledger does not exist (honest empty)', () => {
    expect(readSelfMod()).toEqual([]);
  });

  it('rollback can identify the most recent un-reverted apply', () => {
    // This mirrors cmdRollback's selection logic: the newest apply whose
    // backupPath has NOT already been restoredFrom in a later rollback.
    appendSelfMod({ action: 'optimize-apply', added: 1, rules: [], backupPath: '/x/a' });
    appendSelfMod({ action: 'optimize-apply', added: 1, rules: [], backupPath: '/x/b' });
    appendSelfMod({ action: 'optimize-rollback', restoredFrom: '/x/b', undid: { added: 1 } });
    const log = readSelfMod();
    const reverted = new Set(log.filter((e) => e.action === 'optimize-rollback').map((e) => e.restoredFrom));
    const target = [...log].reverse().find((e) => e.action === 'optimize-apply' && !reverted.has(e.backupPath));
    // b was already rolled back, so the next un-reverted apply is a
    expect(target.backupPath).toBe('/x/a');
  });
});
