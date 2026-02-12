# Project Context Protocol (PCP) — Specification v0.1

**Status**: Draft  
**Created**: 2026-02-12  
**Authors**: NumbahWan Guild  
**Reference Implementation**: [NW-AGENT](src/routes/agent.ts)

---

## Abstract

The Project Context Protocol (PCP) is an open standard for exposing structured project context to AI agents via HTTP. It solves a gap no existing protocol addresses: **how does an AI agent instantly understand a codebase it's never seen before?**

MCP connects tools to models. A2A connects agents to agents. PCP connects **projects to agents**.

## Problem Statement

When an AI agent (Claude, GPT, OpenClaw, Cursor, etc.) begins working on a codebase, it faces a cold-start problem:

1. **No project understanding** — it doesn't know the tech stack, conventions, or architecture
2. **No design rules** — it will break things the team has already learned not to break
3. **No health awareness** — it can't prioritize what needs fixing
4. **No memory continuity** — learnings from the last AI session are lost
5. **Token waste** — dumping an entire README/repo burns 50K-200K tokens for context that could be delivered in 300

PCP provides a standardized HTTP API that any project can implement so any AI agent can onboard in a single request.

## Design Principles

1. **Token-budget-aware** — Every endpoint declares its approximate token cost. Agents choose their detail level.
2. **Zero dependencies** — PCP is HTTP + JSON. No SDK required. `curl` is a valid client.
3. **Graduated detail** — Brief (~300 tokens) → Context (~2K) → Full (~8K). Agents control the depth.
4. **Agent-agnostic** — Works with Claude, GPT, Gemini, OpenClaw, Cursor, Copilot, or any HTTP-capable agent.
5. **Project-agnostic** — Works for any project in any language with any tools.
6. **Composable** — PCP works alongside MCP, A2A, agents.json. It fills a different gap.

## Relationship to Other Standards

| Standard | What it connects | PCP relationship |
|----------|-----------------|------------------|
| **MCP** (Anthropic) | Tools → Models | Complementary. MCP provides tool access; PCP provides project context. |
| **A2A** (Google) | Agent → Agent | Complementary. A2A handles agent coordination; PCP handles project understanding. |
| **agents.json** (Wildcard) | Discovery | Complementary. agents.json discovers agents; PCP discovers project state. |
| **Agent Protocol** (LangChain) | Orchestration | Complementary. Agent Protocol orchestrates runs; PCP provides the context for those runs. |
| **llms.txt** | Website → LLM | Similar intent but static markdown. PCP is dynamic, structured JSON with token budgets. |
| **ai-plugin.json** | Plugin manifest | PCP's discovery endpoint serves a similar role but richer. |

## Discovery

A PCP-compliant project MUST be discoverable via:

```
GET /.well-known/pcp.json
```

Response:
```json
{
  "pcp_version": "0.1",
  "project": "My Project",
  "base_url": "/api/pcp",
  "endpoints": {
    "brief": "/api/pcp/brief",
    "context": "/api/pcp/context",
    "health": "/api/pcp/health",
    "rules": "/api/pcp/rules",
    "files": "/api/pcp/files",
    "tasks": "/api/pcp/tasks",
    "memory": "/api/pcp/memory",
    "status": "/api/pcp/status",
    "onboard": "/api/pcp/onboard"
  },
  "capabilities": {
    "memory": true,
    "tasks": true,
    "actions": true,
    "webhooks": true,
    "auth": "bearer"
  },
  "token_budgets": {
    "brief": 500,
    "context": 3000,
    "onboard": 6000
  }
}
```

---

## Core Endpoints (REQUIRED)

### 1. `GET /api/pcp/brief` — Quick Context

**Purpose**: Minimum viable project understanding for any AI agent.  
**Token budget**: ~300-500 tokens  
**Auth**: Optional (recommended for write endpoints)

**Response Schema**:
```json
{
  "_pcp": {
    "version": "0.1",
    "endpoint": "brief",
    "tokens": 350
  },
  "project": {
    "name": "string",
    "repo": "string (owner/repo)",
    "description": "string (one sentence)"
  },
  "stack": {
    "runtime": "string",
    "framework": "string",
    "language": "string",
    "deploy": "string"
  },
  "health": {
    "score": "number (0-100)",
    "grade": "string (A+, A, B, C, D, F)",
    "critical": "number (count of critical issues)",
    "weakest": ["array of {name, score} — 3 weakest areas"]
  },
  "rules": ["array of string — top 5 hard rules"],
  "entry_points": {
    "context": "/api/pcp/context",
    "rules": "/api/pcp/rules",
    "onboard": "/api/pcp/onboard"
  }
}
```

**Requirements**:
- MUST respond in <100ms
- MUST fit within 500 tokens when serialized
- MUST include health score and top rules
- MUST include links to deeper endpoints

### 2. `GET /api/pcp/context` — Full Project Context

**Purpose**: Complete project understanding for a new session.  
**Token budget**: ~2,000-4,000 tokens

**Response Schema**:
```json
{
  "_pcp": {
    "version": "0.1",
    "endpoint": "context",
    "tokens": 2500
  },
  "identity": {
    "name": "string",
    "repo": "string",
    "branch": "string",
    "description": "string (2-3 sentences)"
  },
  "stack": {
    "runtime": "string",
    "framework": "string",
    "language": "string",
    "deploy": "string",
    "dev_server": "string (command to start)"
  },
  "architecture": {
    "entry_point": "string (main file path)",
    "structure": "object (key paths → descriptions)",
    "modules": "number (route/component count)"
  },
  "health": {
    "score": "number",
    "grade": "string",
    "modules": {
      "module_name": {
        "score": "number",
        "grade": "string",
        "issues": "number"
      }
    }
  },
  "conventions": {
    "style": "string (code style description)",
    "naming": "string (naming conventions)",
    "patterns": ["array of string — key patterns used"]
  },
  "owner": {
    "preferences": "object (key preferences)",
    "review_device": "string (primary device)",
    "languages": ["array of string"]
  }
}
```

### 3. `GET /api/pcp/health` — Project Health

**Purpose**: Machine-readable health scores across all measured dimensions.  
**Token budget**: ~1,000-2,000 tokens

**Response Schema**:
```json
{
  "_pcp": { "version": "0.1", "endpoint": "health" },
  "score": "number (0-100)",
  "grade": "string",
  "modules": {
    "module_name": {
      "score": "number",
      "grade": "string",
      "issues": "number",
      "top_issues": [{
        "id": "string",
        "severity": "critical | high | medium | low",
        "message": "string"
      }]
    }
  },
  "critical": ["array of critical issues"],
  "actions": {
    "heal": "string (command to auto-fix)",
    "scan": "string (command to full scan)",
    "guard": "string (command to validate)"
  }
}
```

### 4. `GET /api/pcp/rules` — Hard Constraints

**Purpose**: Rules that MUST NOT be broken. Regressions happen when agents ignore these.  
**Token budget**: ~500-1,500 tokens

**Response Schema**:
```json
{
  "_pcp": { "version": "0.1", "endpoint": "rules" },
  "priority": "MUST follow all rules. Breaking any = regression.",
  "categories": {
    "category_name": [{
      "id": "string (SCREAMING_SNAKE_CASE)",
      "rule": "string (one-sentence imperative)",
      "severity": "critical | high | medium"
    }]
  }
}
```

### 5. `GET /api/pcp/files` — File Map

**Purpose**: Key files, their purpose, and hotspots.  
**Token budget**: ~500-2,000 tokens

**Response Schema**:
```json
{
  "_pcp": { "version": "0.1", "endpoint": "files" },
  "structure": {
    "file_path": {
      "description": "string",
      "size": "string (e.g., '97KB')",
      "hot": "boolean (frequently changed/broken)"
    }
  },
  "stats": {
    "total_files": "number",
    "total_pages": "number",
    "total_routes": "number"
  }
}
```

---

## Memory Endpoints (RECOMMENDED)

### 6. `GET/POST /api/pcp/tasks` — Task Queue

**GET Response**:
```json
{
  "_pcp": { "version": "0.1", "endpoint": "tasks" },
  "summary": {
    "pending": "number",
    "in_progress": "number",
    "completed": "number"
  },
  "pending": [{ "id": "string", "desc": "string", "priority": "high|medium|low", "source": "string", "created_at": "number (epoch ms)" }],
  "suggestions": [{ "type": "fix|improve|test", "desc": "string", "priority": "string" }]
}
```

**POST Body** (add task):
```json
{
  "action": "add | update | clear_completed",
  "desc": "string",
  "priority": "high | medium | low",
  "source": "string (agent name)"
}
```

### 7. `GET/POST /api/pcp/memory` — Cross-Session Memory

**GET Response**:
```json
{
  "_pcp": { "version": "0.1", "endpoint": "memory" },
  "learnings": [{ "id": "string", "area": "string", "lesson": "string", "ts": "number" }],
  "decisions": [{ "id": "string", "context": "string", "decision": "string", "reasoning": "string", "ts": "number" }],
  "blockers": [{ "id": "string", "desc": "string", "area": "string", "resolved": "boolean" }],
  "stats": {
    "total_learnings": "number",
    "total_decisions": "number",
    "active_blockers": "number",
    "total_sessions": "number"
  }
}
```

**POST Body** (store memory):
```json
{
  "type": "learning | decision | blocker | resolve_blocker | session_start | session_end",
  "area": "string",
  "lesson": "string",
  "source": "string (agent name)"
}
```

---

## Action Endpoints (OPTIONAL)

### 8. `POST /api/pcp/onboard` — One-Shot Bootstrap

**Purpose**: Single call that gives a new agent everything it needs to start working.  
**Token budget**: ~4,000-8,000 tokens

**POST Body**:
```json
{
  "agent": "string (agent identifier)",
  "goals": ["array of string"]
}
```

**Response**: Combines brief + rules + pending tasks + recent learnings + tool commands + session ID.

### 9. `GET /api/pcp/status` — Full Status Snapshot

**Purpose**: Everything at a glance — health, tasks, blockers, alerts, memory, recent activity.

### 10. `GET /api/pcp/pulse` — Lightweight Heartbeat

**Purpose**: Dashboard auto-refresh, monitoring. <200 bytes.

**Response**:
```json
{
  "status": "ok | alert | busy | degraded",
  "score": "number",
  "pending": "number",
  "alerts": "number",
  "ts": "number (epoch ms)"
}
```

### 11. `POST /api/pcp/actions` — Structured Commands

**Purpose**: List and trigger project-specific commands.

**Response** (no command):
```json
{
  "available": [{
    "name": "string (dot-notation, e.g., health.check)",
    "description": "string",
    "command": "string (shell command to run)"
  }]
}
```

### 12. `POST /api/pcp/webhooks/github` — Event Listener

**Purpose**: Auto-create tasks from GitHub events.  
**Security**: MUST validate `x-hub-signature-256` HMAC.

### 13. `POST /api/pcp/notify` — Proactive Alerts

**Purpose**: Push notifications to external channels (Discord, Slack, etc.).

---

## Authentication

PCP implementations SHOULD support at least one auth method:

| Method | Header | Use Case |
|--------|--------|----------|
| None | — | Local dev, trusted networks |
| Bearer token | `Authorization: Bearer <token>` | Production APIs |
| API key | `X-PCP-Key: <key>` | Simple deployments |
| HMAC (webhooks) | `X-Hub-Signature-256: sha256=<hash>` | GitHub webhooks |

Read endpoints (`GET`) MAY be unauthenticated.  
Write endpoints (`POST`) SHOULD require authentication.

---

## Token Budget Convention

Every PCP response MUST include a `_pcp` metadata object:

```json
{
  "_pcp": {
    "version": "0.1",
    "endpoint": "brief",
    "tokens": 350,
    "generated_at": "number (epoch ms)"
  }
}
```

The `tokens` field is an **estimate** (JSON bytes / 4). Agents use this to decide if they can afford to ingest the response within their context window.

## Compliance Levels

| Level | Requirements |
|-------|-------------|
| **PCP Level 0** | `/.well-known/pcp.json` + `/brief` + `/rules` |
| **PCP Level 1** | Level 0 + `/context` + `/health` + `/files` |
| **PCP Level 2** | Level 1 + `/tasks` + `/memory` + `/onboard` |
| **PCP Level 3** | Level 2 + `/actions` + `/webhooks` + `/notify` + auth |

---

## Implementation Checklist

```
[ ] GET  /.well-known/pcp.json     — Discovery manifest
[ ] GET  /api/pcp/brief            — Quick context (Level 0)
[ ] GET  /api/pcp/rules            — Hard constraints (Level 0)
[ ] GET  /api/pcp/context          — Full context (Level 1)
[ ] GET  /api/pcp/health           — Health scores (Level 1)
[ ] GET  /api/pcp/files            — File map (Level 1)
[ ] GET  /api/pcp/tasks            — Task queue (Level 2)
[ ] POST /api/pcp/tasks            — Add/update tasks (Level 2)
[ ] GET  /api/pcp/memory           — Cross-session memory (Level 2)
[ ] POST /api/pcp/memory           — Store learnings (Level 2)
[ ] POST /api/pcp/onboard          — One-shot bootstrap (Level 2)
[ ] GET  /api/pcp/status           — Full status (Level 2)
[ ] GET  /api/pcp/pulse            — Heartbeat (Level 2)
[ ] POST /api/pcp/actions          — Structured commands (Level 3)
[ ] POST /api/pcp/webhooks/github  — GitHub events (Level 3)
[ ] POST /api/pcp/notify           — External alerts (Level 3)
[ ] Auth on write endpoints        — Bearer / API key (Level 3)
```

---

## Example: Agent Workflow Using PCP

```
# 1. Discover PCP support
curl https://myproject.dev/.well-known/pcp.json

# 2. Quick brief (is this worth a deeper look?)
curl https://myproject.dev/api/pcp/brief
# → 350 tokens: name, stack, health 76/B, top 5 rules

# 3. Full onboard (start a session)
curl -X POST https://myproject.dev/api/pcp/onboard \
  -H 'Content-Type: application/json' \
  -d '{"agent": "claude", "goals": ["fix i18n gaps"]}'
# → 6K tokens: project context + rules + pending tasks + recent learnings

# 4. Do work, store learnings
curl -X POST https://myproject.dev/api/pcp/memory \
  -H 'Content-Type: application/json' \
  -d '{"type": "learning", "area": "i18n", "lesson": "TH translations missing from 12 pages"}'

# 5. Check pulse (monitoring)
curl https://myproject.dev/api/pcp/pulse
# → 50 bytes: { "status": "ok", "score": 82, "pending": 3 }
```

---

## FAQ

**Q: How is PCP different from just reading the README?**  
A: READMEs are unstructured markdown averaging 5K-50K tokens. PCP is structured JSON with graduated detail levels starting at 300 tokens. An agent can get project understanding in one API call without parsing prose.

**Q: How is PCP different from llms.txt?**  
A: llms.txt is static, human-authored, and opinionated. PCP is dynamic (reflects real-time health scores, pending tasks, recent changes), machine-readable, and has a memory layer for cross-session continuity.

**Q: How is PCP different from MCP?**  
A: MCP connects tools and data sources to LLMs. PCP gives LLMs project understanding. They're complementary — use MCP to give your agent access to a database, use PCP to tell it what the database schema means in this project's context.

**Q: Can I implement PCP without a server?**  
A: Yes. A static `pcp.json` file served at `/.well-known/pcp.json` with pre-generated JSON files for each endpoint is a valid Level 1 implementation. No server logic required.

**Q: What if my project doesn't have health scores?**  
A: The `health` field can return `{ "score": null, "grade": "unscored" }`. PCP doesn't require any specific health tooling — it just provides a standard place to expose whatever health data you have.

---

*PCP is an open specification. Contributions welcome.*
