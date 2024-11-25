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
          @click="startTest"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          テスト実行
        </button>
      </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 左側：音源管理 -->
      <div>
        <div class="bg-white rounded-lg shadow p-4">
          <AudioFiles @select="handleAudioSelect" />
        </div>
      </div>

      <!-- 右側：基本設定 -->
      <div class="space-y-6">
        <!-- 基本設定（タブ付き） -->
        <div class="bg-white rounded-lg shadow">
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
              <div class="flex items-center justify-between">
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

        <!-- シーケンス設定 -->
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

          <div class="space-y-4">
            <div
              v-for="(sequence, index) in testSettings.sequences"
              :key="index"
              class="border rounded p-4"
            >
              <div class="flex justify-between items-center mb-4">
                <h4 class="font-medium">シーケンス {{ index + 1 }}</h4>
                <button
                  @click="deleteSequence(index)"
                  class="text-red-500 hover:text-red-600"
                >
                  <TrashIcon class="w-5 h-5" />
                </button>
              </div>

              <!-- タイミング設定 -->
              <div class="grid grid-cols-2 gap-4 mb-4">
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
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    音源1
                  </label>
                  <select
                    v-model="sequence.audio1"
                    class="w-full p-2 border rounded"
                  >
                    <option value="">選択してください</option>
                    <option v-for="file in audioFiles" :key="file.id" :value="file.id">
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
                    <option v-for="file in audioFiles" :key="file.id" :value="file.id">
                      {{ file.name }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- 回答時間と正解選択設定 -->
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TrashIcon } from '@heroicons/vue/24/solid'
import AudioFiles from '../components/AudioFiles.vue'
import type { AudioFile, TestSettings, TestSequence } from '../types'

const audioFiles = ref<AudioFile[]>([])

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

const createNewSequence = (): TestSequence => {
  return {
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
    testSettings.value.sequences.splice(index, 1)
  }
}

const addOption = () => {
  const lastOption = testSettings.value.options[testSettings.value.options.length - 1]
  const nextLabel = String.fromCharCode(lastOption.label.charCodeAt(0) + 1)
  
  testSettings.value.options.push({
    value: nextLabel,
    label: nextLabel
  })
}

const deleteOption = (index: number) => {
  if (testSettings.value.options.length <= 2) {
    alert('最低2つの選択肢が必要です')
    return
  }
  
  testSettings.value.options.splice(index, 1)
}

const saveSettings = async () => {
  try {
    // 深いコピーを作成して循環参照を除去
    const settingsToSave = JSON.parse(JSON.stringify(testSettings.value))
    await window.electronAPI.saveTestData(settingsToSave)
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

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

    // 深いコピーを作成して循環参照を除去
    const testData = JSON.parse(JSON.stringify(testSettings.value))
    await window.electronAPI.createTestWindow(testData)
  } catch (error) {
    console.error('Error starting test:', error)
  }
}

const handleAudioSelect = (fileId: string) => {
  // 必要に応じて音源選択の処理を実装
}

// 初期化
onMounted(async () => {
  try {
    // オーディオファイルの読み込み
    audioFiles.value = await window.electronAPI.getAudioFiles() || []
    
    // 保存された設定データの読み込み
    const savedData = await window.electronAPI.loadTestData()
    if (savedData) {
      testSettings.value = savedData
    }
  } catch (error) {
    console.error('Error loading initial data:', error)
  }
})
</script>