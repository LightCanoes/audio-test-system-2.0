// src/main/audioManager.ts
import { join } from 'path'
import { app, dialog, BrowserWindow, protocol } from 'electron'
import { promises as fs } from 'fs'
import type { AudioFile } from '../renderer/types'

export class AudioManager {
  private files: Map<string, AudioFile> = new Map()
  private audioBasePath: string
  private currentAudio: { id: string, window: BrowserWindow | null } | null = null

  constructor(userDataPath: string) {
    if (!userDataPath) {
      throw new Error('userDataPath is required')
    }
    this.audioBasePath = join(userDataPath, 'audio')
    this.ensureAudioDirectory()
  }

  private async ensureAudioDirectory() {
    try {
      await fs.mkdir(this.audioBasePath, { recursive: true })
    } catch (error) {
      console.error('Failed to create audio directory:', error)
    }
  }

  setupProtocol() {
    if (protocol) {
      protocol.registerFileProtocol('audio', (request, callback) => {
        try {
          const filePath = decodeURI(request.url.replace('audio://', ''))
          callback({ path: filePath })
        } catch (error) {
          console.error('Protocol error:', error)
          callback({ error: -2 /* net::FAILED */ })
        }
      })
    }
  }

  async playAudio(fileId: string, window: BrowserWindow | null) {
    const file = this.files.get(fileId)
    if (!file || !window) return false

    try {
      // 检查文件是否存在
      await fs.access(file.originalPath)
      
      // 使用 audio:// 协议
      const fileUrl = `audio://${encodeURI(file.originalPath)}`
      window.webContents.send('audio-control', { 
        type: 'play', 
        path: fileUrl,
        id: file.id 
      })
      return true
    } catch (error) {
      console.error('Error playing audio:', error)
      return false
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
        const id = `stim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const name = filePath.split(/[\\/]/).pop() || ''
        
        const audioFile = {
          id,
          path: filePath,
          name,
          originalPath: filePath,  // 保持原始路径
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
      if (file.path && file.originalPath) {
        this.files.set(file.id, {
          ...file,
          path: file.originalPath, // 使用原始路径
        })
      }
    }
  }

  deleteAudioFile(fileId: string) {
    if (this.currentAudio?.id === fileId) {
      this.stopAudio(this.currentAudio.window)
    }
    return this.files.delete(fileId)
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
    this.currentAudio = null
    return true
  }
}