<template>
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold">音声ファイル</h2>
        <button 
          @click="importAudioFiles"
          class="flex items-center px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <PlusIcon class="w-4 h-4 mr-1" />
          音声ファイルを追加
        </button>
      </div>
  
      <!-- ファイルリスト -->
      <div class="border rounded divide-y max-h-[300px] overflow-y-auto">
        <div
          v-for="file in audioFiles"
          :key="file.id"
          class="p-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div class="flex items-center space-x-3">
            <button
              v-if="isPlaying(file.id)"
              @click="stopAudio"
              class="p-1 text-red-500 hover:text-red-600"
            >
              <StopIcon class="w-5 h-5" />
            </button>
            <button
              v-else
              @click="playAudio(file.id)"
              class="p-1 text-blue-500 hover:text-blue-600"
            >
              <PlayIcon class="w-5 h-5" />
            </button>
            <span class="text-sm">{{ file.name }}</span>
          </div>
  
          <button
            @click="deleteFile(file.id)"
            class="p-1 text-red-500 hover:text-red-600"
          >
            <TrashIcon class="w-5 h-5" />
          </button>
        </div>
  
        <div 
          v-if="audioFiles.length === 0"
          class="p-4 text-center text-gray-500"
        >
          音声ファイルがありません
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { PlayIcon, StopIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/solid'
  
  interface AudioFile {
    id: string
    name: string
    path: string
  }
  
  const audioFiles = ref<AudioFile[]>([])
  const currentPlayingId = ref<string | null>(null)
  
  onMounted(async () => {
    await loadAudioFiles()
  })
  
  const loadAudioFiles = async () => {
    try {
      audioFiles.value = await window.electronAPI.getAudioFiles()
    } catch (error) {
      console.error('Failed to load audio files:', error)
    }
  }
  
  const importAudioFiles = async () => {
    try {
      const imported = await window.electronAPI.importAudioFiles()
      if (imported && imported.length > 0) {
        await loadAudioFiles()
      }
    } catch (error) {
      console.error('Failed to import audio files:', error)
    }
  }
  
  const deleteFile = async (fileId: string) => {
    try {
      if (confirm('本当に削除しますか？')) {
        await window.electronAPI.deleteAudioFile(fileId)
        await loadAudioFiles()
      }
    } catch (error) {
      console.error('Failed to delete audio file:', error)
    }
  }
  
  const playAudio = async (fileId: string) => {
    try {
      if (currentPlayingId.value) {
        await stopAudio()
      }
      await window.electronAPI.playAudio(fileId)
      currentPlayingId.value = fileId
    } catch (error) {
      console.error('Failed to play audio:', error)
    }
  }
  
  const stopAudio = async () => {
    try {
      await window.electronAPI.stopAudio()
      currentPlayingId.value = null
    } catch (error) {
      console.error('Failed to stop audio:', error)
    }
  }
  
  const isPlaying = (fileId: string) => {
    return currentPlayingId.value === fileId
  }
  </script>