import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import type { TestData, Sequence } from '../shared/types'

interface DataError extends Error {
  code?: string
}

export class DataManager {
  private readonly dataDir: string
  private readonly testDataPath: string

  constructor(userDataPath: string) {
    this.dataDir = join(userDataPath, 'data')
    this.testDataPath = join(this.dataDir, 'test-sequences.json')
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create data directory:', error)
      throw new Error('データディレクトリの作成に失敗しました')
    }
  }

  private validateSequence(sequence: Sequence): boolean {
    return (
      typeof sequence.id === 'string' &&
      typeof sequence.name === 'string' &&
      typeof sequence.waitTime === 'number' &&
      typeof sequence.pauseTime === 'number' &&
      typeof sequence.answerTime === 'number' &&
      typeof sequence.audio1 === 'string' &&
      typeof sequence.audio2 === 'string' &&
      Array.isArray(sequence.options) &&
      sequence.options.every(opt => 
        typeof opt.value === 'string' && 
        typeof opt.label === 'string'
      ) &&
      typeof sequence.correctOption === 'string' &&
      typeof sequence.instruction === 'string' &&
      typeof sequence.lightSettings === 'object' &&
      typeof sequence.lightSettings.showPlayingIndicator === 'boolean' &&
      typeof sequence.lightSettings.showCorrectLight === 'boolean' &&
      typeof sequence.lightSettings.showWrongLight === 'boolean' &&
      typeof sequence.lightSettings.showAlmostLight === 'boolean'
    )
  }

  private cleanSequence(sequence: Sequence): Sequence {
    if (!this.validateSequence(sequence)) {
      throw new Error(`Invalid sequence data: ${sequence.id}`)
    }

    return {
      id: sequence.id,
      name: sequence.name,
      waitTime: sequence.waitTime,
      pauseTime: sequence.pauseTime,
      answerTime: sequence.answerTime,
      audio1: sequence.audio1,
      audio2: sequence.audio2,
      options: sequence.options.map(opt => ({
        value: opt.value,
        label: opt.label
      })),
      correctOption: sequence.correctOption,
      instruction: sequence.instruction,
      lightSettings: {
        showPlayingIndicator: sequence.lightSettings.showPlayingIndicator,
        showCorrectLight: sequence.lightSettings.showCorrectLight,
        showWrongLight: sequence.lightSettings.showWrongLight,
        showAlmostLight: sequence.lightSettings.showAlmostLight
      }
    }
  }

  async saveTestData(data: TestData): Promise<void> {
    if (!Array.isArray(data.sequences)) {
      throw new Error('Invalid test data format: sequences must be an array')
    }

    try {
      // Ensure directory exists
      await fs.mkdir(this.dataDir, { recursive: true })
      
      // Clean and validate data
      const cleanData: TestData = {
        sequences: data.sequences.map(seq => this.cleanSequence(seq))
      }

      await fs.writeFile(
        this.testDataPath,
        JSON.stringify(cleanData, null, 2),
        'utf-8'
      )
    } catch (error) {
      console.error('Failed to save test data:', error)
      if (error instanceof Error) {
        throw new Error(`テストデータの保存に失敗しました: ${error.message}`)
      }
      throw new Error('テストデータの保存に失敗しました')
    }
  }

  async loadTestData(): Promise<TestData> {
    try {
      await fs.access(this.testDataPath)
      const data = await fs.readFile(this.testDataPath, 'utf-8')
      const parsedData = JSON.parse(data)
      
      // Validate loaded data structure
      if (!parsedData || typeof parsedData !== 'object' || !Array.isArray(parsedData.sequences)) {
        throw new Error('Invalid test data format')
      }

      // Clean and validate each sequence
      return {
        sequences: parsedData.sequences.map(seq => this.cleanSequence(seq))
      }
    } catch (error) {
      const err = error as DataError
      // If file doesn't exist, return empty data
      if (err.code === 'ENOENT') {
        return { sequences: [] }
      }
      
      // For parsing errors
      if (error instanceof SyntaxError) {
        console.error('Failed to parse test data:', error)
        throw new Error('テストデータの形式が無効です')
      }
      
      // For validation errors
      if (error instanceof Error && error.message.includes('Invalid')) {
        throw new Error(`テストデータの検証に失敗しました: ${error.message}`)
      }
      
      // For other errors
      console.error('Failed to load test data:', error)
      throw new Error('テストデータの読み込みに失敗しました')
    }
  }

  async deleteAllData(): Promise<void> {
    try {
      await fs.rm(this.dataDir, { recursive: true, force: true })
      await this.init() // Recreate the data directory
    } catch (error) {
      console.error('Failed to delete all data:', error)
      throw new Error('データの削除に失敗しました')
    }
  }

  async backupData(backupPath: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = join(backupPath, `test-data-backup-${timestamp}.json`)
      
      // Only backup if data exists
      try {
        await fs.access(this.testDataPath)
        await fs.copyFile(this.testDataPath, backupFile)
      } catch (error) {
        const err = error as DataError
        if (err.code !== 'ENOENT') {
          throw error
        }
        // If file doesn't exist, just return without creating backup
        return
      }
    } catch (error) {
      console.error('Failed to backup data:', error)
      throw new Error('データのバックアップに失敗しました')
    }
  }
}
