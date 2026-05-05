import { ipcMain } from 'electron'
import { getDb } from '../../db/database'
import {
  getFunnelSummary,
  getBySource,
  getBySeniority,
  getWeeklyTimeSeries,
  getLLMCostSummary,
  getLLMCostByType,
} from '../../core/tracker/analytics'

export function registerAnalyticsHandlers(): void {
  ipcMain.handle('analytics:funnel', () => getFunnelSummary(getDb()))
  ipcMain.handle('analytics:by-source', () => getBySource(getDb()))
  ipcMain.handle('analytics:by-seniority', () => getBySeniority(getDb()))
  ipcMain.handle('analytics:weekly', () => getWeeklyTimeSeries(getDb()))
  ipcMain.handle('analytics:llm-cost', () => getLLMCostSummary(getDb()))
  ipcMain.handle('analytics:llm-cost-by-type', () => getLLMCostByType(getDb()))
}
