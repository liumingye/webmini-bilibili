import { build } from 'vite'

await build({ configFile: 'vite.config.ts' })
await build({ configFile: 'preload/vite.config.ts' })
