<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
      <!-- 连接状态 -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center space-x-2">
          <div 
            class="w-3 h-3 rounded-full"
            :class="{
              'bg-green-500': connectionStatus === 'connected',
              'bg-yellow-500': connectionStatus === 'connecting',
              'bg-red-500': connectionStatus === 'disconnected'
            }"
          ></div>
          <span class="text-sm font-medium">{{ connectionStatusText }}</span>
        </div>
        <div v-if="studentId" class="text-sm text-gray-500">
          ID: {{ studentId }}
        </div>
      </div>

      <!-- 等待区域 -->
      <div v-if="!testStarted" class="py-8 text-center text-gray-600">
        テストの開始をお待ちください
      </div>

      <template v-else>
        <!-- 播放指示灯 -->
        <div v-if="showPlayingIndicator" class="flex justify-center space-x-8 mb-6">
          <div class="text-center">
            <div
              class="w-4 h-4 rounded-full mb-1 mx-auto transition-colors duration-300"
              :class="{ 'bg-blue-500': playingStage === 'audio1', 'bg-gray-300': playingStage !== 'audio1' }"
            ></div>
            <span class="text-xs text-gray-600">音源1</span>
          </div>
          <div class="text-center">
            <div
              class="w-4 h-4 rounded-full mb-1 mx-auto transition-colors duration-300"
              :class="{ 'bg-blue-500': playingStage === 'audio2', 'bg-gray-300': playingStage !== 'audio2' }"
            ></div>
            <span class="text-xs text-gray-600">音源2</span>
          </div>
        </div>

        <!-- 进度显示 -->
        <div class="mb-6">
          <div class="flex justify-between text-sm text-gray-600 mb-2">
            <span>問題 {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}</span>
            <span v-if="remainingTime > 0">残り {{ remainingTime }} 秒</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${(currentQuestionIndex + 1) / totalQuestions * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- 答题区域 -->
        <div v-if="canAnswer && !hasAnswered" class="space-y-4">
          <div class="text-center mb-4">
            <h3 class="text-lg font-medium">答えを選んでください</h3>
            <p class="text-sm text-gray-500 mt-1">一度選択すると変更できません</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <button
              v-for="option in currentOptions"
              :key="option.value"
              @click="submitAnswer(option.value)"
              class="p-4 text-center rounded-lg border-2 transition-colors hover:border-blue-500 hover:bg-blue-50"
              :class="{
                'border-green-500': showingAnswer && option.value === correctOption,
                'border-gray-200': !showingAnswer || option.value !== correctOption
              }"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- 回答后状态 -->
        <div v-else-if="hasAnswered" class="space-y-4">
          <p class="text-center text-gray-600">回答を送信しました</p>
          
          <!-- 回答结果指示灯 -->
          <div class="flex justify-center space-x-6">
            <div v-if="showCorrectLight" class="text-center">
              <div
                class="w-4 h-4 rounded-full mb-1 mx-auto"
                :class="{ 'bg-green-500': answerResult === 'correct' }"
              ></div>
              <span class="text-xs text-gray-600">正解</span>
            </div>
            <div v-if="showWrongLight" class="text-center">
              <div
                class="w-4 h-4 rounded-full mb-1 mx-auto"
                :class="{ 'bg-red-500': answerResult === 'wrong' }"
              ></div>
              <span class="text-xs text-gray-600">不正解</span>
            </div>
            <div v-if="showAlmostLight" class="text-center">
              <div
                class="w-4 h-4 rounded-full mb-1 mx-auto"
                :class="{ 'bg-yellow-500': answerResult === 'almost' }"
              ></div>
              <span class="text-xs text-gray-600">おしい</span>
            </div>
          </div>
        </div>

        <!-- 等待下一题 -->
        <div v-else class="text-center py-8 text-gray-600">
          次の問題をお待ちください
        </div>

        <!-- 教示文按钮 -->
        <div v-if="instruction" class="mt-6 flex justify-center">
          <button
            @click="showInstruction = true"
            class="text-blue-500 hover:text-blue-700 text-sm"
          >
            説明を表示
          </button>
        </div>
      </template>
    </div>

    <!-- 教示文对话框 -->
    <div
      v-if="showInstruction"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      @click.self="showInstruction = false"
    >
      <div class="bg-white rounded-lg max-w-lg w-full p-6">
        <div class="prose max-w-none">
          {{ instruction }}
        </div>
        <div class="mt-6 flex justify-end">
          <button
            @click="showInstruction = false"
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { WebSocketClient } from '../utils/websocket'
import type { TestOption } from '../types'

// 状态管理
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const studentId = ref('')
const testStarted = ref(false)
const playingStage = ref<'wait' | 'audio1' | 'pause' | 'audio2' | 'answer' | null>(null)
const currentQuestionIndex = ref(0)
const totalQuestions = ref(0)
const remainingTime = ref(0)
const canAnswer = ref(false)
const hasAnswered = ref(false)
const answerResult = ref<'correct' | 'wrong' | 'almost' | null>(null)
const showingAnswer = ref(false)
const correctOption = ref('')
const showInstruction = ref(false)
let answerStartTime = 0

// 配置
const currentOptions = ref<TestOption[]>([])
const instruction = ref('')
const showPlayingIndicator = ref(true)
const showCorrectLight = ref(true)
const showWrongLight = ref(true)
const showAlmostLight = ref(true)

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '接続済み'
    case 'connecting':
      return '接続中...'
    case 'disconnected':
      return '接続が切断されました'
  }
})

// WebSocket 通信
let ws: WebSocketClient | null = null

const connectToServer = () => {
  const wsUrl = `ws://${window.location.hostname}:8080`
  ws = new WebSocketClient(wsUrl)
  
  ws.on('connection-status', (status) => {
    connectionStatus.value = status
  })

  ws.on('test-start', (data) => {
    testStarted.value = true
    currentQuestionIndex.value = data.currentQuestion
    totalQuestions.value = data.test.sequences.length
    currentOptions.value = data.test.options
    instruction.value = data.test.instruction
    
    // 设置指示灯配置
    const lightSettings = data.test.lightSettings
    showPlayingIndicator.value = lightSettings.showPlayingIndicator
    showCorrectLight.value = lightSettings.showCorrectLight
    showWrongLight.value = lightSettings.showWrongLight
    showAlmostLight.value = lightSettings.showAlmostLight

    resetQuestionState()
  })

  ws.on('test-state', (state) => {
    playingStage.value = state.playingStage
    remainingTime.value = state.remainingTime
  })

  ws.on('can-answer', () => {
    canAnswer.value = true
    answerStartTime = Date.now()
  })

  ws.on('answer-result', (data) => {
    hasAnswered.value = true
    answerResult.value = data.isCorrect ? 'correct' : 'wrong'
    if (data.showAnswer) {
      showingAnswer.value = true
      correctOption.value = data.correctOption
    }
  })

  ws.on('next-question', (data) => {
    currentQuestionIndex.value = data.questionIndex
    currentOptions.value = data.options
    resetQuestionState()
  })

  ws.on('test-end', () => {
    testStarted.value = false
    resetQuestionState()
  })

  ws.connect()
}

const resetQuestionState = () => {
  hasAnswered.value = false
  canAnswer.value = false
  playingStage.value = null
  showingAnswer.value = false
  answerResult.value = null
  answerStartTime = 0
}

const submitAnswer = (option: string) => {
  if (!canAnswer.value || hasAnswered.value) return

  hasAnswered.value = true
  canAnswer.value = false
  
  ws?.send({
    type: 'answer',
    data: {
      questionId: currentQuestionIndex.value,
      option,
      timestamp: Date.now(),
      startTime: answerStartTime
    }
  })
}

// 生命周期处理
onMounted(() => {
  connectToServer()
})

onUnmounted(() => {
  if (ws) {
    ws.close()
    ws = null
  }
})
</script>