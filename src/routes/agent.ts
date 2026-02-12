/**
 * NW-AGENT v2.0 — Project Context Protocol (PCP) Reference Implementation
 * 
 * PCP is an open standard for exposing structured project context to AI agents.
 * MCP connects tools->models. A2A connects agents->agents. PCP connects projects->agents.
 * 
 * Spec: /PCP-SPEC.md | Discovery: /.well-known/pcp.json
 * 
 * PCP LEVEL 0 (Required):    GET  brief, rules
 * PCP LEVEL 1 (Core):        GET  context, health, files
 * PCP LEVEL 2 (Memory):      GET/POST tasks, memory, onboard, status, pulse
 * PCP LEVEL 3 (Actions):     POST actions, webhooks/github, notify + auth
 * 
 * All endpoints mounted at /api/pcp/* (legacy /api/agent/* still works)
 * Dashboard: /agent
 */
import { Hono } from 'hono'
import sentinelReport from '../../public/static/data/sentinel-report.json'

type Bindings = { GUILD_DB: D1Database; MARKET_CACHE: KVNamespace }

const router = new Hono<{ Bindings: Bindings }>()
const r = sentinelReport as any
const PCP_VERSION = '0.1'
const VERSION = '2.0.0'
const AGENT_NAME = 'nw-agent'

// ═══════════════════════════════════════════════════════════════
// PCP CORE — Metadata wrapper + KV helpers
// ═══════════════════════════════════════════════════════════════

function pcp(endpoint: string, data: any) {
  const json = JSON.stringify(data)
  return { _pcp: { version: PCP_VERSION, endpoint, tokens: Math.ceil(json.length / 4), generated_at: Date.now() }, ...data }
}

async function kvGet(kv: KVNamespace | undefined, key: string, fallback: any = null) {
  if (!kv) return fallback
  try { const raw = await kv.get(`pcp:${key}`); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}

async function kvSet(kv: KVNamespace | undefined, key: string, value: any, ttl = 86400 * 30) {
  if (!kv) return false
  try { await kv.put(`pcp:${key}`, JSON.stringify(value), { expirationTtl: ttl }); return true } catch { return false }
}

async function appendLog(kv: KVNamespace | undefined, entry: any) {
  const log = await kvGet(kv, 'log', [])
  log.unshift({ ...entry, ts: Date.now() })
  if (log.length > 100) log.length = 100
  await kvSet(kv, 'log', log)
}

function healthScore() { return r?.summary?.healthScore || 0 }
function healthGrade() { return r?.summary?.grade || '?' }
function weakest(n = 3) {
  return Object.entries(r?.modules || {}).map(([name, m]: [string, any]) => ({ name, score: m.score }))
    .sort((a: any, b: any) => a.score - b.score).slice(0, n)
}

// ═══════════════════════════════════════════════════════════════
// PCP LEVEL 0 — Required: brief + rules
// ═══════════════════════════════════════════════════════════════

router.get('/brief', (c) => c.json(pcp('brief', {
  project: { name: 'NumbahWan TCG', repo: '9tvf4k6srt-sys/NumbahWan-tcg', description: 'Browser-based TCG + guild warfare. Hono + Cloudflare Workers. 119 pages, zero frameworks.' },
  stack: { runtime: 'Cloudflare Workers', framework: 'Hono', language: 'TypeScript + Vanilla JS', deploy: 'Cloudflare Pages' },
  health: { score: healthScore(), grade: healthGrade(), critical: r?.summary?.critical || 0, weakest: weakest() },
  rules: [
    'Two brands (NW #ff6b00 + KINTSUGI #c9a84c) — NEVER merge aesthetics',
    'iPhone 375px — mobile-first always',
    'No emoji icons — SVG/WebP only',
    'EN/ZH/TH i18n on all NW pages',
    'Commit after every change, PR after every commit'
  ],
  entry_points: { context: '/api/pcp/context', rules: '/api/pcp/rules', health: '/api/pcp/health', onboard: '/api/pcp/onboard', dashboard: '/agent' }
})))

router.get('/rules', (c) => c.json(pcp('rules', {
  priority: 'MUST follow all rules. Breaking any = regression.',
  categories: {
    design: [
      { id: 'TWO_BRANDS', rule: 'NW (#ff6b00) and KINTSUGI (#c9a84c) never cross-contaminate', severity: 'critical' },
      { id: 'MOBILE_FIRST', rule: 'Owner reviews on iPhone 375px. Test mobile before desktop.', severity: 'critical' },
      { id: 'NO_EMOJI_ICONS', rule: 'Professional SVG/WebP only. Never emoji as UI icons.', severity: 'high' },
      { id: 'FONT_SIZES', rule: 'Only bump 9-13px to 11-15px. Never touch headings.', severity: 'medium' },
      { id: 'OVERFLOW_PROTECT', rule: 'Triple-layer overflow protection on images.', severity: 'medium' }
    ],
    i18n: [
      { id: 'NW_TRILINGUAL', rule: 'All NW pages: EN, ZH (Traditional), TH.', severity: 'critical' },
      { id: 'KINTSUGI_TRILINGUAL', rule: 'All KINTSUGI pages: EN, ZH (Traditional), JP.', severity: 'critical' },
      { id: 'I18N_REGISTER', rule: 'Every page with data-i18n must have NW_I18N.register().', severity: 'high' },
      { id: 'NO_HARDCODED_TEXT', rule: 'All user-facing text uses data-i18n attributes.', severity: 'high' }
    ],
    includes: [
      { id: 'NAV_REQUIRED', rule: 'nw-nav.js on every NW public page.', severity: 'high' },
      { id: 'I18N_CORE', rule: 'nw-i18n-core.js on every page with data-i18n.', severity: 'high' },
      { id: 'ICONS_BEFORE_UX', rule: 'nw-icons-inline.js must load before nw-ux.js.', severity: 'medium' },
      { id: 'VIEWPORT_META', rule: 'Every page needs viewport meta with width=device-width.', severity: 'medium' }
    ],
    code: [
      { id: 'MAX_FILE_LINES', rule: '500 lines per file max.', severity: 'medium' },
      { id: 'MAX_PAGE_SIZE', rule: '150KB per HTML page max.', severity: 'medium' },
      { id: 'COMMIT_EVERY_CHANGE', rule: 'git commit after every code modification.', severity: 'high' },
      { id: 'PR_EVERY_COMMIT', rule: 'Create/update PR after every commit.', severity: 'high' }
    ]
  }
})))

// ═══════════════════════════════════════════════════════════════
// PCP LEVEL 1 — Core: context + health + files
// ═══════════════════════════════════════════════════════════════

router.get('/context', (c) => {
  const modules = Object.entries(r?.modules || {}).map(([name, mod]: [string, any]) => ({
    name, score: mod.score, grade: mod.grade, issues: mod.issues?.length || 0,
    top_issues: (mod.issues || []).slice(0, 3).map((i: any) => ({ id: i.id, severity: i.severity, message: i.message }))
  }))
  return c.json(pcp('context', {
    identity: { name: 'NumbahWan TCG', repo: '9tvf4k6srt-sys/NumbahWan-tcg', branch: 'genspark_ai_developer',
      description: 'Browser-based TCG + guild warfare. Two brands (NW + KINTSUGI), trilingual, 119 pages, zero frameworks.' },
    stack: { runtime: 'Cloudflare Workers', framework: 'Hono', language: 'TypeScript + Vanilla JS', deploy: 'Cloudflare Pages',
      dev_server: 'npx wrangler pages dev ./dist --port 8788' },
    architecture: { entry_point: 'src/index.tsx', modules: 30,
      structure: { 'src/routes/*.ts': '30 route modules', 'src/routes/agent.ts': 'PCP reference implementation',
        'public/': '119 HTML pages + static assets', 'sentinel.cjs': 'NW-GUARDIAN v3.0 (codebase health)',
        'mycelium.cjs': 'Project memory core', 'bin/agent-brief.cjs': 'CLI agent brief tool' } },
    health: { score: healthScore(), grade: healthGrade(), modules },
    conventions: { style: 'Vanilla JS, no frameworks, single-file HTML pages', naming: 'kebab-case files, nw-* prefix for shared scripts',
      patterns: ['static HTML + JS hydration', 'Hono API routes', 'KV-backed persistence', 'sentinel health scoring'] },
    owner: { preferences: { mobile_first: true, two_brands: true, no_emoji_icons: true },
      review_device: 'iPhone 375px, iOS Safari', languages: ['EN', 'Traditional Chinese', 'Thai'] }
  }))
})

router.get('/health', (c) => c.json(pcp('health', {
  score: healthScore(), grade: healthGrade(),
  modules: Object.entries(r?.modules || {}).reduce((acc: any, [name, mod]: [string, any]) => {
    acc[name] = { score: mod.score, grade: mod.grade, issues: mod.issues?.length || 0,
      top_issues: (mod.issues || []).slice(0, 3).map((i: any) => ({ id: i.id, severity: i.severity, message: i.message })) }
    return acc
  }, {}),
  critical: (r?.issues || []).filter((i: any) => i.severity === 'critical'),
  actions: { heal: 'node sentinel.cjs --heal', scan: 'node sentinel.cjs', guard: 'node sentinel.cjs --guard' }
})))

router.get('/files', (c) => c.json(pcp('files', {
  structure: {
    'src/index.tsx': { description: 'Hono entrypoint', size: '3KB', hot: false },
    'src/routes/agent.ts': { description: 'PCP reference implementation', size: '18KB', hot: true },
    'src/routes/*.ts': { description: '30 route modules', size: 'varies', hot: false },
    'public/': { description: '119 HTML pages + static assets', size: '~5MB', hot: true },
    'sentinel.cjs': { description: 'NW-GUARDIAN v3.0 — codebase health', size: '97KB', hot: false },
    'mycelium.cjs': { description: 'Project memory core', size: '230KB', hot: false },
    'bin/agent-brief.cjs': { description: 'CLI agent brief tool', size: '8KB', hot: false },
    'tests/': { description: 'run-tests, smoke-test, nw-i18n-guard', size: '~20KB', hot: false },
    'AGENT-CONTEXT.md': { description: 'Agent onboarding doc', size: '12KB', hot: false },
    'PCP-SPEC.md': { description: 'Project Context Protocol specification', size: '15KB', hot: true }
  },
  stats: { total_files: 119, total_pages: r?.summary?.totalPages || 119, total_routes: 30 }
})))

// ═══════════════════════════════════════════════════════════════
// PCP LEVEL 2 — Memory: tasks, memory, onboard, status, pulse
// ═══════════════════════════════════════════════════════════════

router.get('/tasks', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const tasks = await kvGet(kv, 'tasks', [])
  const suggestions: any[] = []
  const criticals = (r?.issues || []).filter((i: any) => i.severity === 'critical')
  if (criticals.length > 0) suggestions.push({ priority: 'high', type: 'fix', desc: `Fix ${criticals.length} critical issue(s)`, items: criticals.slice(0, 5).map((i: any) => i.message || i.id) })
  const weak = Object.entries(r?.modules || {}).filter(([, m]: [string, any]) => m.score < 50).map(([n, m]: [string, any]) => `${n}(${m.score})`)
  if (weak.length > 0) suggestions.push({ priority: 'medium', type: 'improve', desc: `Improve weak modules: ${weak.join(', ')}` })
  const pending = tasks.filter((t: any) => t.status === 'pending')
  const inProgress = tasks.filter((t: any) => t.status === 'in_progress')
  const completed = tasks.filter((t: any) => t.status === 'completed')
  return c.json(pcp('tasks', { summary: { pending: pending.length, in_progress: inProgress.length, completed: completed.length, total: tasks.length }, pending, in_progress: inProgress, recently_completed: completed.slice(0, 5), suggestions }))
})

router.post('/tasks', async (c) => {
  const kv = c.env?.MARKET_CACHE
  if (!kv) return c.json({ ok: false, error: 'KV not available — memory endpoints require Cloudflare KV binding' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const { action } = body
  const tasks = await kvGet(kv, 'tasks', [])
  if (action === 'add') {
    const task = { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, desc: body.desc, priority: body.priority || 'medium', status: 'pending', created_at: Date.now(), source: body.source || 'agent' }
    tasks.push(task); await kvSet(kv, 'tasks', tasks); await appendLog(kv, { type: 'task_added', task: task.id, desc: task.desc })
    return c.json({ ok: true, task })
  }
  if (action === 'update' && body.id) {
    const idx = tasks.findIndex((t: any) => t.id === body.id)
    if (idx === -1) return c.json({ ok: false, error: 'Task not found' }, 404)
    if (body.status) tasks[idx].status = body.status
    if (body.status === 'completed') tasks[idx].completed_at = Date.now()
    if (body.status === 'in_progress') tasks[idx].started_at = Date.now()
    if (body.note) tasks[idx].note = body.note
    await kvSet(kv, 'tasks', tasks); await appendLog(kv, { type: 'task_updated', task: body.id, status: body.status })
    return c.json({ ok: true, task: tasks[idx] })
  }
  if (action === 'clear_completed') {
    const remaining = tasks.filter((t: any) => t.status !== 'completed')
    await kvSet(kv, 'tasks', remaining); return c.json({ ok: true, cleared: tasks.length - remaining.length, remaining: remaining.length })
  }
  return c.json({ ok: false, error: 'Invalid action. Use: add, update, clear_completed' }, 400)
})

router.get('/memory', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const memory = await kvGet(kv, 'memory', { learnings: [], decisions: [], blockers: [], sessions: [] })
  return c.json(pcp('memory', {
    learnings: memory.learnings.slice(0, 20), decisions: memory.decisions.slice(0, 20),
    blockers: memory.blockers.filter((b: any) => !b.resolved), sessions: memory.sessions.slice(0, 10),
    stats: { total_learnings: memory.learnings.length, total_decisions: memory.decisions.length,
      active_blockers: memory.blockers.filter((b: any) => !b.resolved).length, total_sessions: memory.sessions.length }
  }))
})

router.post('/memory', async (c) => {
  const kv = c.env?.MARKET_CACHE
  if (!kv) return c.json({ ok: false, error: 'KV not available' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const { type } = body
  const memory = await kvGet(kv, 'memory', { learnings: [], decisions: [], blockers: [], sessions: [] })
  if (type === 'learning') {
    const entry = { id: `l-${Date.now()}`, area: body.area, lesson: body.lesson, ts: Date.now(), source: body.source || 'agent' }
    memory.learnings.unshift(entry); if (memory.learnings.length > 100) memory.learnings.length = 100
    await kvSet(kv, 'memory', memory); await appendLog(kv, { type: 'learning_stored', area: body.area })
    return c.json({ ok: true, entry })
  }
  if (type === 'decision') {
    const entry = { id: `d-${Date.now()}`, context: body.context, decision: body.decision, reasoning: body.reasoning, ts: Date.now() }
    memory.decisions.unshift(entry); if (memory.decisions.length > 50) memory.decisions.length = 50
    await kvSet(kv, 'memory', memory); await appendLog(kv, { type: 'decision_stored', context: body.context })
    return c.json({ ok: true, entry })
  }
  if (type === 'blocker') {
    const entry = { id: `b-${Date.now()}`, desc: body.desc, area: body.area, resolved: false, ts: Date.now() }
    memory.blockers.unshift(entry); await kvSet(kv, 'memory', memory); await appendLog(kv, { type: 'blocker_added', area: body.area })
    return c.json({ ok: true, entry })
  }
  if (type === 'resolve_blocker' && body.id) {
    const blocker = memory.blockers.find((b: any) => b.id === body.id)
    if (blocker) { blocker.resolved = true; blocker.resolvedAt = Date.now(); blocker.resolution = body.resolution; await kvSet(kv, 'memory', memory); return c.json({ ok: true, blocker }) }
    return c.json({ ok: false, error: 'Blocker not found' }, 404)
  }
  if (type === 'session_start') {
    const session = { id: `s-${Date.now()}`, agent: body.agent || 'unknown', started_at: Date.now(), goals: body.goals || [], status: 'active' }
    memory.sessions.unshift(session); if (memory.sessions.length > 30) memory.sessions.length = 30
    await kvSet(kv, 'memory', memory); await appendLog(kv, { type: 'session_started', agent: body.agent })
    return c.json({ ok: true, session })
  }
  if (type === 'session_end' && body.id) {
    const session = memory.sessions.find((s: any) => s.id === body.id)
    if (session) { session.status = 'completed'; session.ended_at = Date.now(); session.summary = body.summary; await kvSet(kv, 'memory', memory); return c.json({ ok: true, session }) }
    return c.json({ ok: false, error: 'Session not found' }, 404)
  }
  return c.json({ ok: false, error: 'Invalid type. Use: learning, decision, blocker, resolve_blocker, session_start, session_end' }, 400)
})

router.post('/onboard', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const body = await c.req.json().catch(() => ({}))
  const agentName = body.agent || 'unknown'
  const goals = body.goals || []
  const memory = await kvGet(kv, 'memory', { learnings: [], decisions: [], blockers: [], sessions: [] })
  const session = { id: `s-${Date.now()}`, agent: agentName, started_at: Date.now(), goals, status: 'active' }
  memory.sessions.unshift(session); if (memory.sessions.length > 30) memory.sessions.length = 30
  await kvSet(kv, 'memory', memory); await appendLog(kv, { type: 'session_started', agent: agentName, goals })
  const tasks = await kvGet(kv, 'tasks', [])
  const pending = tasks.filter((t: any) => t.status === 'pending')
  const blockers = memory.blockers.filter((b: any) => !b.resolved)
  return c.json(pcp('onboard', {
    session: { id: session.id, agent: agentName },
    project: { name: 'NumbahWan TCG', repo: '9tvf4k6srt-sys/NumbahWan-tcg', stack: 'Hono + Cloudflare Workers + Vanilla JS',
      health: { score: healthScore(), grade: healthGrade(), critical: r?.summary?.critical || 0 } },
    rules: ['TWO BRANDS: NW (#ff6b00) + KINTSUGI (#c9a84c) — never cross-contaminate', 'MOBILE FIRST: Owner reviews on iPhone 375px',
      'NO EMOJI ICONS: Professional SVG/WebP only', 'I18N REQUIRED: EN/ZH/TH on NW, EN/ZH/JP on KINTSUGI', 'COMMIT AFTER EVERY CHANGE, PR AFTER EVERY COMMIT'],
    tasks: { pending: pending.slice(0, 10), blockers: blockers.slice(0, 5) },
    recent_learnings: memory.learnings.slice(0, 5).map((l: any) => `[${l.area}] ${l.lesson}`),
    tools: { guardian: 'node sentinel.cjs', heal: 'node sentinel.cjs --heal', guard: 'node sentinel.cjs --guard', test: 'node tests/run-tests.cjs' },
    endpoints: { brief: '/api/pcp/brief', context: '/api/pcp/context', tasks: '/api/pcp/tasks', memory: '/api/pcp/memory', actions: '/api/pcp/actions', status: '/api/pcp/status', dashboard: '/agent' },
    welcome: `Session ${session.id} started for ${agentName}. ${pending.length} tasks, ${blockers.length} blockers. Health: ${healthScore()}/100 (${healthGrade()}).`
  }))
})

router.get('/pulse', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const [tasks, alerts] = await Promise.all([kvGet(kv, 'tasks', []), kvGet(kv, 'alerts', [])])
  const pending = tasks.filter((t: any) => t.status === 'pending').length
  const unacked = alerts.filter((a: any) => !a.acknowledged).length
  const score = healthScore()
  return c.json({ status: unacked > 0 ? 'alert' : pending > 5 ? 'busy' : score < 50 ? 'degraded' : 'ok', score, pending, alerts: unacked, ts: Date.now() })
})

router.get('/status', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const [tasks, memory, alerts, log] = await Promise.all([
    kvGet(kv, 'tasks', []), kvGet(kv, 'memory', { learnings: [], decisions: [], blockers: [], sessions: [] }),
    kvGet(kv, 'alerts', []), kvGet(kv, 'log', [])
  ])
  const pendingTasks = tasks.filter((t: any) => t.status === 'pending')
  const activeBlockers = memory.blockers.filter((b: any) => !b.resolved)
  const unackedAlerts = alerts.filter((a: any) => !a.acknowledged)
  return c.json(pcp('status', {
    agent: AGENT_NAME, version: VERSION, pcp_version: PCP_VERSION, pcp_level: 3,
    status: activeBlockers.length > 0 ? 'blocked' : pendingTasks.length > 0 ? 'has_work' : 'idle',
    health: { score: healthScore(), grade: healthGrade(), critical: r?.summary?.critical || 0, weakest: weakest() },
    tasks: { pending: pendingTasks.length, in_progress: tasks.filter((t: any) => t.status === 'in_progress').length,
      next_up: pendingTasks.sort((a: any, b: any) => { const p: any = { high: 0, medium: 1, low: 2 }; return (p[a.priority] || 1) - (p[b.priority] || 1) }).slice(0, 3) },
    blockers: activeBlockers.slice(0, 5), alerts: unackedAlerts.slice(0, 5),
    memory: { learnings: memory.learnings.length, decisions: memory.decisions.length, recent_learning: memory.learnings[0], recent_decision: memory.decisions[0] },
    last_session: memory.sessions[0] ? { agent: memory.sessions[0].agent, started_at: memory.sessions[0].started_at, status: memory.sessions[0].status } : null,
    recent_activity: log.slice(0, 10)
  }))
})

router.get('/log', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const log = await kvGet(kv, 'log', [])
  return c.json(pcp('log', { entries: log.slice(0, parseInt(c.req.query('limit') || '50')), total: log.length }))
})

router.get('/alerts', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const alerts = await kvGet(kv, 'alerts', [])
  return c.json(pcp('alerts', { unacknowledged: alerts.filter((a: any) => !a.acknowledged), recent: alerts.slice(0, 20), total: alerts.length }))
})

router.post('/alerts/ack', async (c) => {
  const kv = c.env?.MARKET_CACHE
  if (!kv) return c.json({ ok: false, error: 'KV not available' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const alerts = await kvGet(kv, 'alerts', [])
  if (body.id) { const a = alerts.find((a: any) => a.id === body.id); if (a) { a.acknowledged = true; a.acked_at = Date.now() } }
  else if (body.all) alerts.forEach((a: any) => { a.acknowledged = true; a.acked_at = Date.now() })
  await kvSet(kv, 'alerts', alerts)
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════════
// PCP LEVEL 3 — Actions: commands, webhooks, notifications
// ═══════════════════════════════════════════════════════════════

const COMMANDS: Record<string, { desc: string; run: string }> = {
  'health.check': { desc: 'Run full health scan', run: 'node sentinel.cjs --json' },
  'health.heal': { desc: 'Auto-heal known issues', run: 'node sentinel.cjs --heal' },
  'health.guard': { desc: 'Run design + i18n guard', run: 'node sentinel.cjs --guard' },
  'i18n.check': { desc: 'Deep i18n validation', run: 'node tests/nw-i18n-guard.cjs' },
  'test.smoke': { desc: 'HTTP smoke test all pages', run: 'node tests/smoke-test.cjs' },
  'test.full': { desc: 'Full test suite', run: 'node tests/run-tests.cjs' },
  'deploy.preview': { desc: 'Deploy preview', run: 'node scripts/preview-deploy.cjs' },
  'build': { desc: 'Production build', run: 'npx vite build' },
  'context.refresh': { desc: 'Regen sentinel report', run: 'node sentinel.cjs --json > public/static/data/sentinel-report.json' }
}

router.post('/actions', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const body = await c.req.json().catch(() => ({}))
  const { command } = body
  if (!command) return c.json(pcp('actions', { available: Object.entries(COMMANDS).map(([name, cmd]) => ({ name, description: cmd.desc, command: cmd.run })), usage: 'POST /api/pcp/actions { "command": "health.check" }' }))
  const cmd = COMMANDS[command]
  if (!cmd) return c.json({ ok: false, error: `Unknown command: ${command}`, available: Object.keys(COMMANDS) }, 400)
  await appendLog(kv, { type: 'action_requested', command, by: body.agent || 'unknown' })
  if (command === 'health.check') return c.json({ ok: true, command, result: { score: healthScore(), grade: healthGrade(), issues: r?.issues?.length }, modules: Object.entries(r?.modules || {}).reduce((acc: any, [n, m]: [string, any]) => { acc[n] = { score: m.score, grade: m.grade }; return acc }, {}), note: 'Build-time cached. Run shell command for live.' })
  return c.json({ ok: true, command, description: cmd.desc, run: cmd.run, hint: 'Execute the "run" command in your shell.' })
})

router.post('/webhooks/github', async (c) => {
  const kv = c.env?.MARKET_CACHE
  try {
    const event = c.req.header('x-github-event') || 'unknown'
    const body = await c.req.json()
    const entry: any = { type: 'github_event', event, ts: Date.now() }
    if (event === 'push') {
      const commits = body.commits || []; const branch = (body.ref || '').replace('refs/heads/', '')
      entry.branch = branch; entry.commits = commits.length; entry.pusher = body.pusher?.name
      if (branch === 'main') {
        const tasks = await kvGet(kv, 'tasks', [])
        tasks.push({ id: `t-gh-${Date.now()}`, desc: `Review main push: ${commits.length} commit(s) by ${body.pusher?.name}`, priority: 'medium', status: 'pending', created_at: Date.now(), source: 'github-webhook' })
        await kvSet(kv, 'tasks', tasks)
      }
    }
    if (event === 'pull_request') {
      const pr = body.pull_request || {}; entry.action = body.action; entry.pr = { number: pr.number, title: pr.title }
      if (body.action === 'opened' || body.action === 'synchronize') {
        const tasks = await kvGet(kv, 'tasks', [])
        tasks.push({ id: `t-pr-${Date.now()}`, desc: `Review PR #${pr.number}: ${pr.title}`, priority: 'high', status: 'pending', created_at: Date.now(), source: 'github-webhook' })
        await kvSet(kv, 'tasks', tasks)
      }
    }
    if (event === 'issues') {
      const issue = body.issue || {}; entry.action = body.action; entry.issue = { number: issue.number, title: issue.title }
      if (body.action === 'opened') {
        const tasks = await kvGet(kv, 'tasks', [])
        tasks.push({ id: `t-iss-${Date.now()}`, desc: `Triage issue #${issue.number}: ${issue.title}`, priority: 'medium', status: 'pending', created_at: Date.now(), source: 'github-webhook' })
        await kvSet(kv, 'tasks', tasks)
      }
    }
    await appendLog(kv, entry)
    if (healthScore() < 60) {
      const alerts = await kvGet(kv, 'alerts', [])
      alerts.unshift({ id: `a-${Date.now()}`, type: 'health_warning', message: `Health ${healthScore()}/100 (${healthGrade()}). Run: node sentinel.cjs --heal`, ts: Date.now(), acknowledged: false })
      if (alerts.length > 50) alerts.length = 50; await kvSet(kv, 'alerts', alerts)
    }
    return c.json({ ok: true, event, processed: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 400) }
})

router.post('/notify', async (c) => {
  const kv = c.env?.MARKET_CACHE
  const body = await c.req.json().catch(() => ({}))
  const { channel, message, level } = body
  const alerts = await kvGet(kv, 'alerts', [])
  const alert: any = { id: `a-${Date.now()}`, type: level || 'info', message: message || 'No message', channel: channel || 'internal', ts: Date.now(), acknowledged: false }
  alerts.unshift(alert); if (alerts.length > 50) alerts.length = 50; await kvSet(kv, 'alerts', alerts)
  if (channel === 'discord' && body.webhookUrl) {
    try {
      const color = level === 'critical' ? 0xff4757 : level === 'warning' ? 0xffa502 : 0x2ed573
      await fetch(body.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [{ title: `PCP ${(level || 'info').toUpperCase()}`, description: message, color, footer: { text: `${AGENT_NAME} v${VERSION} (PCP ${PCP_VERSION})` }, timestamp: new Date().toISOString() }] }) })
      alert.delivered = true
    } catch (e: any) { alert.deliveryError = e.message }
  }
  await appendLog(kv, { type: 'notify', level, channel, message: message?.substring(0, 100) })
  return c.json({ ok: true, alert })
})

router.get('/diff', (c) => c.json(pcp('diff', {
  hint: 'Use: git log --oneline -10 for live diff. This is build-time snapshot.',
  trend: r?.trend ? { direction: r.trend.direction, delta: r.trend.delta, builds: r.trend.totalBuilds } : null
})))

// ═══════════════════════════════════════════════════════════════
// LEGACY ALIASES — /api/agent/* backward compatibility
// ═══════════════════════════════════════════════════════════════
// The dashboard and older integrations use /api/agent/* paths.
// These aliases ensure nothing breaks during the PCP migration.
// The router is mounted at /api/agent in index.tsx, so these
// /task and /act paths map to the old /api/agent/task, /api/agent/act URLs.

router.get('/task', async (c) => {
  const url = new URL(c.req.url); url.pathname = url.pathname.replace('/task', '/tasks')
  return c.redirect(url.pathname + url.search, 301)
})
router.post('/task', async (c) => {
  // Can't redirect POST, so duplicate the handler inline
  const kv = c.env?.MARKET_CACHE
  if (!kv) return c.json({ ok: false, error: 'KV not available' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const { action } = body
  const tasks = await kvGet(kv, 'tasks', [])
  if (action === 'add') {
    const task = { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, desc: body.desc, priority: body.priority || 'medium', status: 'pending', created_at: Date.now(), source: body.source || 'agent' }
    tasks.push(task); await kvSet(kv, 'tasks', tasks); return c.json({ ok: true, task })
  }
  if (action === 'update' && body.id) {
    const idx = tasks.findIndex((t: any) => t.id === body.id)
    if (idx === -1) return c.json({ ok: false, error: 'Task not found' }, 404)
    if (body.status) tasks[idx].status = body.status; if (body.note) tasks[idx].note = body.note
    await kvSet(kv, 'tasks', tasks); return c.json({ ok: true, task: tasks[idx] })
  }
  if (action === 'clear_completed') {
    const remaining = tasks.filter((t: any) => t.status !== 'completed')
    await kvSet(kv, 'tasks', remaining); return c.json({ ok: true, cleared: tasks.length - remaining.length })
  }
  return c.json({ ok: false, error: 'Invalid action' }, 400)
})
router.post('/act', async (c) => {
  // Legacy alias for /api/agent/act -> /api/pcp/actions
  const kv = c.env?.MARKET_CACHE
  const body = await c.req.json().catch(() => ({}))
  const { command } = body
  if (!command) return c.json({ agent: AGENT_NAME, available: Object.entries(COMMANDS).map(([name, cmd]) => ({ name, desc: cmd.desc, run: cmd.run })) })
  const cmd = COMMANDS[command]
  if (!cmd) return c.json({ ok: false, error: `Unknown command: ${command}`, available: Object.keys(COMMANDS) }, 400)
  await appendLog(kv, { type: 'action_requested', command, by: body.agent || 'unknown' })
  if (command === 'health.check') return c.json({ ok: true, command, result: { score: healthScore(), grade: healthGrade(), issues: r?.issues?.length }, modules: Object.entries(r?.modules || {}).reduce((acc: any, [n, m]: [string, any]) => { acc[n] = { score: m.score, grade: m.grade }; return acc }, {}) })
  return c.json({ ok: true, command, desc: cmd.desc, run: cmd.run, hint: 'Execute the "run" command in your shell.' })
})
router.post('/webhook/github', async (c) => {
  // Legacy alias — forward to new path
  const url = new URL(c.req.url); url.pathname = url.pathname.replace('/webhook/github', '/webhooks/github')
  return c.redirect(url.pathname, 307)
})

export default router
