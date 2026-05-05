import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getDb } from '../../db/database'
import { getApiKey, getApiKeyPresent } from '../settings'
import { logger } from '../logger'
import { getAllEntries } from '../../core/profile/repository'
import { tailorResume } from '../../core/resume/agent'
import { renderTyp } from '../../core/resume/renderer'
import { compileTyp, recompileFromSnapshot } from '../../core/resume/compiler'
import { pdfPathToUrl } from '../../core/resume/previewer'
import {
  getApplications,
  getApplicationById,
  insertApplication,
  updateApplicationTexPath,
  renameApplication,
} from '../../core/resume/repository'
import type { Application } from '../../src/shared/ipc-types'

export function registerResumeHandlers(
  resolveTypstBin: () => string,
  getAppRoot: () => string,
  getUserDataPath: () => string,
): void {
  ipcMain.handle(
    'resume:tailor',
    async (_event, payload: unknown) => {
      const { jobDescription, templateName, postingId } = payload as {
        jobDescription: string
        templateName: string
        postingId?: string
      }
      if (typeof jobDescription !== 'string' || !jobDescription.trim()) {
        throw new Error('jobDescription must be a non-empty string')
      }
      if (typeof templateName !== 'string' || !templateName.trim()) {
        throw new Error('templateName must be a non-empty string')
      }

      if (!getApiKeyPresent()) throw new Error('No API key stored — set one in Settings first')

      const key = getApiKey()
      if (!key) throw new Error('API key not retrievable')

      const entries = getAllEntries(getDb())
      if (entries.length === 0) throw new Error('Profile is empty — add entries first')

      const typstBin = resolveTypstBin()

      const resumeData = await tailorResume(
        key,
        entries,
        jobDescription,
        templateName,
        postingId ?? null,
        getDb(),
      )

      const applicationId = crypto.randomUUID()
      const userData = getUserDataPath()
      const typDir = path.join(userData, 'resumes', applicationId)
      const typPath = path.join(typDir, 'resume.typ')

      renderTyp(templateName, resumeData, typPath)

      const outcome = await compileTyp(typPath, typstBin)
      if (!outcome.success) {
        throw new Error(`Typst compilation failed: ${outcome.errorLine}`)
      }

      const application: Application = {
        id: applicationId,
        posting_id: postingId ?? null,
        tex_path: typPath,
        resume_json: JSON.stringify(resumeData),
        schema_version: 1,
        applied_at: null,
        notes: '',
        name: null,
        template_name: templateName,
      }

      insertApplication(getDb(), application)
      logger.info('Resume tailored', { applicationId, templateName })
      return { application, pdfUrl: pdfPathToUrl(outcome.pdfPath) }
    },
  )

  ipcMain.handle('resume:get-applications', () => getApplications(getDb()))

  ipcMain.handle('resume:rename', (_event, applicationId: string, name: string) => {
    if (typeof applicationId !== 'string' || !applicationId) throw new Error('Invalid applicationId')
    renameApplication(getDb(), applicationId, name?.trim() || null)
  })

  ipcMain.handle('resume:get-templates', () => {
    const templateDir = path.join(getAppRoot(), 'templates', 'resume')
    if (!fs.existsSync(templateDir)) return []
    return fs
      .readdirSync(templateDir)
      .filter((f) => f.endsWith('.typ.njk'))
      .map((f) => f.replace('.typ.njk', ''))
  })

  ipcMain.handle('resume:recompile', async (_event, applicationId: string) => {
    const row = getApplicationById(getDb(), applicationId)
    if (!row) throw new Error(`Application ${applicationId} not found`)

    const typstBin = resolveTypstBin()

    let typPath = row.tex_path
    if (typPath.endsWith('.tex')) {
      for (const ext of ['.tex', '.aux', '.log', '.out']) {
        try { fs.rmSync(typPath.replace(/\.tex$/, ext), { force: true }) } catch { /* ignore */ }
      }
      typPath = typPath.replace(/\.tex$/, '.typ')
      updateApplicationTexPath(getDb(), applicationId, typPath)
    }

    const templateName = row.template_name ?? 'classic'

    const outcome = await recompileFromSnapshot(
      row.resume_json,
      templateName,
      typPath,
      typstBin,
    )

    if (!outcome.success) {
      throw new Error(`Recompile failed: ${outcome.errorLine}`)
    }

    return pdfPathToUrl(outcome.pdfPath)
  })
}
