#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function log(...args){ console.log('[assign-sidebar-position]', ...args); }

const rawArg = process.argv[2] || '';
const addedFiles = rawArg.split(/\n+/).map(f => f.trim()).filter(f => f.endsWith('.md'));
if (!addedFiles.length){
  log('No added markdown files provided. Exiting.');
  process.exit(0);
}

// Only process one file (your workflow guarantees this)
const file = addedFiles[0];
// Sanitize & normalize
const safe = path.normalize(file).replace(/\\/g,'/');
if (safe.includes('..')){ log('Skipping unsafe path:', safe); process.exit(1); }
const abs = path.resolve(safe);
if (!fs.existsSync(safe) && !fs.existsSync(abs)){
  log('File does not exist:', safe);
  process.exit(1);
}
const folder = path.dirname(safe);

// Find max sidebar_position in folder (from .md and _category_.json)
let maxPosition = 0;
const entries = fs.readdirSync(folder, { withFileTypes: true });
for (const entry of entries){
  try {
    if (entry.isDirectory()){
      const catPath = path.join(folder, entry.name, '_category_.json');
      if (fs.existsSync(catPath)){
        const json = JSON.parse(fs.readFileSync(catPath,'utf8'));
        if (typeof json.position === 'number'){
          maxPosition = Math.max(maxPosition, json.position);
        }
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')){
      const mdPath = path.join(folder, entry.name);
      const content = fs.readFileSync(mdPath,'utf8');
      const match = content.match(/sidebar_position:\s*(\d+)/);
      if (match) maxPosition = Math.max(maxPosition, parseInt(match[1],10));
    }
  } catch (e){
    log('Error inspecting', entry.name, e.message);
  }
}

const nextPosition = maxPosition + 1;
log('Assigning sidebar_position', nextPosition, 'to', safe);

// Always set sidebar_position at the top of frontmatter
function setSidebarPositionFrontmatter(content, position){
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const line = `sidebar_position: ${position}`;
  if (!fmMatch){
    const body = content.replace(/^\n+/, '');
    return `---\n${line}\n---\n\n${body}`;
  }
  const fullBlock = fmMatch[0];
  const inner = fmMatch[1];
  // Remove any existing sidebar_position
  const lines = inner.split('\n').filter(l => !/^\s*sidebar_position\s*:/.test(l));
  lines.unshift(line);
  const rebuilt = `---\n${lines.join('\n')}\n---`;
  return content.replace(fullBlock, rebuilt);
}

try {
  const content = fs.readFileSync(safe,'utf8');
  const updated = setSidebarPositionFrontmatter(content, nextPosition);
  fs.writeFileSync(safe, updated);
  log('Updated file:', safe, 'sidebar_position =', nextPosition);
} catch (e){
  log('Failed to update file', safe, e.message);
}

log('Completed assignment.');