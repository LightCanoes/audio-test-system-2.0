<template>
  <div>
    <h2 class="text-xl font-bold mb-4">刺激リスト</h2>
    <div class="border rounded overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-2 py-1 border-b text-left w-20">ID</th>
            <th class="px-2 py-1 border-b text-left w-[60%]">オリジナルファイル</th>
            <th class="px-2 py-1 border-b text-left w-24">コメント</th>
            <th class="px-2 py-1 border-b w-16"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(file, index) in audioFiles" :key="file.id" class="hover:bg-gray-50">
            <td class="px-2 py-1 border-b">刺激{{ index + 1 }}</td>
            <td class="px-2 py-1 border-b">{{ file.name }}</td>
            <td class="px-2 py-1 border-b">
              <input
                type="text"
                v-model="file.comment"
                class="w-full p-1 text-sm border rounded"
              />
            </td>
            <td class="px-2 py-1 border-b">
              <div class="flex space-x-1">
                <button
                  v-if="isAudioPlaying(file.id)"
                  @click="stopAudio"
                  class="p-1 text-red-500 hover:text-red-600"
                >
                  <StopIcon class="w-4 h-4" />
                </button>
                <button
                  v-else
                  @click="playAudio(file.id)"
                  class="p-1 text-blue-500 hover:text-blue-600"
                >
                  <PlayIcon class="w-4 h-4" />
                </button>
                <button
                  @click="deleteFile(file.id)"
                  class="p-1 text-red-500 hover:text-red-600"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-2 flex justify-end">
      <button 
        @click="importAudioFiles"
        class="flex items-center px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        <PlusIcon class="w-4 h-4 mr-1" />
        追加
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PlayIcon, StopIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/solid'
import type { AudioFile } from '../types'

const audioFiles = ref<AudioFile[]>([])
const currentPlayingId = ref<string | null>(null)

// HTMLAudioElement for client-side playback
let audioElement: HTMLAudioElement | null = null

const emit = defineEmits<{
  (e: 'filesUpdated', files: AudioFile[]): void
}>()

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
  const cleanup = window.electronAPI.onAudioControl((event: any) => {
    switch (event.type) {
      case 'play':
        playLocalAudio(event.path, event.id)
        break
      case 'pause':
        if (audioElement) {
          audioElement.pause()
        }
        break
      case 'resume':
        if (audioElement) {
          audioElement.play()
        }
        break
      case 'stop':
        if (audioElement) {
          audioElement.pause()
          audioElement.currentTime = 0
          audioElement = null
          currentPlayingId.value = null
        }
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
  
  audioElement = new Audio()
  audioElement.src = path
  audioElement.onended = () => {
    currentPlayingId.value = null
  }
  
  audioElement.play().catch(error => {
    console.error('Error playing audio:', error)
    currentPlayingId.value = null
  })
  
  currentPlayingId.value = id
}

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
    await window.electronAPI.importAudioFiles()
    await loadAudioFiles()
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

const isAudioPlaying = (fileId: string) => {
  return currentPlayingId.value === fileId
}
</script>