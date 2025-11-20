import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { baseFields } from '../../lib/netlifyCmsFields';

interface CollectionConfig {
  name: string;
  label: string;
  folder: string;
  identifier_field: string;
  extension: string;
  create: boolean;
  slug: string;
  fields: any[]; // Netlify CMS allows nested structures; keep wide here.
}

function buildCollections(appDocsDir: string): CollectionConfig[] {
  if (!fs.existsSync(appDocsDir)) return [];

  const entries = fs.readdirSync(appDocsDir, { withFileTypes: true });
  return entries
    .filter((d) => d.isDirectory())
    .map((dir) => {
      const folder = dir.name; // e.g. 'start-guide'
      return {
        name: `app_${folder}`.replace(/[^a-zA-Z0-9_]/g, '_'), // Netlify CMS name slug
        label: `app/${folder}`,
        folder: `docs/app/${folder}`,
        identifier_field: 'title',
        extension: 'md',
        create: true,
        slug: '{{id}}',
        fields: baseFields,
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
    display_url: 'https://stg-test-anshin-docs.vercel.app/',
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
