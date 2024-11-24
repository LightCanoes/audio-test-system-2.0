import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import type { TestSettings } from '../renderer/types'

export class DataManager {
  private dataDir: string
  private testDataPath: string

  constructor(userDataPath: string) {
    this.dataDir = join(userDataPath, 'data')
    this.testDataPath = join(this.dataDir, 'test-sequences.json')
  }

  async init() {
    try {
      // 创建数据目录（如果不存在）
      await fs.mkdir(this.dataDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create data directory:', error)
    }
  }

  async saveTestData(data: TestSettings) {
    try {
      // 移除循环引用并序列化
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