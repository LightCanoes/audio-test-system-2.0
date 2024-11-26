import { join } from 'path'
import { dialog, BrowserWindow } from 'electron'
import type { AudioFile } from '../renderer/types'

export class AudioManager {
  private files: Map<string, AudioFile> = new Map()

  constructor() {}

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
        const id = `stim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const name = filePath.split(/[\\/]/).pop() || ''
        
        const audioFile = {
          id,
          path: filePath,
          name,
          originalPath: filePath,
          comment: ''
        }
        
        this.files.set(id, audioFile)
        importedFiles.push(audioFile)
      }

      return importedFiles
    }
    return []
  }

  getAudioFiles() {
    return Array.from(this.files.values())
  }

  setAudioFiles(files: AudioFile[]) {
    this.files.clear()
    for (const file of files) {
      // 确保文件路径存在
      if (file.path && file.originalPath) {
        this.files.set(file.id, {
          ...file,
          path: file.originalPath, // 使用原始路径
        })
      }
    }
  }

  deleteAudioFile(fileId: string) {
    return this.files.delete(fileId)
  }

  playAudio(fileId: string, window: BrowserWindow | null) {
    const file = this.files.get(fileId)
    if (!file || !window) return false

    window.webContents.send('audio-control', { 
      type: 'play', 
      path: file.originalPath,  // 使用原始文件路径
      id: file.id 
    })
    return true
  }

  pauseAudio(window: BrowserWindow | null) {
    if (!window) return false
    window.webContents.send('audio-control', { type: 'pause' })
    return true
  }

  resumeAudio(window: BrowserWindow | null) {
    if (!window) return false
    window.webContents.send('audio-control', { type: 'resume' })
    return true
  }

  stopAudio(window: BrowserWindow | null) {
    if (!window) return false
    window.webContents.send('audio-control', { type: 'stop' })
    return true
  }
}