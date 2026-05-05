import Database from 'better-sqlite3'
import type { Application } from '../../src/shared/ipc-types'

export function getApplications(db: Database.Database): Application[] {
  return db.prepare('SELECT * FROM applications ORDER BY rowid DESC').all() as Application[]
}

export function getApplicationById(db: Database.Database, id: string): Application | undefined {
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as Application | undefined
}

export function insertApplication(db: Database.Database, application: Application): void {
  db.prepare(
    `INSERT INTO applications (id, posting_id, tex_path, resume_json, schema_version, applied_at, notes, name, template_name)
     VALUES (@id, @posting_id, @tex_path, @resume_json, @schema_version, @applied_at, @notes, @name, @template_name)`,
  ).run(application)
}

export function updateApplicationTexPath(db: Database.Database, id: string, texPath: string): void {
  db.prepare('UPDATE applications SET tex_path = ? WHERE id = ?').run(texPath, id)
}

export function renameApplication(db: Database.Database, id: string, name: string | null): void {
  db.prepare('UPDATE applications SET name = ? WHERE id = ?').run(name, id)
}
