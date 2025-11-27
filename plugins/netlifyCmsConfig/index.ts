import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { baseFields } from './netlifyCmsFields';

interface CollectionConfig {
  name: string;
  label: string;
  folder: string;
  identifier_field: string;
  extension: string;
  summary: string;
  sortable_fields: string[];
  create: boolean;
  slug: string;
  fields: any[]; // Netlify CMS allows nested structures; keep wide here.
}

// Depth-first recursive traversal to collect all folder paths beneath docs/app.
// Returns relative paths ('' for root, 'public', 'public/calendar', etc.).
function getAllFoldersRecursive(rootAbs: string, relBase = ''): string[] {
  if (!fs.existsSync(rootAbs)) return [];
  const entries = fs.readdirSync(rootAbs, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
    const absPath = path.join(rootAbs, entry.name);
    results.push(relPath);
    results.push(...getAllFoldersRecursive(absPath, relPath));
  }
  return results;
}

function buildCollections(appDocsDir: string): CollectionConfig[] {
  if (!fs.existsSync(appDocsDir)) return [];

  // Include root as first collection ('').
  const folderPaths = [''].concat(getAllFoldersRecursive(appDocsDir));

  return folderPaths.map((relPath) => {
    const isRoot = relPath === '';
    const name = isRoot
      ? 'app'
      : `app_${relPath.replace(/[^a-zA-Z0-9/]/g, '_').replace(/\//g, '_')}`; // sanitize & flatten
    const label = isRoot ? 'app' : `app/${relPath}`;
    const folder = isRoot ? 'docs/app' : `docs/app/${relPath}`;
    return {
      name,
      label,
      folder,
      identifier_field: 'id',
      extension: 'md',
      create: true,
      delete: false,
      slug: '{{id}}',
      summary: '{{dirname}}/{{filename}}.{{extension}} : {{title}}',
      fields: baseFields,
      sortable_fields: ['sidebar_position']
    };
  });
}

function buildNetlifyCmsConfig(siteDir: string) {
  const appDocsDir = path.join(siteDir, 'docs', 'app');
  const collections = buildCollections(appDocsDir);

  return {
    backend: {
      name: 'github',
      branch: 'stg',
      repo: 'dgladmananshincare-png/test-anshin-docs',
      base_url: 'https://stg-test-anshin-docs.vercel.app/',
      auth_endpoint: '/auth',
    },
    publish_mode: 'editorial_workflow',
    media_folder: 'static/img',
    public_folder: '/img/',
    logo: {
      src: "https://stg-test-anshin-docs.vercel.app/img/logo.webp",
      show_in_header: true
    },
    locale: 'ja',
    search: false,
    slug: {
      encoding: 'ascii',
      clean_accents: true,
      sanitize_replacement: '_',
    },
    collections,
  };
}

export default function netlifyCmsConfigPlugin() {
  return {
    name: 'netlify-cms-config-generator',
    async postBuild(props: { siteDir: string; outDir: string }) {
      const configObject = buildNetlifyCmsConfig(props.siteDir);
      const yamlString = yaml.stringify(configObject);

      // Write directly to build output so it's always up to date at /admin/config.yml
      const adminDir = path.join(props.outDir, 'admin');
      if (!fs.existsSync(adminDir)) fs.mkdirSync(adminDir, { recursive: true });
      fs.writeFileSync(path.join(adminDir, 'config.yml'), yamlString, 'utf8');

      // Optional: also update source copy (static/admin/config.yml) to keep repo in sync.
      const sourceAdminDir = path.join(props.siteDir, 'static', 'admin');
      if (!fs.existsSync(sourceAdminDir)) fs.mkdirSync(sourceAdminDir, { recursive: true });
      fs.writeFileSync(path.join(sourceAdminDir, 'config.yml'), yamlString, 'utf8');
    },
  };
}
