import { ipcMain } from 'electron'
import { getDb } from '../../db/database'
import { getTrackerPostings } from '../../core/tracker/repository'

export function registerTrackerHandlers(): void {
  ipcMain.handle('tracker:get-postings', () => {
    return getTrackerPostings(getDb())
  })
}
