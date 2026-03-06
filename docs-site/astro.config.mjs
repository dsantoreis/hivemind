import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://dsantoreis.github.io/hivemind',
  base: '/hivemind',
  integrations: [
    starlight({
      title: 'Hivemind Docs',
      social: {
        github: 'https://github.com/dsantoreis/hivemind'
      },
      sidebar: [
        {
          label: 'Overview',
          items: [
            { label: 'Getting Started', link: '/getting-started' },
            { label: 'Architecture', link: '/architecture' },
            { label: 'API Reference', link: '/api-reference' },
            { label: 'Deployment', link: '/deployment' }
          ]
        },
        {
          label: 'Reference',
          items: [
            { label: 'API', link: '/reference/api' },
            { label: 'Contributing', link: '/reference/contributing' }
          ]
        }
      ]
    })
  ]
});
