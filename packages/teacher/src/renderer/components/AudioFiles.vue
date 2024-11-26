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
          <!-- 再生コントロール -->
          <div class="flex space-x-1">
            <button
              v-if="isPlaying(file.id) && !isPaused(file.id)"
              @click="pauseAudio"
              class="p-1 text-blue-500 hover:text-blue-600"
            >
              <PauseIcon class="w-5 h-5" />
            </button>
            <button
              v-else-if="isPaused(file.id)"
              @click="resumeAudio"
              class="p-1 text-blue-500 hover:text-blue-600"
            >
              <PlayIcon class="w-5 h-5" />
            </button>
            <button
              v-else
              @click="playAudio(file.id)"
              class="p-1 text-blue-500 hover:text-blue-600"
            >
              <PlayIcon class="w-5 h-5" />
            </button>
            <button
              v-if="isPlaying(file.id)"
              @click="stopAudio"
              class="p-1 text-red-500 hover:text-red-600"
            >
              <StopIcon class="w-5 h-5" />
            </button>
          </div>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { PlayIcon, PauseIcon, StopIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/solid'
import type { AudioFile } from '../types'

const audioFiles = ref<AudioFile[]>([])
const currentPlayingId = ref<string | null>(null)
const isPausedState = ref(false)

// HTMLAudioElement for client-side playback
let audioElement: HTMLAudioElement | null = null

onMounted(async () => {
  await loadAudioFiles()
  setupAudioControls()
})

onUnmounted(() => {
  if (audioElement) {
    audioElement.pause()
    audioElement = null
  }
})

const setupAudioControls = () => {
  // Listen for audio control events from the main process
  const cleanup = window.electronAPI.onAudioControl((event: any) => {
    switch (event.type) {
      case 'play':
        playLocalAudio(event.path, event.id)
        break
      case 'pause':
        pauseLocalAudio()
        break
      case 'resume':
        resumeLocalAudio()
        break
      case 'stop':
        stopLocalAudio()
        break
    }
  })

  onUnmounted(() => {
    cleanup()
  })
}

const playLocalAudio = (path: string, id: string) => {
  if (audioElement) {
    audioElement.pause()
    audioElement = null
  }
  
  audioElement = new Audio(path)
  audioElement.onended = () => {
    currentPlayingId.value = null
    isPausedState.value = false
  }
  audioElement.play()
  currentPlayingId.value = id
  isPausedState.value = false
}

const pauseLocalAudio = () => {
  if (audioElement) {
    audioElement.pause()
    isPausedState.value = true
  }
}

const resumeLocalAudio = () => {
  if (audioElement) {
    audioElement.play()
    isPausedState.value = false
  }
}

const stopLocalAudio = () => {
  if (audioElement) {
    audioElement.pause()
    audioElement.currentTime = 0
    audioElement = null
    currentPlayingId.value = null
    isPausedState.value = false
  }
}

const emit = defineEmits<{
  (e: 'filesUpdated', files: AudioFile[]): void
}>()

const loadAudioFiles = async () => {
  try {
    audioFiles.value = await window.electronAPI.getAudioFiles()
    emit('filesUpdated', audioFiles.value)
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
      if (currentPlayingId.value === fileId) {
        await stopAudio()
      }
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
    isPausedState.value = false
  } catch (error) {
    console.error('Failed to play audio:', error)
  }
}

const pauseAudio = async () => {
  try {
    await window.electronAPI.pauseAudio()
    isPausedState.value = true
  } catch (error) {
    console.error('Failed to pause audio:', error)
  }
}

const resumeAudio = async () => {
  try {
    await window.electronAPI.resumeAudio()
    isPausedState.value = false
  } catch (error) {
    console.error('Failed to resume audio:', error)
  }
}

const stopAudio = async () => {
  try {
    await window.electronAPI.stopAudio()
    currentPlayingId.value = null
    isPausedState.value = false
  } catch (error) {
    console.error('Failed to stop audio:', error)
  }
}

const isPlaying = (fileId: string) => {
  return currentPlayingId.value === fileId
}

const isPaused = (fileId: string) => {
  return isPlaying(fileId) && isPausedState.value
}
</script>