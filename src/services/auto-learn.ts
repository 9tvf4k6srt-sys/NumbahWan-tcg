import type { LogEntry, Pattern, Improvement, PatchNote, SystemHealth, CronJob } from './auto-learn-types';
import { LEARN_CACHE_KEYS, KNOWN_PATTERNS, CODE_QUALITY_RULES } from './auto-learn-types';
export type { LogEntry, Pattern, Improvement, PatchNote, SystemHealth, CronJob };
export { LEARN_CACHE_KEYS, KNOWN_PATTERNS, CODE_QUALITY_RULES };

// LOG ANALYZER

export async function analyzeLog(
  cache: KVNamespace,
  entry: LogEntry
): Promise<{ patterns: Pattern[]; improvements: Improvement[] }> {
  const matchedPatterns: Pattern[] = [];
  const suggestedImprovements: Improvement[] = [];

  // Check against known patterns
  for (const knownPattern of KNOWN_PATTERNS) {
    const regex = new RegExp(knownPattern.regex, 'i');
    if (regex.test(entry.message)) {
      const pattern: Pattern = {
        ...knownPattern,
        occurrences: 1,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp
      };
      matchedPatterns.push(pattern);

      // Generate improvement suggestion
      if (knownPattern.autoFix && knownPattern.status === 'active') {
        suggestedImprovements.push({
          id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'bug_fix',
          title: `Fix: ${knownPattern.name}`,
          description: knownPattern.description,
          suggestion: knownPattern.autoFix,
          priority: entry.level === 'error' ? 'high' : 'medium',
          status: 'pending',
          createdAt: Date.now(),
          autoApplied: false
        });
      }
    }
  }

  // Store log entry
  await storeLogEntry(cache, entry);

  // Update pattern statistics
  for (const pattern of matchedPatterns) {
    await updatePatternStats(cache, pattern);
  }

  // Store improvements
  for (const improvement of suggestedImprovements) {
    await storeImprovement(cache, improvement);
  }

  return { patterns: matchedPatterns, improvements: suggestedImprovements };
}

// STORAGE FUNCTIONS

async function storeLogEntry(cache: KVNamespace, entry: LogEntry): Promise<void> {
  try {
    const key = `${LEARN_CACHE_KEYS.LOGS}:${new Date().toISOString().split('T')[0]}`;
    const existing = await cache.get(key);
    const logs: LogEntry[] = existing ? JSON.parse(existing) : [];

    logs.push(entry);

    // Keep last 1000 logs per day
    if (logs.length > 1000) {
      logs.shift();
    }

    await cache.put(key, JSON.stringify(logs), { expirationTtl: 7 * 24 * 60 * 60 }); // 7 days
  } catch (e) {
    console.error('Failed to store log entry:', e);
  }
}

async function updatePatternStats(cache: KVNamespace, pattern: Pattern): Promise<void> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.PATTERNS);
    const patterns: Record<string, Pattern> = existing ? JSON.parse(existing) : {};

    if (patterns[pattern.id]) {
      patterns[pattern.id].occurrences++;
      patterns[pattern.id].lastSeen = pattern.lastSeen;
    } else {
      patterns[pattern.id] = pattern;
    }

    await cache.put(LEARN_CACHE_KEYS.PATTERNS, JSON.stringify(patterns));
  } catch (e) {
    console.error('Failed to update pattern stats:', e);
  }
}

async function storeImprovement(cache: KVNamespace, improvement: Improvement): Promise<void> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.IMPROVEMENTS);
    const improvements: Improvement[] = existing ? JSON.parse(existing) : [];

    // Avoid duplicates
    const exists = improvements.some(i =>
      i.title === improvement.title && i.status === 'pending'
    );

    if (!exists) {
      improvements.push(improvement);
      await cache.put(LEARN_CACHE_KEYS.IMPROVEMENTS, JSON.stringify(improvements));
    }
  } catch (e) {
    console.error('Failed to store improvement:', e);
  }
}

// PATCH NOTES GENERATOR

export async function generatePatchNotes(
  cache: KVNamespace,
  version: string
): Promise<PatchNote> {
  const improvements = await getImprovements(cache, 'applied');
  const recentLogs = await getRecentLogs(cache, 24 * 60 * 60 * 1000); // Last 24h

  const changes: PatchNote['changes'] = [];

  // Add applied improvements
  for (const imp of improvements) {
    if (imp.appliedAt && imp.appliedAt > Date.now() - 7 * 24 * 60 * 60 * 1000) {
      changes.push({
        type: imp.type === 'bug_fix' ? 'fix' :
              imp.type === 'performance' ? 'improvement' :
              imp.autoApplied ? 'auto_update' : 'feature',
        title: imp.title,
        description: imp.description,
        automated: imp.autoApplied
      });
    }
  }

  // Analyze resolved issues from logs
  const resolvedPatterns = recentLogs.filter(l => l.resolved);
  for (const log of resolvedPatterns.slice(0, 5)) {
    changes.push({
      type: 'fix',
      title: `Resolved: ${log.source}`,
      description: log.resolution || log.message,
      automated: false
    });
  }

  const patchNote: PatchNote = {
    version,
    date: new Date().toISOString().split('T')[0],
    changes
  };

  // Store patch notes
  await storePatchNote(cache, patchNote);

  return patchNote;
}

async function storePatchNote(cache: KVNamespace, note: PatchNote): Promise<void> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.PATCH_NOTES);
    const notes: PatchNote[] = existing ? JSON.parse(existing) : [];

    notes.unshift(note);

    // Keep last 50 versions
    if (notes.length > 50) {
      notes.pop();
    }

    await cache.put(LEARN_CACHE_KEYS.PATCH_NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to store patch note:', e);
  }
}

// QUERY FUNCTIONS

export async function getImprovements(
  cache: KVNamespace,
  status?: Improvement['status']
): Promise<Improvement[]> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.IMPROVEMENTS);
    const improvements: Improvement[] = existing ? JSON.parse(existing) : [];

    if (status) {
      return improvements.filter(i => i.status === status);
    }
    return improvements;
  } catch {
    return [];
  }
}

export async function getPatterns(cache: KVNamespace): Promise<Pattern[]> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.PATTERNS);
    const patterns: Record<string, Pattern> = existing ? JSON.parse(existing) : {};
    return Object.values(patterns);
  } catch {
    return [];
  }
}

export async function getRecentLogs(
  cache: KVNamespace,
  timeRange: number = 24 * 60 * 60 * 1000
): Promise<LogEntry[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `${LEARN_CACHE_KEYS.LOGS}:${today}`;
    const existing = await cache.get(key);
    const logs: LogEntry[] = existing ? JSON.parse(existing) : [];

    const cutoff = Date.now() - timeRange;
    return logs.filter(l => l.timestamp > cutoff);
  } catch {
    return [];
  }
}

export async function getPatchNotes(cache: KVNamespace): Promise<PatchNote[]> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.PATCH_NOTES);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

// SYSTEM HEALTH TRACKING

export { trackHealth, getCronJobs, updateCronJob, executeCronHandler, applyImprovement, generateSystemSummary, DEFAULT_CRON_JOBS } from './auto-learn-system';
