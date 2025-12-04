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
// Auto-generated region markers (Japanese)
// Robust detection: top starts with <!--@, bottom starts with <!--#
const TOP_MARKER_PREFIX = '<!--@';
const BOTTOM_MARKER_PREFIX = '<!--#';
const TOP_MARKER = '<!--@ ここから下は自動生成領域です。編集しないでください -->';
const BOTTOM_MARKER = '<!--# この行より上は自動生成されます。編集しないでください -->';

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
  description: '近日公開',
  keywords: ["例: 管理画面", "例: 初期設定", "例: アンシン"],
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
  // Compute ordered values with defaults applied (without mutating fm)
  const val = {};
  for (const key of EXPECTED_KEYS) {
    val[key] = Object.prototype.hasOwnProperty.call(fm, key) ? fm[key] : DEFAULTS[key];
  }
  const hasSidebar = Object.prototype.hasOwnProperty.call(fm, 'sidebar_position');

  // Decide whether to include instructional comments
  const includeDescComments = String(val.description) === '近日公開';
  const keywordsArr = Array.isArray(val.keywords) ? val.keywords : [val.keywords].filter(Boolean);
  const includeKeywordComments = keywordsArr.some(k => typeof k === 'string' && k.includes('例:'));

  // Build YAML manually to include inline comments above description/keywords when applicable
  const lines = [];
  lines.push('---');
  lines.push(`id: ${String(val.id)}`);
  lines.push(`slug: ${String(val.slug)}`);
  lines.push(`title: ${String(val.title)}`);
  lines.push(`subtitle: ${val.subtitle === null ? 'null' : String(val.subtitle)}`);

  if (includeDescComments) {
    lines.push('# このフィールドはSEOのためのページ説明文です。検索エンジンやSNSで表示される要約になります。');
    lines.push('# 完成したら、noindexフィールドをfalseにしてページをインデックス可能にしてください。');
  }
  // Quote description if it contains spaces or non-ASCII to be safe
  const descVal = typeof val.description === 'string' ? JSON.stringify(val.description) : JSON.stringify(String(val.description));
  lines.push(`description: ${descVal}`);

  if (includeKeywordComments) {
    lines.push('# このフィールドはSEO用のキーワードリストです。各キーワードを1行ずつ「-」で記述してください。');
  }
  lines.push('keywords:');
  for (const k of keywordsArr) {
    const kv = typeof k === 'string' ? k : String(k);
    // Quote only when needed
    const needsQuote = /[:#\-]/.test(kv) || /\s/.test(kv) || /['"]/g.test(kv);
    const rendered = needsQuote ? `'${kv.replace(/'/g, "''")}'` : kv;
    lines.push(`  - ${rendered}`);
  }

  lines.push(`noindex: ${val.noindex === true ? 'true' : val.noindex === false ? 'false' : String(val.noindex)}`);
  if (hasSidebar) {
    lines.push(`sidebar_position: ${fm.sidebar_position}`);
  }
  lines.push('---');
  lines.push('');
  return lines.join('\n');
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
  // Ensure markers exist right after frontmatter: if missing, insert an empty auto-generated region
  let body = parsed.body.trimStart();
  const hasTop = /^\s*<!--@/.test(body);
  const hasBottom = /^([\s\S]*?)<!--#/.test(body);
  if (!hasTop && !hasBottom) {
    // Insert markers immediately after frontmatter with no extra blank line between them
    body = `${TOP_MARKER}\n${BOTTOM_MARKER}\n${body.trimStart()}`;
  } else if (hasTop && !hasBottom) {
    console.error('[ensure-frontmatter] Marker mismatch: top present without bottom.');
    process.exit(1);
  } else if (!hasTop && hasBottom) {
    console.error('[ensure-frontmatter] Marker mismatch: bottom present without top.');
    process.exit(1);
  }
  const out = fmDump + '\n' + body + (body.endsWith('\n') ? '' : '\n');
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

module.exports = {
  parseFrontmatterAndBody,
  dumpFrontmatterOrdered,
  ensureFrontmatter,
  processFile,
  main,
  TOP_MARKER,
  BOTTOM_MARKER,
};

if (require.main === module) {
  main();
}
