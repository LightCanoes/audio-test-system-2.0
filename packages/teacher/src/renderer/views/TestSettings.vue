<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">テスト設定</h1>
      <div class="flex space-x-4">
        <button
          @click="saveSettings"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          保存
        </button>
        <button
          @click="loadSettings"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          読み込み
        </button>
        <button
          @click="startTest"
          class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          テスト実行
        </button>
      </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 左側：音源管理と基本設定 -->
      <div class="space-y-6">
        <!-- 音源管理 -->
        <div class="bg-white rounded-lg shadow p-4">
          <AudioFiles @files-updated="handleAudioFilesUpdate" />
        </div>

        <!-- 基本設定 -->
        <div class="bg-white rounded-lg shadow">
          <!-- 設定タブ -->
          <div class="border-b">
            <nav class="flex -mb-px">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="currentTab = tab.id"
                class="py-4 px-6 border-b-2 font-medium text-sm"
                :class="[
                  currentTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                ]"
              >
                {{ tab.name }}
              </button>
            </nav>
          </div>

          <div class="p-4">
            <!-- 回答選択肢設定 -->
            <div v-if="currentTab === 'options'" class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="font-medium">回答選択肢</h3>
                <button
                  @click="addOption"
                  class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  選択肢を追加
                </button>
              </div>

              <div class="space-y-2">
                <div
                  v-for="(option, index) in testSettings.options"
                  :key="index"
                  class="flex items-center space-x-2"
                >
                  <input
                    v-model="option.label"
                    class="flex-grow p-2 border rounded"
                    placeholder="選択肢のラベル"
                  />
                  <button
                    @click="deleteOption(index)"
                    class="p-2 text-red-500 hover:text-red-600"
                  >
                    <TrashIcon class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- 教示文設定 -->
            <div v-if="currentTab === 'instruction'" class="space-y-4">
              <textarea
                v-model="testSettings.instruction"
                rows="4"
                class="w-full p-2 border rounded"
                placeholder="教示文を入力してください"
              ></textarea>
            </div>

            <!-- 提示灯設定 -->
            <div v-if="currentTab === 'lights'" class="space-y-4">
              <div class="space-y-2">
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="testSettings.lightSettings.showPlayingIndicator"
                  />
                  <span>音源呈示提示灯を表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="testSettings.lightSettings.showCorrectLight"
                  />
                  <span>正解提示灯を表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="testSettings.lightSettings.showWrongLight"
                  />
                  <span>不正解提示灯を表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="testSettings.lightSettings.showAlmostLight"
                  />
                  <span>おしい提示灯を表示</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：シーケンス設定 -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-medium">シーケンス設定</h3>
          <button
            @click="addSequence"
            class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            シーケンスを追加
          </button>
        </div>

        <!-- シーケンスリスト -->
        <draggable
          v-model="testSettings.sequences"
          item-key="id"
          class="space-y-4"
          handle=".drag-handle"
        >
          <template #item="{ element: sequence, index }">
            <div class="border rounded p-4">
              <div class="flex justify-between items-center mb-4">
                <div class="flex items-center space-x-2">
                  <button class="drag-handle cursor-move p-1">
                    <Bars3Icon class="w-5 h-5 text-gray-400" />
                  </button>
                  <span class="font-medium">シーケンス {{ index + 1 }}</span>
                </div>

                <div class="flex items-center space-x-2">
                  <!-- 再生コントロール -->
                  <div class="flex space-x-1">
                    <button
                      v-if="isPlaying && currentPlayingIndex === index"
                      @click="pauseSequence"
                      class="p-1 text-yellow-500 hover:text-yellow-600"
                    >
                      <PauseIcon class="w-5 h-5" />
                    </button>
                    <button
                      v-else-if="isPaused && currentPlayingIndex === index"
                      @click="resumeSequence"
                      class="p-1 text-green-500 hover:text-green-600"
                    >
                      <PlayIcon class="w-5 h-5" />
                    </button>
                    <button
                      v-else
                      @click="playSequence(index)"
                      class="p-1 text-blue-500 hover:text-blue-600"
                    >
                      <PlayIcon class="w-5 h-5" />
                    </button>
                    <button
                      v-if="currentPlayingIndex === index"
                      @click="stopSequence"
                      class="p-1 text-red-500 hover:text-red-600"
                    >
                      <StopIcon class="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    @click="deleteSequence(index)"
                    class="p-1 text-red-500 hover:text-red-600"
                  >
                    <TrashIcon class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <!-- シーケンス進行状況 -->
              <div 
                v-if="currentPlayingIndex === index" 
                class="mb-4 p-2 bg-gray-50 rounded"
              >
                <div class="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{{ currentStageText }}</span>
                  <span>{{ remainingTime }}秒</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${progressPercentage}%` }"
                  ></div>
                </div>
              </div>

              <!-- シーケンス設定フォーム -->
              <div class="space-y-4">
                <!-- タイミング設定 -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      開始待ち時間 (秒)
                    </label>
                    <input
                      v-model.number="sequence.waitTime"
                      type="number"
                      min="0"
                      step="0.5"
                      class="w-full p-2 border rounded"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      休止時間 (秒)
                    </label>
                    <input
                      v-model.number="sequence.pauseTime"
                      type="number"
                      min="0"
                      step="0.5"
                      class="w-full p-2 border rounded"
                    />
                  </div>
                </div>

                <!-- 音源設定 -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      音源1
                    </label>
                    <select
                      v-model="sequence.audio1"
                      class="w-full p-2 border rounded"
                    >
                      <option value="">選択してください</option>
                      <option 
                        v-for="file in audioFiles" 
                        :key="file.id" 
                        :value="file.id"
                      >
                        {{ file.name }}
                      </option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      音源2
                    </label>
                    <select
                      v-model="sequence.audio2"
                      class="w-full p-2 border rounded"
                    >
                      <option value="">選択してください</option>
                      <option 
                        v-for="file in audioFiles" 
                        :key="file.id" 
                        :value="file.id"
                      >
                        {{ file.name }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- 回答時間と正解選択 -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      回答時間 (秒)
                    </label>
                    <input
                      v-model.number="sequence.answerTime"
                      type="number"
                      min="1"
                      step="1"
                      class="w-full p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      正解選択肢
                    </label>
                    <select
                      v-model="sequence.correctOption"
                      class="w-full p-2 border rounded"
                    >
                      <option value="">選択してください</option>
                      <option
                        v-for="option in testSettings.options"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 空状態表示 -->
          <template #footer>
            <div 
              v-if="testSettings.sequences.length === 0"
              class="p-4 text-center text-gray-500"
            >
              シーケンスがありません
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  TrashIcon,
  Bars3Icon
} from '@heroicons/vue/24/solid'
import draggable from 'vuedraggable'
import AudioFiles from '../components/AudioFiles.vue'
import type { AudioFile, TestSettings, TestSequence } from '../types'


// 状态管理
const audioFiles = ref<AudioFile[]>([])
const currentPlayingIndex = ref(-1)
const isPlaying = ref(false)
const isPaused = ref(false)
const remainingTime = ref(0)
const currentStage = ref<'wait' | 'audio1' | 'pause' | 'audio2' | null>(null)

// 设定标签页
const tabs = [
  { id: 'options', name: '回答選択肢' },
  { id: 'instruction', name: '教示文' },
  { id: 'lights', name: '提示灯' }
]
const currentTab = ref('options')

// 初期設定
const testSettings = ref<TestSettings>({
  instruction: '',
  options: [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' }
  ],
  sequences: [],
  lightSettings: {
    showPlayingIndicator: true,
    showCorrectLight: true,
    showWrongLight: true,
    showAlmostLight: false
  }
})

// タイマー管理
let countdownInterval: NodeJS.Timer | null = null
let sequenceTimeout: NodeJS.Timeout | null = null

// 计算属性
const currentStageText = computed(() => {
  switch (currentStage.value) {
    case 'wait':
      return '開始待ち'
    case 'audio1':
      return '音源1再生中'
    case 'pause':
      return '休止中'
    case 'audio2':
      return '音源2再生中'
    default:
      return ''
  }
})

const progressPercentage = computed(() => {
  const sequence = testSettings.value.sequences[currentPlayingIndex.value]
  if (!sequence || remainingTime.value === 0) return 0

  let totalTime = 0
  switch (currentStage.value) {
    case 'wait':
      totalTime = sequence.waitTime
      break
    case 'pause':
      totalTime = sequence.pauseTime
      break
    case 'audio1':
    case 'audio2':
      totalTime = 0 // 音声再生時は不明
      break
    default:
      return 0
  }

  return totalTime > 0 ? (remainingTime.value / totalTime) * 100 : 0
})

// シーケンス管理
const createNewSequence = (): TestSequence => {
  return {
    id: Date.now().toString(), // draggableのために必要
    waitTime: 2,
    pauseTime: 1,
    answerTime: 5,
    audio1: '',
    audio2: '',
    correctOption: ''
  }
}

const addSequence = () => {
  testSettings.value.sequences.push(createNewSequence())
}

const deleteSequence = (index: number) => {
  if (confirm('このシーケンスを削除しますか？')) {
    if (currentPlayingIndex.value === index) {
      stopSequence()
    }
    testSettings.value.sequences.splice(index, 1)
  }
}

// 選択肢管理
const addOption = () => {
  const lastOption = testSettings.value.options[testSettings.value.options.length - 1]
  const nextValue = String.fromCharCode(lastOption.label.charCodeAt(0) + 1)
  
  testSettings.value.options.push({
    value: nextValue,
    label: nextValue
  })
}

const deleteOption = (index: number) => {
  if (testSettings.value.options.length <= 2) {
    alert('最低2つの選択肢が必要です')
    return
  }
  
  const optionToDelete = testSettings.value.options[index]
  testSettings.value.options.splice(index, 1)
  
  // 削除した選択肢が正解だった場合、正解を更新
  testSettings.value.sequences.forEach(sequence => {
    if (sequence.correctOption === optionToDelete.value) {
      sequence.correctOption = testSettings.value.options[0].value
    }
  })
}

// シーケンス再生制御
const playSequence = async (index: number) => {
  currentPlayingIndex.value = index
  isPlaying.value = true
  isPaused.value = false
  
  const sequence = testSettings.value.sequences[index]
  
  try {
    // 開始待ち時間
    currentStage.value = 'wait'
    remainingTime.value = sequence.waitTime
    await startTimer(sequence.waitTime * 1000)

    if (!isPlaying.value) return

    // 音源1の再生
    currentStage.value = 'audio1'
    await window.electronAPI.playAudio(sequence.audio1)

    if (!isPlaying.value) return

    // 休止時間
    currentStage.value = 'pause'
    remainingTime.value = sequence.pauseTime
    await startTimer(sequence.pauseTime * 1000)

    if (!isPlaying.value) return

    // 音源2の再生
    currentStage.value = 'audio2'
    await window.electronAPI.playAudio(sequence.audio2)

    // 再生完了
    stopSequence()
  } catch (error) {
    console.error('Error playing sequence:', error)
    stopSequence()
  }
}

const pauseSequence = async () => {
  isPlaying.value = false
  isPaused.value = true
  clearTimeouts()
  await window.electronAPI.pauseAudio()
}

const resumeSequence = async () => {
  isPlaying.value = true
  isPaused.value = false
  await window.electronAPI.resumeAudio()
  continueSequence()
}

const stopSequence = () => {
  isPlaying.value = false
  isPaused.value = false
  currentPlayingIndex.value = -1
  currentStage.value = null
  remainingTime.value = 0
  clearTimeouts()
  window.electronAPI.stopAudio()
}

const continueSequence = () => {
  const sequence = testSettings.value.sequences[currentPlayingIndex.value]
  if (!sequence) return

  switch (currentStage.value) {
    case 'wait':
      playSequence(currentPlayingIndex.value)
      break
    case 'pause':
      startTimer(remainingTime.value * 1000)
      break
    // audio1とaudio2は音声再生中なので制御不要
  }
}

// タイマー制御
const startTimer = (duration: number) => {
  return new Promise<void>((resolve) => {
    if (countdownInterval) clearInterval(countdownInterval)
    
    const startTime = Date.now()
    const endTime = startTime + duration
    
    countdownInterval = setInterval(() => {
      if (!isPlaying.value) return

      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      
      remainingTime.value = Math.ceil(remaining / 1000)
      
      if (remaining <= 0) {
        if (countdownInterval) clearInterval(countdownInterval)
        resolve()
      }
    }, 100)
  })
}

const clearTimeouts = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  if (sequenceTimeout) {
    clearTimeout(sequenceTimeout)
    sequenceTimeout = null
  }
}

// ファイル操作
const saveSettings = async () => {
  try {
    await window.electronAPI.saveTestSettingsToFile()
  } catch (error) {
    console.error('Error saving settings:', error)
    alert('設定の保存に失敗しました')
  }
}

const loadSettings = async () => {
  try {
    const settings = await window.electronAPI.loadTestSettingsFromFile()
    if (settings) {
      testSettings.value = settings
      await loadAudioFiles()
    }
  } catch (error) {
    console.error('Error loading settings:', error)
    alert('設定の読み込みに失敗しました')
  }
}

// テスト開始
const startTest = async () => {
  try {
    // バリデーション
    if (testSettings.value.sequences.length === 0) {
      alert('少なくとも1つのシーケンスを追加してください')
      return
    }

    for (let i = 0; i < testSettings.value.sequences.length; i++) {
      const seq = testSettings.value.sequences[i]
      if (!seq.audio1 || !seq.audio2) {
        alert(`シーケンス${i + 1}の音源が選択されていません`)
        return
      }
      if (!seq.correctOption) {
        alert(`シーケンス${i + 1}の正解が選択されていません`)
        return
      }
    }

    await window.electronAPI.createTestWindow(testSettings.value)
  } catch (error) {
    console.error('Error starting test:', error)
    alert('テストの開始に失敗しました')
  }
}

// 音声ファイル管理
const handleAudioFilesUpdate = (files: AudioFile[]) => {
  audioFiles.value = files
}

// 初期化とクリーンアップ
onMounted(async () => {
  try {
    await loadAudioFiles()
    const savedData = await window.electronAPI.loadTestData()
    if (savedData) {
      testSettings.value = savedData
    }
  } catch (error) {
    console.error('Error loading initial data:', error)
  }
})

const loadAudioFiles = async () => {
  try {
    audioFiles.value = await window.electronAPI.getAudioFiles()
  } catch (error) {
    console.error('Error loading audio files:', error)
  }
}

onUnmounted(() => {
  clearTimeouts()
})
</script>