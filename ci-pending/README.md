# Pending CI workflow — one manual step

`ci.yml` here is the project's CI workflow. It is **not** auto-installed because
the GitHub App token used by the automation lacks the `workflows` permission, so
it is not allowed to create or update files under `.github/workflows/`.

To activate CI, a human (or a token with `workflow` scope) needs to move it:

```bash
mkdir -p .github/workflows
git mv ci-pending/ci.yml .github/workflows/ci.yml
git rm ci-pending/README.md
git commit -m "ci: activate CI workflow"
git push
```

## What the workflow does

Two jobs, kept deliberately separate and honest:

- **test** (hard gate) — `npm ci` then `vitest run --coverage`. A red test or a
  coverage drop fails the build. This is the contract the test suite enforces.
- **audit** (advisory, `continue-on-error`) — the AI-tell text + layout linters,
  the typecheck, and the two integration tests (`RUN_INTEGRATION=1`). These run
  across the whole repo, which still carries a pre-existing backlog, so they
  report signal without failing the build. As the backlog is paid down, steps
  graduate from `audit` into the hard gate.
