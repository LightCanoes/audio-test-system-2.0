<template>
  <div style="display: none;">
    <audio ref="audioEl" @ended="handleEnded" />
  </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { store } from '../store'
import type { Store } from '../store'

interface AudioError extends Error {
  code?: number
  message: string
}

const audioEl: Ref<HTMLAudioElement | null> = ref(null)
let cleanupPlayListener: (() => void) | null = null
let cleanupStopListener: (() => void) | null = null

onMounted(() => {
  if (window.electronAPI?.onPlayAudio) {
    cleanupPlayListener = window.electronAPI.onPlayAudio((path: string) => {
      if (audioEl.value) {
        audioEl.value.src = path
        audioEl.value.play().catch((error: AudioError) => {
          console.error('Failed to play audio:', error)
          store.setError(`音声の再生に失敗しました: ${error.message}`)
        })
      }
    })
  }

  if (window.electronAPI?.onStopAudio) {
    cleanupStopListener = window.electronAPI.onStopAudio(() => {
      if (audioEl.value) {
        audioEl.value.pause()
        audioEl.value.currentTime = 0
      }
    })
  }
})

const handleEnded = (): void => {
  if (store.state.currentAudio.id) {
    store.setCurrentAudio(null, false)
  }
}

onUnmounted(() => {
  if (typeof cleanupPlayListener === 'function') {
    cleanupPlayListener()
  }
  
  if (typeof cleanupStopListener === 'function') {
    cleanupStopListener()
  }
  
  if (audioEl.value) {
    audioEl.value.pause()
    audioEl.value.src = ''
  }
})
</script>
