#!/usr/bin/env node
/**
 * Sanitize title, subtitle, and markdown body for newly added docs.
 * Usage: node scripts/sanitize-doc-fields.js "file1.md\nfile2.md"
 */

const fs = require('fs');
const path = require('path');

// Basic HTML sanitization: strip tags but preserve alt text and URLs inside parentheses for markdown links
function stripHtml(input) {
  if (!input) return input;
  // Remove script/style tags entirely
  let out = input.replace(/<\/(?:script|style)>/gi, '').replace(/<(?:script|style)(?:\s[^>]*)?>[\s\S]*?<\/(?:script|style)>/gi, '');
  // Remove remaining HTML tags
  out = out.replace(/<[^>]+>/g, '');
  return out;
}

// Soft sanitize for body: neutralize potentially dangerous HTML while keeping markdown
function sanitizeBody(md) {
  if (!md) return md;
  // Remove inline event handlers like onerror, onclick within img or a HTML
  let out = md.replace(/<([^>]+)\s+on[a-zA-Z]+="[^"]*"([^>]*)>/g, '<$1$2>');
  // Remove javascript: URLs
  out = out.replace(/\((\s*javascript:[^)]+)\)/gi, '(#)');
  // Strip raw HTML tags except a limited safe set (b, i, strong, em, code, pre, br)
  out = out.replace(/<(?!\/?\b(?:b|i|strong|em|code|pre|br)\b)[^>]+>/gi, '');
  return out;
}

function normalizeWhitespace(s) {
  return s
    .replace(/[\t\r\f\v]+/g, ' ')
    .replace(/[ \u00A0]+/g, ' ') // collapse spaces including nbsp
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function sanitizeTextField(text, { maxLen = 120 } = {}) {
  if (!text) return text;
  let out = stripHtml(text);
  // Replace smart quotes and unusual dashes
  out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-');
  // Remove control characters
  out = out.replace(/[\x00-\x1F\x7F]/g, '');
  // Collapse whitespace
  out = normalizeWhitespace(out);
  if (out.length > maxLen) out = out.slice(0, maxLen).trim();
  return out;
}

function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) return { frontmatter: null, body: content };
  const fm = fmMatch[1];
  const body = content.slice(fmMatch[0].length);
  // Parse key: value pairs (simple YAML subset)
  const lines = fm.split(/\n/);
  const obj = {};
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
    if (m) {
      let val = m[2];
      // Handle quoted strings
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      obj[m[1]] = val;
    }
  }
  return { frontmatter: obj, body };
}

function serializeFrontmatter(obj) {
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    // Quote if contains colon or starts/ends with spaces
    const needsQuote = /[:#\-]|^\s|\s$/.test(String(v));
    const val = needsQuote ? JSON.stringify(String(v)) : String(v);
    lines.push(`${k}: ${val}`);
  }
  return `---\n${lines.join('\n')}\n---\n\n`;
}

function processFile(filePath) {
  // Guard against traversal outside workspace
  const abs = path.resolve(filePath);
  const repoRoot = path.resolve(__dirname, '..');
  if (!abs.startsWith(repoRoot)) {
    console.log(`[skip] ${filePath} is outside repo`);
    return;
  }
  if (!fs.existsSync(abs)) {
    console.log(`[skip] ${filePath} not found`);
    return;
  }
  const raw = fs.readFileSync(abs, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);
  if (!frontmatter) {
    console.log(`[skip] ${filePath} has no frontmatter`);
    return;
  }
  let changed = false;

  // Sanitize title and subtitle
  if (frontmatter.title) {
    const clean = sanitizeTextField(frontmatter.title, { maxLen: 80 });
    if (clean !== frontmatter.title) {
      frontmatter.title = clean;
      changed = true;
    }
  }
  if (frontmatter.subtitle) {
    const clean = sanitizeTextField(frontmatter.subtitle, { maxLen: 140 });
    if (clean !== frontmatter.subtitle) {
      frontmatter.subtitle = clean;
      changed = true;
    }
  }

  // Sanitize body gently
  const cleanBody = sanitizeBody(body);
  const normalizedBody = normalizeWhitespace(cleanBody).replace(/\n{3,}/g, '\n\n');
  const bodyChanged = normalizedBody !== body;
  const out = serializeFrontmatter(frontmatter) + normalizedBody;

  if (changed || bodyChanged) {
    fs.writeFileSync(abs, out, 'utf8');
    console.log(`[sanitized] ${filePath}`);
  } else {
    console.log(`[no-change] ${filePath}`);
  }
}

function main() {
  const input = process.argv[2] || '';
  const files = input.split(/\n/).map(s => s.trim()).filter(Boolean);
  if (files.length === 0) {
    console.log('No files to sanitize');
    return;
  }
  for (const f of files) {
    processFile(f);
  }
}

main();
