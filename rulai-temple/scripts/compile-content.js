#!/usr/bin/env node
/**
 * compile-content.js
 * 
 * Reads all content/*.md files and generates src/content-data.ts
 * 
 * Markdown format: standard tables with | delimiters
 * H2 (##) = section group, H3 (###) = item within group
 * 
 * Run: npm run content
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const CONTENT_DIR = join(import.meta.dirname, '..', 'content');
const OUTPUT = join(import.meta.dirname, '..', 'src', 'content-data.ts');

// Parse a markdown table into array of objects
function parseTable(lines) {
  if (lines.length < 3) return []; // need header + separator + at least 1 row
  const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
  // skip separator line (lines[1])
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length === 0) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// Parse a markdown file into structured sections
function parseMarkdown(content) {
  const result = { _title: '', sections: {} };
  let currentH2 = null;
  let currentH3 = null;
  let tableLines = [];

  const flushTable = () => {
    if (tableLines.length === 0) return;
    const table = parseTable(tableLines);
    if (table.length === 0) { tableLines = []; return; }

    const target = currentH3
      ? (result.sections[currentH2].items[currentH3] = result.sections[currentH2].items[currentH3] || [])
      : (result.sections[currentH2] = result.sections[currentH2] || { tables: [], items: {} });

    if (currentH3) {
      result.sections[currentH2].items[currentH3].push(table);
    } else {
      if (!result.sections[currentH2].tables) result.sections[currentH2].tables = [];
      result.sections[currentH2].tables.push(table);
    }
    tableLines = [];
  };

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      flushTable();
      result._title = trimmed.slice(2).trim();
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushTable();
      currentH2 = trimmed.slice(3).trim();
      currentH3 = null;
      if (!result.sections[currentH2]) result.sections[currentH2] = { tables: [], items: {} };
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushTable();
      currentH3 = trimmed.slice(4).trim();
      if (currentH2 && !result.sections[currentH2].items) result.sections[currentH2].items = {};
      if (currentH2) result.sections[currentH2].items[currentH3] = [];
      continue;
    }

    if (trimmed.startsWith('|')) {
      tableLines.push(trimmed);
    } else {
      flushTable();
    }
  }
  flushTable();
  return result;
}

// Convert parsed table rows to key-value object
function tablesToKV(tables) {
  const kv = {};
  for (const table of tables) {
    for (const row of table) {
      if (row.Key && row.Value !== undefined) {
        kv[row.Key] = row.Value;
      } else if (row.Key) {
        // Trilingual row
        const entry = {};
        for (const [k, v] of Object.entries(row)) {
          if (k !== 'Key') entry[k] = v;
        }
        kv[row.Key] = entry;
      }
    }
  }
  return kv;
}

// Process site.md
function processSite(parsed) {
  const meta = tablesToKV(parsed.sections['Metadata']?.tables || []);
  const langs = (parsed.sections['Languages']?.tables?.[0] || []).map(r => ({ code: r.Code, label: r.Label }));
  const nav = (parsed.sections['Navigation']?.tables?.[0] || []).map(r => ({
    id: r.id, zh: r.zh, en: r.en, th: r.th
  }));
  const fonts = {}; // parsed from text, not tables
  const scripts = (parsed.sections['External Scripts']?.tables?.[0] || []).map(r => ({
    library: r.Library, url: r['CDN URL']
  }));
  const footer = tablesToKV(parsed.sections['Footer']?.tables || []);
  return { meta, langs, nav, scripts, footer };
}

// Process hero.md
function processHero(parsed) {
  const logo = tablesToKV(parsed.sections['Logo']?.tables || []);
  const content = tablesToKV(parsed.sections['Content']?.tables || []);
  return { logo, content };
}

// Process trailer.md
function processTrailer(parsed) {
  const config = tablesToKV(parsed.sections['Config']?.tables || []);
  const content = tablesToKV(parsed.sections['Content']?.tables || []);
  return { config, content };
}

// Process history.md
function processHistory(parsed) {
  const heading = tablesToKV(parsed.sections['Heading']?.tables || []);
  const config = tablesToKV(parsed.sections['Config']?.tables || []);
  const items = [];
  const timelineSection = parsed.sections['Timeline'];
  if (timelineSection?.items) {
    for (const [name, tables] of Object.entries(timelineSection.items)) {
      const merged = {};
      for (const table of tables) {
        for (const row of table) {
          if (row.Key && row.Value !== undefined) {
            merged[row.Key] = row.Value;
          } else if (row.Key) {
            const entry = {};
            for (const [k, v] of Object.entries(row)) {
              if (k !== 'Key') entry[k] = v;
            }
            merged[row.Key] = entry;
          }
        }
      }
      items.push({ name, ...merged });
    }
  }
  return { config, heading, items };
}

// Process about.md
function processAbout(parsed) {
  const heading = tablesToKV(parsed.sections['Heading']?.tables || []);
  const config = tablesToKV(parsed.sections['Config']?.tables || []);
  const cards = [];
  const cardsSection = parsed.sections['Cards'];
  if (cardsSection?.items) {
    for (const [name, tables] of Object.entries(cardsSection.items)) {
      const merged = {};
      for (const table of tables) {
        for (const row of table) {
          if (row.Key && row.Value !== undefined) merged[row.Key] = row.Value;
          else if (row.Key) {
            const entry = {};
            for (const [k, v] of Object.entries(row)) { if (k !== 'Key') entry[k] = v; }
            merged[row.Key] = entry;
          }
        }
      }
      cards.push({ name, ...merged });
    }
  }
  return { config, heading, cards };
}

// Process abbot.md
function processAbbot(parsed) {
  const config = tablesToKV(parsed.sections['Config']?.tables || []);
  const heading = tablesToKV(parsed.sections['Heading']?.tables || []);
  const content = tablesToKV(parsed.sections['Content']?.tables || []);
  return { config, heading, content };
}

// Process services.md  
function processServices(parsed) {
  const config = tablesToKV(parsed.sections['Config']?.tables || []);
  const heading = tablesToKV(parsed.sections['Heading']?.tables || []);
  const notice = tablesToKV(parsed.sections['Notice']?.tables || []);
  const cta = tablesToKV(parsed.sections['CTA']?.tables || []);
  const services = [];
  const servicesSection = parsed.sections['Services'];
  if (servicesSection?.items) {
    for (const [name, tables] of Object.entries(servicesSection.items)) {
      const merged = {};
      for (const table of tables) {
        for (const row of table) {
          if (row.Key && row.Value !== undefined) merged[row.Key] = row.Value;
          else if (row.Key) {
            const entry = {};
            for (const [k, v] of Object.entries(row)) { if (k !== 'Key') entry[k] = v; }
            merged[row.Key] = entry;
          }
        }
      }
      services.push({ name, ...merged });
    }
  }
  return { config, heading, notice, cta, services };
}

// Process gallery.md
function processGallery(parsed) {
  const config = tablesToKV(parsed.sections['Config']?.tables || []);
  const heading = tablesToKV(parsed.sections['Heading']?.tables || []);
  const images = (parsed.sections['Images']?.tables?.[0] || []).map(r => ({
    src: r.src, alt: r.alt, zh: r.zh, en: r.en, th: r.th
  }));
  return { config, heading, images };
}

// Process vision.md
function processVision(parsed) {
  const config = tablesToKV(parsed.sections['Config']?.tables || []);
  const heading = tablesToKV(parsed.sections['Heading']?.tables || []);
  const intro = tablesToKV(parsed.sections['Intro']?.tables || []);
  const renders = (parsed.sections['Renders']?.tables?.[0] || []).map(r => ({
    src: r.src, alt: r.alt, large: r.large === 'true', zh: r.zh, en: r.en, th: r.th
  }));
  return { config, heading, intro, renders };
}

// Process visit.md
function processVisit(parsed) {
  const config = tablesToKV(parsed.sections['Config']?.tables || []);
  const heading = tablesToKV(parsed.sections['Heading']?.tables || []);
  const cards = [];
  const cardsSection = parsed.sections['Cards'];
  if (cardsSection?.items) {
    for (const [name, tables] of Object.entries(cardsSection.items)) {
      const merged = {};
      for (const table of tables) {
        for (const row of table) {
          if (row.Key && row.Value !== undefined) merged[row.Key] = row.Value;
          else if (row.Key) {
            const entry = {};
            for (const [k, v] of Object.entries(row)) { if (k !== 'Key') entry[k] = v; }
            merged[row.Key] = entry;
          }
        }
      }
      cards.push({ name, ...merged });
    }
  }
  return { config, heading, cards };
}

// Main
const processors = {
  site: processSite,
  hero: processHero,
  trailer: processTrailer,
  history: processHistory,
  about: processAbout,
  abbot: processAbbot,
  services: processServices,
  gallery: processGallery,
  vision: processVision,
  visit: processVisit,
};

const data = {};
const files = readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

for (const file of files) {
  const key = basename(file, '.md');
  const raw = readFileSync(join(CONTENT_DIR, file), 'utf-8');
  const parsed = parseMarkdown(raw);
  
  if (processors[key]) {
    data[key] = processors[key](parsed);
  } else {
    console.warn(`No processor for ${file}, skipping`);
  }
}

// Generate TypeScript
const ts = `// AUTO-GENERATED by scripts/compile-content.js — DO NOT EDIT
// Source: content/*.md
// Regenerate: npm run content

export const siteData = ${JSON.stringify(data, null, 2)} as const;

export type SiteData = typeof siteData;
`;

writeFileSync(OUTPUT, ts, 'utf-8');
console.log(`✅ Generated ${OUTPUT} (${ts.length} bytes) from ${files.length} content files`);
