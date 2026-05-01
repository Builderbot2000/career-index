import nunjucks from 'nunjucks'
import fs from 'fs'
import path from 'path'
import type { ResumeData } from './validator'

let env: nunjucks.Environment | null = null

function getEnv(): nunjucks.Environment {
  if (env) return env
  const templateDir = path.join(__dirname, '..', '..', 'templates', 'resume')
  env = nunjucks.configure(templateDir, {
    autoescape: false,
    throwOnUndefined: true,
    trimBlocks: true,
    lstripBlocks: true,
  })
  return env
}

// Escape characters that are special in Typst markup mode.
// Backslash must be replaced first to avoid double-escaping.
function escapeTypst(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\$/g, '\\$')
    .replace(/@/g, '\\@')
    .replace(/</g, '\\<')
    .replace(/`/g, '\\`')
}

// Walk the data tree and escape every string leaf.
function escapeData(escapeFn: (s: string) => string, value: unknown): unknown {
  if (typeof value === 'string') return escapeFn(value)
  if (Array.isArray(value)) return value.map((v) => escapeData(escapeFn, v))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, escapeData(escapeFn, v)]),
    )
  }
  return value
}

export function renderTyp(
  templateName: string,
  data: ResumeData,
  outPath: string,
): void {
  const e = getEnv()
  const typ = e.render(`${templateName}.typ.njk`, escapeData(escapeTypst, data) as ResumeData)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, typ, 'utf-8')
}
