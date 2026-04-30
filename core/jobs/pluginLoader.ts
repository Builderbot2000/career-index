import fs from 'fs'
import path from 'path'
import { BaseAdapter } from './adapters/base'

/**
 * Discovers and loads adapter plugins from two directories:
 *
 *   1. <appPath>/out/adapters/<name>/index.cjs  — built-in adapters shipped
 *      with the app (compiled by scripts/build-adapters.mjs, unpacked from asar)
 *
 *   2. <userDataPath>/adapters/<name>/index.js  — user-dropped plugins placed
 *      in the OS user-data directory (e.g. ~/.config/career-index/adapters/)
 *
 * Each plugin file must export a class as its default CJS export:
 *
 *   module.exports = { default: class MyAdapter { id = 'my-source'; search(...) {} } }
 *
 * Invalid or erroring plugins are skipped with a console warning — they never
 * crash the app.
 */
export function loadAdapters(appPath: string, userDataPath: string): BaseAdapter[] {
  const adapters: BaseAdapter[] = []

  // ── Built-in adapters (shipped with the app) ───────────────────────────────
  const builtInDir = path.join(appPath, 'out', 'adapters')
  loadFrom(builtInDir, 'index.cjs', adapters, 'built-in')

  // ── User-dropped adapters (in OS userData directory) ───────────────────────
  const userDir = path.join(userDataPath, 'adapters')
  loadFrom(userDir, 'index.js', adapters, 'user')

  return adapters
}

function loadFrom(
  dir: string,
  entryFile: string,
  out: BaseAdapter[],
  kind: 'built-in' | 'user',
): void {
  if (!fs.existsSync(dir)) return

  let entries: string[]
  try {
    entries = fs.readdirSync(dir)
  } catch (err) {
    console.warn(`[pluginLoader] Cannot read ${kind} adapter dir ${dir}:`, err)
    return
  }

  for (const name of entries) {
    const pluginDir = path.join(dir, name)
    if (!fs.statSync(pluginDir).isDirectory()) continue

    const entryPath = path.join(pluginDir, entryFile)
    if (!fs.existsSync(entryPath)) continue

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(entryPath) as Record<string, unknown>
      const AdapterClass = (mod.default ?? mod.adapter) as (new () => BaseAdapter) | undefined

      if (typeof AdapterClass !== 'function') {
        console.warn(`[pluginLoader] ${kind} adapter "${name}" has no default export — skipping`)
        continue
      }

      const instance = new AdapterClass()

      if (typeof instance.id !== 'string' || typeof instance.search !== 'function') {
        console.warn(`[pluginLoader] ${kind} adapter "${name}" failed duck-type check (missing id or search) — skipping`)
        continue
      }

      console.log(`[pluginLoader] Loaded ${kind} adapter: ${instance.id}`)
      out.push(instance)
    } catch (err) {
      console.warn(`[pluginLoader] Failed to load ${kind} adapter "${name}":`, err)
    }
  }
}

/**
 * Returns the path where users should place their custom adapter folders.
 * Shown in the UI so users know where to drop plugins.
 */
export function getUserAdapterDir(userDataPath: string): string {
  return path.join(userDataPath, 'adapters')
}
