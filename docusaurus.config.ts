import {themes as prismThemes} from 'prism-react-renderer';
import netlifyCmsConfigPlugin from './plugins/netlifyCmsConfig';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'TEST - Anshin Docs',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://test-anshin-docs.vercel.app/',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'ja',
    locales: ['ja'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          filename: 'sitemap.xml'
        }
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    // Generates Netlify CMS config (admin/config.yml) at build-time based on docs/app folder structure.
    netlifyCmsConfigPlugin,
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'app',
        path: 'docs/app',
        routeBasePath: 'docs/app',
        sidebarPath: './sidebars.app.ts',
        editUrl: 'https://github.com/dgladmananshincare-png/test-anshin-docs/edit/stg/',
        showLastUpdateTime: true        
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'customer',
        path: 'docs/customer',
        routeBasePath: 'docs/customer',
        sidebarPath: './sidebars.customer.ts',
        editUrl: 'https://github.com/dgladmananshincare-png/test-anshin-docs/edit/stg/',
        showLastUpdateTime: true        
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'reserve',
        path: 'docs/reserve',
        routeBasePath: 'docs/reserve',
        sidebarPath: './sidebars.reserve.ts',
        editUrl: 'https://github.com/dgladmananshincare-png/test-anshin-docs/edit/stg/',
        showLastUpdateTime: true        
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'updates',
        path: 'docs/updates',
        routeBasePath: 'docs/updates',
        sidebarPath: './sidebars.updates.ts',
        breadcrumbs: false,
      }
    ],
    [
      '@docusaurus/plugin-google-gtag',
      {
        trackingID: 'G-2S806JX06R',
      },
    ],
    async function myPlugin() {
      return {
        name: 'docusaurus-tailwindcss',
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require('tailwindcss'));
          postcssOptions.plugins.push(require('autoprefixer'));
          return postcssOptions;
        },
      };
    }

  ],
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
    },
  ],
  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'TEST Anshin Docs',
      logo: {
        alt: 'Logo',
        src: 'img/logo.webp',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'appSidebar',
          docsPluginId: 'app',
          position: 'left',
          label: 'App',
        },
        {
          type: 'docSidebar',
          sidebarId: 'customerSidebar',
          docsPluginId: 'customer',
          position: 'left',
          label: 'Customer',
        },
        {
          type: 'docSidebar',
          sidebarId: 'reserveSidebar',
          docsPluginId: 'reserve',
          position: 'left',
          label: 'Reserve',
        },
        {
          type: 'docSidebar',
          sidebarId: 'updatesSidebar',
          docsPluginId: 'updates',
          position: 'right',
          label: '更新履歴',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Anshin`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
