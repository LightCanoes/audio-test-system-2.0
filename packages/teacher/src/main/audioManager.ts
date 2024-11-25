import { join } from 'path'
import { promises as fs } from 'fs'
import { app, dialog, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { AudioFile } from '../types'

export class AudioManager {
  private audioDir: string
  private files: Map<string, AudioFile> = new Map()

  constructor(userDataPath: string) {
    this.audioDir = join(userDataPath, 'audio')
  }

  async loadInitialFiles() {
    try {
      await fs.mkdir(this.audioDir, { recursive: true })
      const files = await fs.readdir(this.audioDir)
      
      for (const file of files) {
        if (file.endsWith('.wav') || file.endsWith('.mp3')) {
          const filePath = join(this.audioDir, file)
          const id = file.split('_')[0]
          this.files.set(id, {
            id,
            path: filePath,
            name: file.split('_')[1] || file,
            originalPath: filePath
          })
        }
      }
    } catch (error) {
      console.error('Failed to load initial files:', error)
    }
  }

  async importAudioFiles() {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio Files', extensions: ['wav', 'mp3'] }
      ]
    })

    if (!result.canceled) {
      const importedFiles: AudioFile[] = []
      
      for (const filePath of result.filePaths) {
        const id = uuidv4()
        const originalName = filePath.split(/[\\/]/).pop() || ''
        const newName = `${id}_${originalName}`
        const newPath = join(this.audioDir, newName)

        try {
          await fs.copyFile(filePath, newPath)
          const audioFile = {
            id,
            path: newPath,
            name: originalName,
            originalPath: filePath
          }
          this.files.set(id, audioFile)
          importedFiles.push(audioFile)
        } catch (error) {
          console.error(`Failed to import file ${filePath}:`, error)
        }
      }

      return importedFiles
    }
    return []
  }

  async deleteAudioFile(fileId: string) {
    const file = this.files.get(fileId)
    if (!file) return false

    try {
      await fs.unlink(file.path)
      this.files.delete(fileId)
      return true
    } catch (error) {
      console.error(`Failed to delete file ${fileId}:`, error)
      return false
    }
  }

  async getAudioFiles(fileIds?: string[]) {
    if (fileIds) {
      return fileIds
        .map(id => this.files.get(id))
        .filter((file): file is AudioFile => file !== undefined)
    }
    return Array.from(this.files.values())
  }

  // 音频播放控制
  playAudio(fileId: string) {
    const file = this.files.get(fileId)
    if (!file) return false

    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.webContents.send('audio-control', { type: 'play', path: file.path, id: file.id })
      return true
    }
    return false
  }

  pauseAudio() {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.webContents.send('audio-control', { type: 'pause' })
      return true
    }
    return false
  }

  resumeAudio() {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.webContents.send('audio-control', { type: 'resume' })
      return true
    }
    return false
  }

  stopAudio() {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.webContents.send('audio-control', { type: 'stop' })
      return true
    }
    return false
  }
}