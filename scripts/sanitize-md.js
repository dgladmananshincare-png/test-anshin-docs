#!/usr/bin/env node
/*
  Sanitize a markdown file in-place:
  - Parse YAML frontmatter with js-yaml
  - Sanitize string fields in frontmatter (strip HTML)
  - Sanitize embedded HTML in the markdown body using sanitize-html
  - Ensure required frontmatter fields exist with safe defaults

  Usage:
    node scripts/sanitize-md.js path/to/file.md [more.md ...]

  Dependencies:
    npm install js-yaml sanitize-html
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const sanitizeHtml = require('sanitize-html');
// Auto-generated region markers (Japanese)
// New robust detection: top starts with <!--@, bottom starts with <!--#
const TOP_MARKER_PREFIX = '<!--@';
const BOTTOM_MARKER_PREFIX = '<!--#';
// Canonical recommended strings (still used when inserting new markers)
const TOP_MARKER = '<!--@ ここから下は自動生成領域です。編集しないでください -->';
const BOTTOM_MARKER = '<!--# この行より上は自動生成されます。編集しないでください -->';

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error(`[sanitize-md] Failed to read ${p}:`, e.message);
    process.exitCode = 1;
    return null;
  }
}

function writeFileSafe(p, content) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  } catch (e) {
    console.error(`[sanitize-md] Failed to write ${p}:`, e.message);
    process.exitCode = 1;
  }
}

function parseFrontmatterAndBody(src) {
  if (!src.startsWith('---')) {
    return { fm: {}, body: src };
  }
  // Support both \n---\n and final --- at file start (common case)
  const fence = '\n---\n';
  const end = src.indexOf(fence);
  if (end === -1) {
    // If no closing fence, treat entire file as body
    return { fm: {}, body: src };
  }
  const raw = src.slice(4, end); // after initial '---\n'
  const body = src.slice(end + fence.length);
  let fm = {};
  try {
    const parsed = yaml.load(raw);
    if (parsed && typeof parsed === 'object') fm = parsed;
  } catch (e) {
    console.warn('[sanitize-md] YAML parse warning:', e.message);
  }
  return { fm, body };
}

function dumpFrontmatter(fm) {
  const dumped = yaml.dump(fm, { lineWidth: 120 });
  return `---\n${dumped}---\n`;
}

// Strict HTML sanitization options:
// - Keep common safe tags often seen in docs; remove scripts, iframes, objects, styles, and all event handlers
// - Restrict URL schemes to safe ones
const SANITIZE_OPTIONS = {
  disallowedTagsMode: 'discard',
  allowedTags: [
    'a', 'b', 'i', 'strong', 'em', 'u', 's', 'code', 'pre', 'kbd', 'samp',
    'blockquote', 'p', 'br', 'hr', 'span',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
    // Headings (if present as raw HTML)
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Whitelist specific JSX-like tags we use in MDX
    'Subtitle', 'Head', 'meta'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['title'],
    // Allow attributes used in meta for robots
    meta: ['name', 'content'],
  },
  // Disallow javascript: and other dangerous schemes
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'], // allow data URIs for images only
    a: ['http', 'https', 'mailto', 'tel'],
  },
  allowProtocolRelative: false,
  // Remove all event handlers and unknown attributes by default
  // sanitize-html does this implicitly; we can also enforce via transformTags if needed
};

function sanitizeFrontmatter(fm) {
  const clean = { ...fm };
  const sanitizeString = (v) =>
    typeof v === 'string'
      ? sanitizeHtml(v, { allowedTags: [], allowedAttributes: {} }).trim()
      : v;

  // Only sanitize fields that exist; do not add or coerce missing fields
  if (Object.prototype.hasOwnProperty.call(clean, 'id')) {
    clean.id = sanitizeString(clean.id);
  }
  if (Object.prototype.hasOwnProperty.call(clean, 'slug')) {
    clean.slug = sanitizeString(clean.slug);
  }
  if (Object.prototype.hasOwnProperty.call(clean, 'title')) {
    clean.title = sanitizeString(clean.title);
  }
  if (Object.prototype.hasOwnProperty.call(clean, 'description')) {
    clean.description = sanitizeString(clean.description);
  }
  if (Object.prototype.hasOwnProperty.call(clean, 'subtitle')) {
    clean.subtitle = sanitizeString(clean.subtitle);
  }

  if (Object.prototype.hasOwnProperty.call(clean, 'keywords')) {
    if (Array.isArray(clean.keywords)) {
      clean.keywords = clean.keywords
        .map((k) => sanitizeString(k))
        .filter((k) => typeof k === 'string' && k.length > 0);
    } else {
      // Keep original type; if string, sanitize as string; if other, leave as-is
      clean.keywords = sanitizeString(clean.keywords);
    }
  }

  if (Object.prototype.hasOwnProperty.call(clean, 'noindex')) {
    // Do not force boolean default; if string, sanitize; else leave as-is
    if (typeof clean.noindex === 'string') {
      const s = sanitizeString(clean.noindex).toLowerCase();
      // Preserve value as originally typed; if typical strings, map to boolean
      if (s === 'true' || s === 'false') {
        clean.noindex = s === 'true';
      } else {
        // keep sanitized string if non-standard
        clean.noindex = s;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(clean, 'sidebar_position')) {
    // Only coerce if numeric-like; otherwise keep original
    const n = Number(clean.sidebar_position);
    if (typeof clean.sidebar_position === 'string' || typeof clean.sidebar_position === 'number') {
      clean.sidebar_position = Number.isFinite(n) ? n : clean.sidebar_position;
    }
  }

  return clean;
}

function sanitizeMarkdownBody(body) {
  // Preserve specific JSX-like blocks by tokenizing them before HTML sanitization, then restoring.
  const placeholders = [];
  const pushPlaceholder = (original, type) => {
    const token = `__PLACEHOLDER_${type}_${placeholders.length}__`;
    placeholders.push({ token, original });
    return token;
  };

  // Match exact Subtitle line
  const SUBTITLE_RE = /<Subtitle\s+text=\{frontMatter\.subtitle\}\s*\/>/g;
  // Match Head block with robots meta; be flexible with spacing/newlines
  const HEAD_BLOCK_RE = /<Head>\s*<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']\s*\/>\s*<\/Head>/gs;

  // Tokenize markers to preserve them across sanitize-html
  // Preserve any line starting with the marker prefixes
  const MARKER_TOP_RE = /^\s*<!--@.*$/gm;
  const MARKER_BOTTOM_RE = /^\s*<!--#.*$/gm;

  let working = body
    .replace(SUBTITLE_RE, (m) => pushPlaceholder(m, 'SUBTITLE'))
    .replace(HEAD_BLOCK_RE, (m) => pushPlaceholder(m, 'HEAD'))
    .replace(MARKER_TOP_RE, (m) => pushPlaceholder(m, 'TOP_MARKER'))
    .replace(MARKER_BOTTOM_RE, (m) => pushPlaceholder(m, 'BOTTOM_MARKER'));

  // Neutralize dangerous markdown link/image URLs (e.g., javascript: in [link](...) or ![img](...))
  const neutralizeUrl = (url) => {
    const original = url || '';
    const u = original.trim().toLowerCase();
    const allowedStarts = ['http://', 'https://', 'mailto:', 'tel:', '/', './', '../', '#'];
    const hasScheme = /^[a-z][a-z0-9+.-]*:/.test(u);
    const isAllowed = allowedStarts.some((p) => u.startsWith(p)) || (!hasScheme && u !== '');
    return isAllowed ? original : '#';
  };

  const preprocessed = working
    // Images: ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => `![${alt}](${neutralizeUrl(url)})`)
    // Links: [text](url)
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, (m, text, url) => `[${text}](${neutralizeUrl(url)})`);

  // Apply sanitize-html to the whole body. This preserves markdown syntax
  // and removes/cleans only raw HTML fragments.
  let cleaned = sanitizeHtml(preprocessed, SANITIZE_OPTIONS);

  // Restore placeholders back to original JSX-like blocks
  for (const { token, original } of placeholders) {
    const tokenRe = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    cleaned = cleaned.replace(tokenRe, original);
  }

  return cleaned;
}

function processFile(filePath) {
  const raw = readFileSafe(filePath);
  if (raw == null) return;

  const { fm, body } = parseFrontmatterAndBody(raw);
  const safeFm = sanitizeFrontmatter(fm);
  const safeBody = sanitizeMarkdownBody(body);

  const out = dumpFrontmatter(safeFm) + '\n' + safeBody.trimStart() + (safeBody.endsWith('\n') ? '' : '\n');
  writeFileSafe(filePath, out);
  console.log(`[sanitize-md] Sanitized ${filePath}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/sanitize-md.js path/to/file.md [more.md ...]');
    process.exit(1);
  }
  for (const p of args) {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs)) {
      console.warn(`[sanitize-md] Skipping missing file: ${abs}`);
      continue;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      console.warn(`[sanitize-md] Skipping directory: ${abs}`);
      continue;
    }
    processFile(abs);
  }
}

// Export for tests
module.exports = {
  parseFrontmatterAndBody,
  dumpFrontmatter,
  sanitizeFrontmatter,
  sanitizeMarkdownBody,
  processFile,
  main,
  TOP_MARKER_PREFIX,
  BOTTOM_MARKER_PREFIX,
  TOP_MARKER,
  BOTTOM_MARKER,
};

// Run only when executed directly
if (require.main === module) {
  main();
}
