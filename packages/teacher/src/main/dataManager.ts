import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { dialog } from 'electron'
import type { TestSettings } from '../renderer/types'

export class DataManager {
  private dataDir: string
  private testDataPath: string

  constructor(userDataPath: string) {
    this.dataDir = join(userDataPath, 'data')
    this.testDataPath = join(this.dataDir, 'test-settings.json')
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create data directory:', error)
    }
  }

  async saveTestSettingsToFile(data: TestSettings) {
    try {
      // 清理数据中的循环引用
      const cleanData = {
        ...data,
        audioFiles: data.audioFiles?.map(file => ({
          id: file.id,
          path: file.originalPath,
          name: file.name,
          comment: file.comment || ''
        }))
      }

      const result = await dialog.showSaveDialog({
        filters: [{ name: 'Test Settings', extensions: ['json'] }],
        defaultPath: join(app.getPath('documents'), 'test-settings.json')
      })

      if (!result.canceled && result.filePath) {
        await fs.writeFile(
          result.filePath, 
          JSON.stringify(cleanData, null, 2),
          'utf-8'
        )
      }
    } catch (error) {
      console.error('Failed to save test settings:', error)
      throw error
    }
  }

  async loadTestSettingsFromFile() {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Test Settings', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const data = await fs.readFile(result.filePaths[0], 'utf-8')
        const settings = JSON.parse(data) as TestSettings
        await this.saveTestData(settings)
        return settings
      } catch (error) {
        console.error('Failed to load test settings:', error)
        throw error
      }
    }
    return null
  }

  async saveTestData(data: TestSettings) {
    try {
      const cleanData = JSON.parse(JSON.stringify(data))
      await fs.writeFile(this.testDataPath, JSON.stringify(cleanData, null, 2))
    } catch (error) {
      console.error('Failed to save test data:', error)
      throw error
    }
  }

  async loadTestData(): Promise<TestSettings | null> {
    try {
      const data = await fs.readFile(this.testDataPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      console.error('Failed to load test data:', error)
      throw error
    }
  }
}