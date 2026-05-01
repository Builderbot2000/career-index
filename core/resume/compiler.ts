import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { renderTyp } from './renderer'
import { ResumeDataSchema, type ResumeData } from './validator'

export interface CompileResult {
  success: true
  pdfPath: string
}

export interface CompileError {
  success: false
  errorLine: string
  fullLog: string
}

export type CompileOutcome = CompileResult | CompileError

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the most actionable error line from compiler stderr/stdout */
function extractActionableError(log: string): string {
  const lines = log.split('\n')
  // Typst errors start with 'error:'; xelatex errors start with '!' or contain 'Error'
  const errorLine =
    lines.find((l) => l.startsWith('error:')) ??
    lines.find((l) => l.startsWith('!')) ??
    lines.find((l) => /error/i.test(l)) ??
    lines.find((l) => l.trim().length > 0) ??
    'Unknown compilation error'
  return errorLine.trim()
}

// ─── Compile ──────────────────────────────────────────────────────────────────

export function compileTyp(
  typPath: string,
  typstBin: string,
): Promise<CompileOutcome> {
  return new Promise((resolve) => {
    const pdfPath = typPath.replace(/\.typ$/, '.pdf')
    const args = ['compile', typPath, pdfPath]

    let output = ''
    const proc = spawn(typstBin, args, { cwd: path.dirname(typPath) })

    proc.stdout.on('data', (d: Buffer) => { output += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { output += d.toString() })

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(pdfPath)) {
        resolve({ success: true, pdfPath })
      } else {
        resolve({
          success: false,
          errorLine: extractActionableError(output),
          fullLog: output,
        })
      }
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        errorLine: err.message,
        fullLog: err.message,
      })
    })
  })
}

// ─── Recompile from snapshot ──────────────────────────────────────────────────

/**
 * Regenerates the .typ file from the stored JSON snapshot and recompiles.
 * Used when the .typ file is missing (e.g. after reinstall).
 */
export async function recompileFromSnapshot(
  resumeJson: string,
  templateName: string,
  typPath: string,
  typstBin: string,
): Promise<CompileOutcome> {
  const parsed = ResumeDataSchema.safeParse(JSON.parse(resumeJson))
  if (!parsed.success) {
    return {
      success: false,
      errorLine: 'Stored snapshot failed schema validation — cannot recompile',
      fullLog: parsed.error.message,
    }
  }
  renderTyp(templateName, parsed.data as ResumeData, typPath)
  return compileTyp(typPath, typstBin)
}
