'use strict';

/**
 * recursion-guard.cjs — the SAFEGUARDS layer of the RCOF proposal, the only
 * part of it that is pure engineering (no model training, so it's real for a
 * frozen-model + repo stack).
 *
 * The proposal's words: "Bounded maximum recursion depth with explicit escape
 * valves; … noise-to-meaning style monitoring for uncontrolled complexity
 * growth." Our recursive tools (learn-loop, optimize-loop, agent-loop, the
 * miner's every-N-commits re-mine) recurse with NO explicit ceiling today. A
 * runaway loop (a self-correction that never converges, a re-mine that triggers
 * a re-mine) would burn tokens/credits silently. This module is the brake.
 *
 * It is deliberately tiny and synchronous — a guard you can drop into any loop:
 *
 *   const { RecursionGuard } = require('../tools/lib/recursion-guard.cjs');
 *   const g = new RecursionGuard({ maxDepth: 5, label: 'optimize-apply' });
 *   while (notDone) {
 *     g.enter();              // throws GuardTripped past the ceiling
 *     ... do one step ...
 *     if (g.shouldEscape(progress)) break;  // explicit escape valve
 *     g.exit();
 *   }
 *
 * Honesty rule (inherited from the rest of the stack): the guard never silently
 * swallows a runaway. When it trips it throws a typed error AND appends a
 * structured record to the audit trail, so a stuck loop is loud, not hidden.
 */

const fs = require('fs');
const path = require('path');

let repoRoot;
try {
  ({ repoRoot } = require('./aitell-common.cjs'));
} catch {
  repoRoot = () => path.resolve(__dirname, '..', '..');
}

// Defaults are conservative. A loop that legitimately needs more passes one in
// explicitly — making the bound a deliberate decision, never an accident.
const DEFAULTS = {
  maxDepth: 5, // hard ceiling on nesting / iterations
  // "noise-to-meaning": if this many consecutive steps make no measurable
  // progress, the loop is spinning — escape rather than burn more budget.
  maxStaleSteps: 3,
};

const AUDIT_PATH = path.join(repoRoot(), '.mycelium', 'recursion-audit.jsonl');

class GuardTripped extends Error {
  constructor(message, info) {
    super(message);
    this.name = 'GuardTripped';
    this.info = info || {};
  }
}

function appendAudit(record) {
  try {
    const dir = path.dirname(AUDIT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_PATH, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n');
  } catch {
    /* audit is best-effort; a failed write must never crash the guarded loop */
  }
}

class RecursionGuard {
  /**
   * @param {object} opts
   * @param {number} [opts.maxDepth=5]      hard ceiling (throws past it)
   * @param {number} [opts.maxStaleSteps=3] consecutive no-progress steps before escape
   * @param {string} [opts.label]           name for the audit trail
   * @param {boolean}[opts.audit=true]      write trips/escapes to the audit log
   */
  constructor(opts = {}) {
    this.maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : DEFAULTS.maxDepth;
    this.maxStaleSteps = Number.isFinite(opts.maxStaleSteps) ? opts.maxStaleSteps : DEFAULTS.maxStaleSteps;
    this.label = opts.label || 'unlabelled';
    this.audit = opts.audit !== false;
    this.depth = 0;
    this.maxReached = 0;
    this.staleSteps = 0;
    this._lastProgress = null;
    this.tripped = false;
  }

  // Enter one level. Throws GuardTripped when it would exceed the ceiling —
  // the escape valve of last resort (a bound that cannot be silently passed).
  enter() {
    this.depth++;
    if (this.depth > this.maxReached) this.maxReached = this.depth;
    if (this.depth > this.maxDepth) {
      this.tripped = true;
      const info = { label: this.label, depth: this.depth, maxDepth: this.maxDepth, reason: 'maxDepth' };
      if (this.audit) appendAudit({ event: 'trip', ...info });
      throw new GuardTripped(
        `recursion-guard[${this.label}]: depth ${this.depth} exceeded maxDepth ${this.maxDepth}`,
        info,
      );
    }
    return this.depth;
  }

  // Leave one level.
  exit() {
    if (this.depth > 0) this.depth--;
    return this.depth;
  }

  /**
   * The "noise-to-meaning" escape valve. Pass a progress signal each step (a
   * number that should improve, or a comparable token). If it doesn't change
   * for maxStaleSteps in a row, the loop is spinning — return true so the
   * caller can break cleanly instead of recursing forever.
   * @param {number|string} progress  a value that should change when real work happens
   * @returns {boolean} true when the loop should escape (no meaningful progress)
   */
  shouldEscape(progress) {
    if (this._lastProgress !== null && progress === this._lastProgress) {
      this.staleSteps++;
    } else {
      this.staleSteps = 0;
    }
    this._lastProgress = progress;
    if (this.staleSteps >= this.maxStaleSteps) {
      const info = {
        label: this.label,
        staleSteps: this.staleSteps,
        maxStaleSteps: this.maxStaleSteps,
        reason: 'noProgress',
      };
      if (this.audit) appendAudit({ event: 'escape', ...info });
      return true;
    }
    return false;
  }

  // Snapshot of guard state — for callers that want to report it honestly.
  state() {
    return {
      label: this.label,
      depth: this.depth,
      maxReached: this.maxReached,
      maxDepth: this.maxDepth,
      staleSteps: this.staleSteps,
      maxStaleSteps: this.maxStaleSteps,
      tripped: this.tripped,
    };
  }
}

function readAudit() {
  try {
    return fs
      .readFileSync(AUDIT_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = { RecursionGuard, GuardTripped, readAudit, AUDIT_PATH, DEFAULTS };
