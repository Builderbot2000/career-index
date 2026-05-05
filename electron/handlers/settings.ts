import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { getSettings, updateSetting, getApiKeyPresent, saveApiKey, deleteApiKey } from '../settings'
import { logger, setLogLevel, type LogLevel } from '../logger'
import { shell } from 'electron'
import type { FeatureLocks, SettingKey, Settings } from '../../src/shared/ipc-types'

export function registerSettingsHandlers(
  getMainWindow: () => BrowserWindow | null,
  pushFeatureLocks: (patch: Partial<FeatureLocks>) => void,
): void {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:update', (_event, { key, value }: { key: SettingKey; value: unknown }) => {
    updateSetting(key, value as Settings[SettingKey])
    if (key === 'log_level') setLogLevel(value as LogLevel)
  })

  ipcMain.handle('settings:api-key-present', () => getApiKeyPresent())

  ipcMain.handle('settings:set-api-key', (_event, key: string) => {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('API key must be a non-empty string')
    }
    saveApiKey(key.trim())
    pushFeatureLocks({ claudeApiKey: false })
  })

  ipcMain.handle('settings:delete-api-key', () => {
    deleteApiKey()
    pushFeatureLocks({ claudeApiKey: true })
  })

  ipcMain.handle('shell:open-external', (_event, url: string) => {
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      logger.warn(`Blocked non-https URL in openExternal: ${url}`)
      throw new Error('Only https:// URLs are permitted')
    }
    return shell.openExternal(url)
  })
}
