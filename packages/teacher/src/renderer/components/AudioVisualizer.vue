// src/renderer/components/AudioVisualizer.vue
<template>
  <div class="w-full h-24 bg-gray-100 rounded-lg relative overflow-hidden">
    <canvas
      ref="canvas"
      class="w-full h-full absolute top-0 left-0"
    ></canvas>
    <div
      class="absolute inset-0 flex items-center justify-center"
      v-if="!isPlaying"
    >
      <span class="text-gray-500">波形表示</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  isPlaying: boolean
  audioElement: HTMLAudioElement | null
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let source: MediaElementAudioSourceNode | null = null
let animationFrame: number | null = null

onMounted(() => {
  if (!canvas.value) return

  audioContext = new AudioContext()
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048

  if (props.audioElement) {
    setupAudioAnalyser()
  }
})

watch(() => props.audioElement, (newAudio) => {
  if (newAudio) {
    setupAudioAnalyser()
  }
})

watch(() => props.isPlaying, (playing) => {
  if (playing) {
    startVisualization()
  } else {
    stopVisualization()
  }
})

const setupAudioAnalyser = () => {
  if (!audioContext || !analyser || !props.audioElement) return

  source?.disconnect()
  source = audioContext.createMediaElementSource(props.audioElement)
  source.connect(analyser)
  analyser.connect(audioContext.destination)
}

const startVisualization = () => {
  if (!canvas.value || !analyser) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  const draw = () => {
    if (!ctx || !canvas.value) return

    animationFrame = requestAnimationFrame(draw)

    analyser?.getByteTimeDomainData(dataArray)

    ctx.fillStyle = 'rgb(249, 250, 251)'
    ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)

    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgb(59, 130, 246)'
    ctx.beginPath()

    const sliceWidth = canvas.value.width / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = (v * canvas.value.height) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.lineTo(canvas.value.width, canvas.value.height / 2)
    ctx.stroke()
  }

  draw()
}

const stopVisualization = () => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

onUnmounted(() => {
  stopVisualization()
  source?.disconnect()
  audioContext?.close()
})
</script>