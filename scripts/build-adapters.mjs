/**
 * Compiles each core/jobs/adapters/<name>/index.ts into a self-contained CJS
 * bundle at out/adapters/<name>/index.cjs.
 *
 * The bundles are:
 *   - CJS format so they can be require()'d by the plugin loader at runtime
 *   - Platform: node (no browser shims)
 *   - All npm packages are marked external — they resolve from the app's
 *     node_modules at runtime, keeping bundle size small and avoiding
 *     double-packaging playwright/cheerio/etc.
 *
 * The default export of each bundle is the adapter class, which the plugin
 * loader instantiates via `new exports.default()`.
 */

import { build } from 'esbuild'
import { readdirSync, statSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '..')
const adaptersDir = join(root, 'core', 'jobs', 'adapters')
const outDir = join(root, 'out', 'adapters')

// Discover all adapter subdirectories that have an index.ts entry point
const adapterNames = readdirSync(adaptersDir).filter((name) => {
  const dir = join(adaptersDir, name)
  return statSync(dir).isDirectory() && existsSync(join(dir, 'index.ts'))
})

// base.ts is a shared contract, not a plugin — skip it
const SKIP = new Set(['base'])
const targets = adapterNames.filter((name) => !SKIP.has(name))

console.log(`Building ${targets.length} adapters: ${targets.join(', ')}`)

await Promise.all(
  targets.map((name) =>
    build({
      entryPoints: [join(adaptersDir, name, 'index.ts')],
      outfile: join(outDir, name, 'index.cjs'),
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      // All npm packages stay external — they live in the app's node_modules
      packages: 'external',
      // Keep class names intact for duck-type validation
      keepNames: true,
      // Inline source maps for debuggability in dev
      sourcemap: 'inline',
      // tsconfig for type resolution
      tsconfig: join(root, 'tsconfig.node.json'),
      logLevel: 'info',
    }).then(() => console.log(`  ✓ ${name}`))
  ),
)

console.log('Adapter build complete.')
