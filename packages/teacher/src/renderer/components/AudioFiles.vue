<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold">音声ファイル</h2>
      <button 
        @click="importAudioFiles"
        class="flex items-center px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        :disabled="loading"
      >
        <PlusIcon class="w-4 h-4 mr-1" />
        音声ファイルを追加
      </button>
    </div>

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
            :disabled="loading"
          >
            <StopIcon class="w-5 h-5" />
          </button>
          <button
            v-else
            @click="playAudio(file.id)"
            class="p-1 text-blue-500 hover:text-blue-600"
            :disabled="loading"
          >
            <PlayIcon class="w-5 h-5" />
          </button>
          <span class="text-sm">{{ file.name }}</span>
        </div>

        <button
          @click="deleteFile(file.id)"
          class="p-1 text-red-500 hover:text-red-600"
          :disabled="loading"
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
import type { Ref } from 'vue'
import { PlayIcon, StopIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/solid'
import { store } from '../store'
import type { AudioFile } from '../types'

const audioFiles: Ref<AudioFile[]> = ref([])
const loading: Ref<boolean> = ref(false)

onMounted(async () => {
  await loadAudioFiles()
})

const loadAudioFiles = async (): Promise<void> => {
  try {
    loading.value = true
    store.setError(null)
    audioFiles.value = await window.electronAPI.getAudioFiles()
  } catch (error) {
    console.error('Failed to load audio files:', error)
    store.setError('音声ファイルの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
}

const importAudioFiles = async (): Promise<void> => {
  try {
    loading.value = true
    store.setError(null)
    const imported = await window.electronAPI.importAudioFiles()
    if (imported && imported.length > 0) {
      await loadAudioFiles()
    }
  } catch (error) {
    console.error('Failed to import audio files:', error)
    store.setError('音声ファイルのインポートに失敗しました')
  } finally {
    loading.value = false
  }
}

const deleteFile = async (fileId: string): Promise<void> => {
  if (!confirm('このファイルを削除しますか？')) return

  try {
    loading.value = true
    store.setError(null)
    await window.electronAPI.deleteAudioFile(fileId)
    await loadAudioFiles()
  } catch (error) {
    console.error('Failed to delete audio file:', error)
    store.setError('音声ファイルの削除に失敗しました')
  } finally {
    loading.value = false
  }
}

const playAudio = async (fileId: string): Promise<void> => {
  try {
    loading.value = true
    store.setError(null)
    const success = await window.electronAPI.playAudio(fileId)
    if (success) {
      store.setCurrentAudio(fileId, true)
    }
  } catch (error) {
    console.error('Failed to play audio:', error)
    store.setError('音声の再生に失敗しました')
  } finally {
    loading.value = false
  }
}

const stopAudio = async (): Promise<void> => {
  try {
    loading.value = true
    store.setError(null)
    const success = await window.electronAPI.stopAudio()
    if (success) {
      store.setCurrentAudio(null, false)
    }
  } catch (error) {
    console.error('Failed to stop audio:', error)
    store.setError('音声の停止に失敗しました')
  } finally {
    loading.value = false
  }
}

const isPlaying = (fileId: string): boolean => {
  return store.state.currentAudio.id === fileId && store.state.currentAudio.isPlaying
}

// Cleanup
onUnmounted(async () => {
  if (store.state.currentAudio.isPlaying) {
    await stopAudio()
  }
})

// Emit the selected audio file ID when needed
defineEmits<{
  (event: 'select', fileId: string): void
}>()
</script>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
