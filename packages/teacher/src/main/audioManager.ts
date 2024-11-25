import type { BrowserWindow, Dialog } from 'electron'
import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

interface AudioFile {
  id: string
  name: string
  path: string
  originalPath: string
}

export class AudioManager {
  private audioDir: string
  private files: Map<string, AudioFile> = new Map()
  private mainWindow: BrowserWindow | null = null
  private audioPlayer: HTMLAudioElement | null = null
  private validAudioFormats = ['.wav', '.mp3']

  constructor(userDataPath: string) {
    this.audioDir = path.join(userDataPath, 'audio')
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private async validateAudioFile(filePath: string): Promise<boolean> {
    try {
      // Check if file exists
      await fs.promises.access(filePath)
      
      // Check file extension
      const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'))
      if (!this.validAudioFormats.includes(ext)) {
        throw new Error('Unsupported audio format')
      }
      
      // Check file size (max 100MB)
      const stats = await fs.promises.stat(filePath)
      if (stats.size > 100 * 1024 * 1024) {
        throw new Error('Audio file too large')
      }
      
      return true
    } catch (error) {
      console.error('Audio validation failed:', error)
      return false
    }
  }

  async loadInitialFiles() {
    try {
      await fs.promises.mkdir(this.audioDir, { recursive: true })
      const files = await fs.promises.readdir(this.audioDir)
      
      for (const file of files) {
        if (this.validAudioFormats.includes(file.toLowerCase().slice(file.lastIndexOf('.')))) {
          const filePath = path.join(this.audioDir, file)
          const id = file.split('_')[0] // Extract UUID from filename
          
          if (await this.validateAudioFile(filePath)) {
            this.files.set(id, {
              id,
              path: filePath,
              name: file.split('_')[1] || file, // Get original name if exists
              originalPath: filePath
            })
          } else {
            console.error(`Invalid audio file: ${file}`)
            // Optionally move invalid files to a separate directory
            const invalidDir = path.join(this.audioDir, 'invalid')
            await fs.promises.mkdir(invalidDir, { recursive: true })
            await fs.promises.rename(filePath, path.join(invalidDir, file))
          }
        }
      }
    } catch (error) {
      console.error('Failed to load initial files:', error)
      this.mainWindow?.webContents.send('audio-error', 'Failed to load audio files')
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
      const errors: string[] = []
      
      for (const filePath of result.filePaths) {
        const id = uuidv4()
        const originalName = filePath.split(/[\\/]/).pop() || ''
        const newName = `${id}_${originalName}`
        const newPath = path.join(this.audioDir, newName)

        try {
          if (await this.validateAudioFile(filePath)) {
            await fs.promises.copyFile(filePath, newPath)
            const audioFile = {
              id,
              path: newPath,
              name: originalName,
              originalPath: filePath
            }
            this.files.set(id, audioFile)
            importedFiles.push(audioFile)
          } else {
            errors.push(`Invalid audio file: ${originalName}`)
          }
        } catch (error) {
          console.error(`Failed to import file ${filePath}:`, error)
          errors.push(`Failed to import: ${originalName}`)
        }
      }

      if (errors.length > 0) {
        this.mainWindow?.webContents.send('audio-error', errors.join('\n'))
      }

      return importedFiles
    }
    return []
  }

  async deleteAudioFile(fileId: string) {
    const file = this.files.get(fileId)
    if (!file) return false

    try {
      await fs.promises.unlink(file.path)
      this.files.delete(fileId)
      return true
    } catch (error) {
      console.error(`Failed to delete file ${fileId}:`, error)
      this.mainWindow?.webContents.send('audio-error', `Failed to delete audio file: ${file.name}`)
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

  async playAudio(fileId: string) {
    try {
      const file = this.files.get(fileId)
      if (!file) {
        throw new Error('Audio file not found')
      }

      if (!await this.validateAudioFile(file.path)) {
        throw new Error('Invalid audio file')
      }

      // Clean up existing audio player
      this.stopAudio()

      this.audioPlayer = new Audio(file.path)
      await this.audioPlayer.play()
      
      // Set up event listeners for error handling
      this.audioPlayer.onerror = (error) => {
        console.error('Audio playback error:', error)
        this.mainWindow?.webContents.send('audio-error', 'Audio playback failed')
        this.stopAudio()
      }

      // Clean up when playback ends
      this.audioPlayer.onended = () => {
        this.stopAudio()
        this.mainWindow?.webContents.send('audio-ended', fileId)
      }
      
      return true
    } catch (error) {
      console.error('Failed to play audio:', error)
      this.mainWindow?.webContents.send('audio-error', error instanceof Error ? error.message : 'Failed to play audio')
      return false
    }
  }

  stopAudio() {
    if (this.audioPlayer) {
      // Remove event listeners
      this.audioPlayer.onerror = null
      this.audioPlayer.onended = null
      
      // Stop playback
      this.audioPlayer.pause()
      this.audioPlayer.currentTime = 0
      
      // Clean up
      this.audioPlayer = null
    }
    this.mainWindow?.webContents.send('audio-stopped')
    return true
  }

  // Clean up resources
  dispose() {
    this.stopAudio()
    this.mainWindow = null
    this.files.clear()
  }
}
