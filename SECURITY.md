# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the maintainers or use GitHub's private vulnerability reporting feature
3. Include steps to reproduce and any relevant details

## Scope

This project runs on Cloudflare Workers. Security-relevant areas include:

- **API routes** (`src/routes/`) — input validation, injection
- **Oracle API** — prompt injection if LLM is enabled
- **D1 database** — SQL injection via wallet/card/auction endpoints
- **Static files** — no secrets should be in `public/`

## What We Already Do

- CSP headers on all responses
- X-Frame-Options, X-Content-Type-Options, HSTS
- No external runtime dependencies (nothing to supply-chain attack)
- `sentinel.cjs` security module checks for exposed secrets and unsafe patterns

## Supported Versions

Only the latest version on `main` is supported.
