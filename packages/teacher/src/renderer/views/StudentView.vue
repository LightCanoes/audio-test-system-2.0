<template>
    <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <!-- 学生信息和连接状态 -->
        <div class="flex items-center justify-between">
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
  
        <!-- 音源再生インジケーター -->
        <div v-if="testState === 'started'" class="mt-4 flex justify-center space-x-8">
          <div class="text-center">
            <div
              class="w-4 h-4 rounded-full mb-1 mx-auto"
              :class="{ 'bg-blue-500': currentAudio === 1, 'bg-gray-300': currentAudio !== 1 }"
              v-show="showPlayingIndicator"
            ></div>
            <span class="text-xs text-gray-600">音源1</span>
          </div>
          <div class="text-center">
            <div
              class="w-4 h-4 rounded-full mb-1 mx-auto"
              :class="{ 'bg-blue-500': currentAudio === 2, 'bg-gray-300': currentAudio !== 2 }"
              v-show="showPlayingIndicator"
            ></div>
            <span class="text-xs text-gray-600">音源2</span>
          </div>
        </div>
  
        <!-- 回答提示灯 -->
        <div v-if="testState === 'started'" class="mt-4 flex justify-center space-x-4">
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
  
        <!-- テスト進行中 -->
        <div v-if="testState === 'started'" class="mt-6 space-y-6">
          <!-- プログレスバー -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm text-gray-600">
              <span>設問</span>
              <span>{{ currentQuestionIndex + 1 }} / {{ totalQuestions }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }"
              ></div>
            </div>
          </div>
  
          <!-- 解答パネル -->
          <div v-if="!hasAnswered && canAnswer" class="space-y-4">
            <div class="text-center">
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
                  'border-green-500': showCorrectAnswer && option.value === correctOption,
                  'border-gray-200': !showCorrectAnswer || option.value !== correctOption
                }"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
  
          <div v-else-if="hasAnswered" class="text-center py-8 text-gray-600">
            回答を送信しました
            <div v-if="showCorrectAnswer" class="mt-2 text-sm">
              正解: {{ getOptionLabel(correctOption) }}
            </div>
          </div>
  
          <div v-else class="text-center py-8 text-gray-600">
            回答待機中...
          </div>
        </div>
  
        <!-- テスト待機中 -->
        <div v-else class="mt-6">
          <div class="text-center py-8 text-gray-600">
            {{ testState === 'ended' ? 'テストは終了しました' : 'テストを開始するまでお待ちください' }}
          </div>
        </div>
  
        <!-- 教示文ボタン -->
        <div v-if="instruction" class="mt-6 flex justify-center">
          <button
            @click="showInstruction = true"
            class="text-blue-500 hover:text-blue-700 text-sm"
          >
            説明を表示
          </button>
        </div>
      </div>
  
      <!-- 教示文ダイアログ -->
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
  import type { TestOption, TestSettings } from '../types'
  
  // 状態管理
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
  const studentId = ref('')
  const testState = ref<'waiting' | 'started' | 'ended'>('waiting')
  const currentQuestionIndex = ref(0)
  const totalQuestions = ref(0)
  const currentAudio = ref(0)  // 0: none, 1: first, 2: second
  const hasAnswered = ref(false)
  const canAnswer = ref(false)
  const showCorrectAnswer = ref(false)
  const correctOption = ref('')
  const answerResult = ref<'correct' | 'wrong' | 'almost' | null>(null)
  const showInstruction = ref(false)
  
  // テスト設定
  const currentOptions = ref<Array<{ value: string, label: string }>>([])
  const instruction = ref('')
  const showPlayingIndicator = ref(true)
  const showCorrectLight = ref(true)
  const showWrongLight = ref(true)
  const showAlmostLight = ref(true)
  
  let ws: WebSocketClient | null = null
  
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
  
  const getOptionLabel = (value: string) => {
    return currentOptions.value.find(opt => opt.value === value)?.label || value
  }
  
  // WebSocket 接続の設定
  onMounted(() => {
    ws = new WebSocketClient('ws://localhost:8080')
    
    ws.on('connected', (message) => {
      studentId.value = message.id
      connectionStatus.value = 'connected'
    })
  
    ws.on('test-start', (message) => {
      testState.value = 'started'
      currentQuestionIndex.value = message.currentQuestionIndex
      totalQuestions.value = message.totalQuestions
      currentOptions.value = message.options
      instruction.value = message.instruction
      showPlayingIndicator.value = message.lightSettings.showPlayingIndicator
      showCorrectLight.value = message.lightSettings.showCorrectLight
      showWrongLight.value = message.lightSettings.showWrongLight
      showAlmostLight.value = message.lightSettings.showAlmostLight
      resetQuestionState()
    })
  
    ws.on('audio-state', (message) => {
      currentAudio.value = message.audioIndex
    })
  
    ws.on('can-answer', (message) => {
      canAnswer.value = true
    })
  
    ws.on('question-end', (message) => {
      correctOption.value = message.correctOption
      showCorrectAnswer.value = true
    })
  
    ws.on('next-question', (message) => {
      currentQuestionIndex.value = message.questionIndex
      resetQuestionState()
    })
  
    ws.on('test-end', () => {
      testState.value = 'ended'
      resetQuestionState()
    })
  
    ws.on('answer-result', (message) => {
      answerResult.value = message.result
    })
  
    ws.connect()
  })
  
  onUnmounted(() => {
    ws?.close()
  })
  
  const resetQuestionState = () => {
    hasAnswered.value = false
    canAnswer.value = false
    currentAudio.value = 0
    showCorrectAnswer.value = false
    answerResult.value = null
  }
  
  const submitAnswer = (option: string) => {
    if (!ws || !canAnswer.value || hasAnswered.value) return
  
    ws.send({
      type: 'answer',
      answer: {
        questionId: currentQuestionIndex.value,
        option,
        timestamp: Date.now()
      }
    })
  
    hasAnswered.value = true
  }
  </script>