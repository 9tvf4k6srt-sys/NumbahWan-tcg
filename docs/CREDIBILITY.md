# Evidence, scope, and limitations

A result is meaningful only with its command, environment, and exclusions.
This page separates current measurements from historical claims. It is not a
self-assigned engineering score.

## Local verification: 2026-09-07

Environment: Linux, Node.js v22.23.2, installed repository dependencies.
The initial workspace contained existing application/generated-file changes;
they are not part of the orchestration implementation.

| Check | Command | Observed result | Scope |
|---|---|---|---|
| Orchestration regression | `node --test tests/orchestration.test.cjs` | 48 passed, 0 failed | Offline assertions plus real subprocess boundary tests; no LLM |
| Runnable demonstration | `node bin/orchestrator.cjs --demo --json` | 3 subprocesses; `awaiting_review` | Synthetic tasks, no file writes or model calls |
| Existing unit suite baseline | `npm run test:unit` | 263 passed, 2 skipped, 23 files | Application/tooling tests; not the separate Node orchestration suite |
| Root TypeScript | `npm run typecheck` | Exit 0 | Root `src/` scope; not every independent subproject |
| Context/doctrine checks | `npm run eval` | Exit 0; 21/21 doctrine checks | File-derived context estimates and mechanical consistency, not model outcomes |
| Full integration suite without server | `npm test` | Exit 1; 29 failures | Includes HTTP checks; no app server was running. Not reported as passing |
| Whole-workspace ship gate | `npm run ship` | Blocked on pre-existing `public/example-cinematic.html` i18n failure | 15 orphaned keys; the unrelated page was preserved, not fixed or added to this PR |

The orchestration suite is wired into `bin/ship-gate.cjs`, which the existing
[PR Gate workflow](../.github/workflows/pr-gate.yml) invokes. A workflow's
existence is not proof that a particular commit passed; inspect that commit's
[Actions run](https://github.com/9tvf4k6srt-sys/NumbahWan-tcg/actions/workflows/pr-gate.yml).
No workflow-permission change or manual CI installation is needed for this
added gate.

## What the reliability suite actually checks

The tests are in [`tests/orchestration.test.cjs`](../tests/orchestration.test.cjs).
They use the same [`workflow-runtime.cjs`](../tools/lib/workflow-runtime.cjs)
as the real factory, not a separately implemented demonstration engine.

- **Graph integrity:** missing dependencies, cycles, duplicate IDs and unknown
  tools fail before execution; unsorted DAGs still respect dependencies.
- **Outcome integrity:** nonzero exits remain failures even if stdout says
  `PASS`; malformed results and rejected output contracts cannot become success.
- **Failure propagation:** exhaustive enumeration of all 16 failure subsets of
  a four-check fan-out; final dependent work runs only when all checks succeed.
- **Bounded work:** exact retry counts, permanent-failure non-retry, shared call
  budgets, deadlines, cancellation and combined subprocess output bounds.
- **Scheduling:** concurrent readers, bounded fan-out, and writer exclusion.
- **Authority boundaries:** literal shell metacharacters, spec-path traversal
  and symlink escape rejection, no implicit execution, no deploy capability.
- **Evidence hygiene:** contiguous event sequence numbers, one terminal event,
  observer isolation and omission of raw input/output from receipts.

Dependency and verdict tests inject controlled tool results. Process tests
launch real Node children. Both are useful; neither substitutes for a full
production run of page generation and its downstream checks.

### Reproduce without installing anything

```bash
node --test tests/orchestration.test.cjs
node bin/orchestrator.cjs --demo --json
```

### Broader checks with dependencies

```bash
npm ci
npm run test:unit
npm run typecheck
npm run eval
npm run ship
```

The factory's real `--execute` mode mutates the local worktree and may encounter
existing quality debt. Inspect the plan and use a disposable worktree. It was
not used to regenerate user pages during this hardening pass.

## What these results do not establish

- No measured model-quality improvement, hiring outcome, production SLO, or
  superiority to other agent frameworks.
- No throughput/latency benchmark: concurrent read scheduling is tested as a
  behavior, not advertised as a speedup.
- No claimed dollar or billed-token savings from the new runtime. The existing
  context-cost script estimates document tokens; estimates are not invoices.
- No crash-safe resume, exactly-once writes, signed audit log, OS sandbox, or
  authenticated approval system. See the
  [trust boundaries](../ARCHITECTURE.md#factory-workflow-control-plane).
- No production build/deployment or live paid model eval was run for this pass.
  The game UI was not changed or browser-tested.

## Model evals are a separate evidence layer

[`evals/outcome-eval.cjs`](../evals/outcome-eval.cjs) asks repo-memory questions
with and without a briefing and grades answers mechanically. Its dry run can
be inspected without provider access:

```bash
npm run eval:outcome:dry
```

A future model-quality claim needs fresh successful provider responses,
recorded model/configuration, repeated paired trials, a held-out task set,
uncertainty estimates, actual usage, and review for leakage or grader exploits.
Passing deterministic regression tests is not a replacement for that evidence.

This distinction follows the regression-vs-capability and outcome-vs-transcript
separation in [Anthropic's January 2026 agent-evaluation guidance (engineering index)](https://www.anthropic.com/engineering).

## Historical measurements are not current guarantees

The prior version of this page recorded June 2026 counts and referred to a
`ci.yml` workflow and README badge that are absent from this checkout. Those
statements have been replaced by the commands above, not silently treated as
fresh evidence. Git history preserves that earlier report and the root
TypeScript scoping investigation.

Likewise, the earlier learning-system scores and the audits that prompted the
standalone [mycelium redesign](https://github.com/9tvf4k6srt-sys/mycelium) are
historical evidence. A cached score or heartbeat is not an observed successful
run. If code and prose disagree, rerun the check and correct the claim.
