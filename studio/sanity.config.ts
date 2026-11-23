import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {projectId, dataset} from '../sanity/env'

const plugins = [structureTool()]

if (process.env.NODE_ENV === 'development') {
  plugins.push(visionTool())
}

export default defineConfig({
  name: 'default',
  title: 'drewdella',
  basePath: '/studio',

  projectId,
  dataset,

  announcements: {enabled: false},
  releases: {enabled: false},
  scheduledDrafts: {enabled: false},
  tasks: {enabled: false},

  plugins,

  schema: {
    types: schemaTypes,
  },
})