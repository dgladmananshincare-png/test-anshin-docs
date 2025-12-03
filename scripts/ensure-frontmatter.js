#!/usr/bin/env node
/*
  Ensure frontmatter fields exist with sensible defaults and enforce a fixed order.

  Expected order and defaults:
    id: ''
    slug: ''
    title: ''
    sidebar_position: 0
    description: ''
    keywords: []
    noindex: false

  Usage:
    node scripts/ensure-frontmatter.js path/to/file.md [more.md ...]

  Dependencies:
    npm install js-yaml
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Enforced order (sidebar_position intentionally omitted unless already present)
const EXPECTED_KEYS = [
  'id',
  'slug',
  'title',
  'subtitle',
  'description',
  'keywords',
  'noindex',
];

const DEFAULTS = {
  id: '',
  // slug will default to id (handled in ensureFrontmatter)
  slug: '',
  title: '',
  subtitle: null,
  // sidebar_position: intentionally not added when missing
  description: 'TODO: Replace with a meaningful description.',
  keywords: ['Placeholder'],
  noindex: true,
};

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error(`[ensure-frontmatter] Failed to read ${p}:`, e.message);
    process.exitCode = 1;
    return null;
  }
}

function writeFileSafe(p, content) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  } catch (e) {
    console.error(`[ensure-frontmatter] Failed to write ${p}:`, e.message);
    process.exitCode = 1;
  }
}

function parseFrontmatterAndBody(src) {
  if (!src.startsWith('---')) {
    return { fm: {}, body: src, hasFm: false };
  }
  const fence = '\n---\n';
  const end = src.indexOf(fence);
  if (end === -1) {
    return { fm: {}, body: src, hasFm: false };
  }
  const raw = src.slice(4, end);
  const body = src.slice(end + fence.length);
  let fm = {};
  try {
    const parsed = yaml.load(raw);
    if (parsed && typeof parsed === 'object') fm = parsed;
  } catch (e) {
    console.warn('[ensure-frontmatter] YAML parse warning:', e.message);
  }
  return { fm, body, hasFm: true };
}

function dumpFrontmatterOrdered(fm) {
  // Enforce ordering and include only expected keys in specified order
  const ordered = {};
  for (const key of EXPECTED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(fm, key)) {
      ordered[key] = fm[key];
    } else {
      // Add defaults for expected keys
      ordered[key] = DEFAULTS[key];
    }
  }
  // Preserve sidebar_position only if present originally
  if (Object.prototype.hasOwnProperty.call(fm, 'sidebar_position')) {
    ordered.sidebar_position = fm.sidebar_position;
  }
  const dumped = yaml.dump(ordered, { lineWidth: 120 });
  return `---\n${dumped}---\n`;
}

function ensureFrontmatter(fm) {
  const out = { ...fm };
  // Add missing expected keys with defaults; keep existing values as-is
  for (const key of EXPECTED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = DEFAULTS[key];
    }
  }
  // slug defaults to id if missing or blank
  if (!Object.prototype.hasOwnProperty.call(out, 'slug') || String(out.slug).trim() === '') {
    out.slug = String(out.id || DEFAULTS.id);
  }
  // subtitle: preserve if exists; if missing, set to null
  if (!Object.prototype.hasOwnProperty.call(out, 'subtitle')) {
    out.subtitle = DEFAULTS.subtitle;
  }
  // Do not add sidebar_position if it's missing
  // If present, keep as-is
  if (!Object.prototype.hasOwnProperty.call(out, 'keywords')) {
    out.keywords = DEFAULTS.keywords;
  }
  if (!Object.prototype.hasOwnProperty.call(out, 'description')) {
    out.description = DEFAULTS.description;
  }
  if (!Object.prototype.hasOwnProperty.call(out, 'noindex')) {
    out.noindex = DEFAULTS.noindex;
  }
  return out;
}

function processFile(filePath) {
  const raw = readFileSafe(filePath);
  if (raw == null) return;

  const parsed = parseFrontmatterAndBody(raw);
  const fmEnsured = ensureFrontmatter(parsed.fm);
  const fmDump = dumpFrontmatterOrdered(fmEnsured);
  const out = fmDump + '\n' + parsed.body.trimStart() + (parsed.body.endsWith('\n') ? '' : '\n');
  writeFileSafe(filePath, out);
  console.log(`[ensure-frontmatter] Updated ${filePath}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/ensure-frontmatter.js path/to/file.md [more.md ...]');
    process.exit(1);
  }
  for (const p of args) {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs)) {
      console.warn(`[ensure-frontmatter] Skipping missing file: ${abs}`);
      continue;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      console.warn(`[ensure-frontmatter] Skipping directory: ${abs}`);
      continue;
    }
    processFile(abs);
  }
}

main();
