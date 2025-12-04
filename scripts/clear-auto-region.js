#!/usr/bin/env node
/*
  Clear the auto-generated region between marker comments, leaving only the markers.

  Behavior:
  - Validates markers using robust prefix detection: top starts with <!--@, bottom starts with <!--#
  - If neither marker exists, inserts canonical markers immediately after frontmatter fence
  - If only one marker exists (top without bottom or bottom without top), exits with error
  - If both exist, removes all content between them and leaves a single newline after top marker

  Usage:
    node scripts/clear-auto-region.js path/to/file.md [more.md ...]
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { TOP_MARKER_PREFIX, BOTTOM_MARKER_PREFIX, TOP_MARKER, BOTTOM_MARKER } = require('./sanitize-md');

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error(`[clear-auto-region] Failed to read ${p}:`, e.message);
    process.exitCode = 1;
    return null;
  }
}

function writeFileSafe(p, content) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  } catch (e) {
    console.error(`[clear-auto-region] Failed to write ${p}:`, e.message);
    process.exitCode = 1;
  }
}

function parseFrontmatter(src) {
  if (!src.startsWith('---\n')) return { fmBlock: '', body: src };
  const fence = '\n---\n';
  const end = src.indexOf(fence);
  if (end === -1) return { fmBlock: '', body: src };
  const fmBlock = src.slice(0, end + fence.length);
  const body = src.slice(end + fence.length);
  return { fmBlock, body };
}

function validateMarkersOrExit(body, fileLabel = '') {
  const topCount = (body.match(/^\s*<!--@.*$/gm) || []).length;
  const bottomCount = (body.match(/^\s*<!--#.*$/gm) || []).length;
  if (topCount > 1 || bottomCount > 1) {
    console.error(`[clear-auto-region] Marker duplication detected ${fileLabel ? 'in ' + fileLabel : ''}.`);
    process.exit(1);
  }
  if ((topCount === 1 && bottomCount === 0) || (topCount === 0 && bottomCount === 1)) {
    console.error(`[clear-auto-region] Marker mismatch (one present without the other) ${fileLabel ? 'in ' + fileLabel : ''}.`);
    process.exit(1);
  }
}

function ensureMarkersInBody(body) {
  const hasTop = /^\s*<!--@/.test(body);
  const hasBottom = /^([\s\S]*?)<!--#/.test(body);
  validateMarkersOrExit(body, 'body');
  if (!hasTop && !hasBottom) {
    // Insert markers immediately at top of body
    return `${TOP_MARKER}\n${BOTTOM_MARKER}\n${body.trimStart()}`;
  }
  return body;
}

function clearRegion(body) {
  const lines = body.split('\n');
  let topLine = -1, bottomLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (topLine === -1 && t.startsWith(TOP_MARKER_PREFIX)) topLine = i;
    if (bottomLine === -1 && t.startsWith(BOTTOM_MARKER_PREFIX)) bottomLine = i;
  }
  if (topLine === -1 || bottomLine === -1 || bottomLine < topLine) {
    console.error('[clear-auto-region] Marker positions invalid.');
    process.exit(1);
  }
  const before = lines.slice(0, topLine + 1); // include top marker line
  const after = lines.slice(bottomLine); // include bottom marker line onward
  // Rebuild with a single blank line between markers
  const rebuilt = [...before, '', ...after].join('\n');
  return rebuilt;
}

function processFile(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.warn('[clear-auto-region] Skipping missing file:', abs);
    return;
  }
  const raw = readFileSafe(abs);
  if (raw == null) return;

  const { fmBlock, body } = parseFrontmatter(raw);
  const withMarkers = ensureMarkersInBody(body);
  const cleared = clearRegion(withMarkers);
  const out = (fmBlock ? fmBlock : '') + cleared;
  writeFileSafe(abs, out);
  console.log('[clear-auto-region] Cleared auto region for', filePath);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/clear-auto-region.js path/to/file.md [more.md ...]');
    process.exit(1);
  }
  for (const p of args) {
    processFile(p);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseFrontmatter,
  validateMarkersOrExit,
  ensureMarkersInBody,
  clearRegion,
  processFile,
  main,
};