// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Yoko Core documentation',
  tagline: 'Do Code. Better.',
  favicon: 'img/favicon.ico',
  noIndex: true, // Defaults to `false`

  // Set the production url of your site here
  url: 'https://core.yokoco.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Yoko-Co', // Usually your GitHub org/user name.
  projectName: 'yoko-core', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
			'https://github.com/Yoko-Co/yoko-core/tree/main',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Yoko-Co/yoko-core/tree/main/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/dgb-yoko-opengraph.png',
      navbar: {
        title: 'Yoko Core Documentation',
        logo: {
          alt: 'Yoko Co',
          src: 'img/yoko-logo@2x.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          {href: 'https://github.com/Yoko-Co/yoko-core/releases', label: 'Changelog', position: 'left'},
		  {
			type: 'docsVersionDropdown',
			position: 'right'
		  },
          {
            href: 'https://github.com/Yoko-Co/yoko-core',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Tutorial',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Changelog',
                href: 'https://github.com/Yoko-Co/yoko-core/releases',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/Yoko-Co/yoko-core',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Yoko Co, LLC. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
		additionalLanguages: ['php'],
      },
	  // ...
	  algolia: {
		// The application ID provided by Algolia
		appId: 'LJLFV89X4O',
  
		// Public API key: it is safe to commit it
		apiKey: '846b6660d0259dc69bcbe807123a26c5',
  
		indexName: 'core_yokoco_dev_ljlfv89x4o_pages',
  
		// Optional: see doc section below
		contextualSearch: true
	  },
    }),
};

export default config;
