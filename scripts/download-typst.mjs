#!/usr/bin/env node
/**
 * Downloads Typst CLI binaries for all supported platforms into bin/.
 * The version is read from package.json "typstVersion".
 * Safe to re-run: skips binaries that already exist.
 */

import { mkdirSync, existsSync, chmodSync, readFileSync, createWriteStream, renameSync, copyFileSync, unlinkSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { pipeline } from 'stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BIN_DIR = join(ROOT, 'bin')

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const VERSION = pkg.typstVersion

if (!VERSION) {
  console.error('ERROR: "typstVersion" is not set in package.json')
  process.exit(1)
}

const BASE_URL = `https://github.com/typst/typst/releases/download/v${VERSION}`

// archive → { dir inside archive, binary filename, local output name }
const TARGETS = [
  {
    archive: 'typst-x86_64-unknown-linux-musl.tar.xz',
    dir: 'typst-x86_64-unknown-linux-musl',
    binary: 'typst',
    out: 'typst-linux-x64',
    executable: true,
  },
  {
    archive: 'typst-x86_64-apple-darwin.tar.xz',
    dir: 'typst-x86_64-apple-darwin',
    binary: 'typst',
    out: 'typst-darwin-x64',
    executable: true,
  },
  {
    archive: 'typst-aarch64-apple-darwin.tar.xz',
    dir: 'typst-aarch64-apple-darwin',
    binary: 'typst',
    out: 'typst-darwin-arm64',
    executable: true,
  },
  {
    archive: 'typst-x86_64-pc-windows-msvc.zip',
    dir: 'typst-x86_64-pc-windows-msvc',
    binary: 'typst.exe',
    out: 'typst-win32-x64.exe',
    executable: false,
  },
]

mkdirSync(BIN_DIR, { recursive: true })

async function downloadFile(url, dest) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`)
  const ws = createWriteStream(dest)
  await pipeline(res.body, ws)
}

console.log(`Downloading Typst v${VERSION} binaries…`)

for (const target of TARGETS) {
  const outPath = join(BIN_DIR, target.out)
  if (existsSync(outPath)) {
    console.log(`  Skipping ${target.out} (already exists)`)
    continue
  }

  console.log(`  Fetching ${target.archive}…`)
  const tmp = tmpdir()
  const archivePath = join(tmp, `typst-${Date.now()}-${target.archive}`)
  const extractDir = join(tmp, `typst-extract-${Date.now()}`)

  try {
    await downloadFile(`${BASE_URL}/${target.archive}`, archivePath)
    mkdirSync(extractDir, { recursive: true })

    if (target.archive.endsWith('.tar.xz')) {
      execSync(`tar -xJf "${archivePath}" -C "${extractDir}"`, { stdio: 'ignore' })
    } else {
      // .zip (Windows binary)
      if (process.platform === 'win32') {
        execSync(
          `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}'"`,
          { stdio: 'ignore' },
        )
      } else {
        execSync(`unzip -q "${archivePath}" -d "${extractDir}"`, { stdio: 'ignore' })
      }
    }

    const extracted = join(extractDir, target.dir, target.binary)
    try {
      renameSync(extracted, outPath)
    } catch (err) {
      if (err.code !== 'EXDEV') throw err
      copyFileSync(extracted, outPath)
      unlinkSync(extracted)
    }

    if (target.executable) {
      chmodSync(outPath, 0o755)
    }

    console.log(`  ✓ ${target.out}`)
  } finally {
    rmSync(archivePath, { force: true })
    rmSync(extractDir, { recursive: true, force: true })
  }
}

console.log('Done.')
