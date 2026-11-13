import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'drewdella',
  basePath: '/studio',

  projectId: 'qcu6o4bq',
  dataset: 'production',

  releases: {enabled: false},
  scheduledDrafts: {enabled: false},
  tasks: {enabled: false},

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
