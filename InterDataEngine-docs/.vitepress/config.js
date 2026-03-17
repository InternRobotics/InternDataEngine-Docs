import { defineConfig } from 'vitepress'
import { katex } from '@mdit/plugin-katex'

export default defineConfig({
  title: 'InternDataEngine',
  base: '/InternDataEngine-Docs/',
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/guides/installation' },
      { text: 'Core Concepts', link: '/concepts/workflows' },
      { text: 'Policy Validation', link: '/policy/training' }
    ],
    
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/guides/installation' },
          { text: 'Quick Start', link: '/guides/quickstart' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Workflows', link: '/concepts/workflows' },
          {
            text: 'Skills',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/concepts/skills/overview' },
              { text: 'Pick Skill', link: '/concepts/skills/pick' },
              { text: 'Place Skill', link: '/concepts/skills/place' },
              { text: 'Articulation Skill', link: '/concepts/skills/articulation' }
            ]
          },
          { text: 'Objects', link: '/concepts/objects' },
          { text: 'Cameras', link: '/concepts/cameras' },
          { text: 'Robots', link: '/concepts/robots' },
          { text: 'Controllers', link: '/concepts/controllers' }
        ]
      },
      {
        text: 'Configuration',
        items: [
          { text: 'YAML Config', link: '/config/yaml' },
          { text: 'Domain Randomization', link: '/config/dr' },
          { text: 'Assets', link: '/config/assets' }
        ]
      },
      {
        text: 'Customization',
        items: [
          { text: 'New Assets', link: '/custom/assets' },
          { text: 'New Robot', link: '/custom/robot' },
          { text: 'New Controller', link: '/custom/controller' },
          { text: 'New Skill', link: '/custom/skill' },
          { text: 'New Task', link: '/custom/task' }
        ]
      },
      {
        text: 'Policy Validation',
        items: [
          { text: 'Training', link: '/policy/training' }
        ]
      }
    ],
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 InternDataEngine Team'
    },
    
    docFooter: {
      prev: 'Previous Page',
      next: 'Next Page'
    },
    
    outline: {
      label: 'On this page',
      level: [2, 3]
    },
    
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/InternRobotics/InternDataEngine' }
    ],
    
    search: {
      provider: 'local'
    }
  },
  
  markdown: {
    lineNumbers: true,
    config: (md) => {
      md.use(katex)
    }
  },
  
  head: [
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css' }]
  ]
})