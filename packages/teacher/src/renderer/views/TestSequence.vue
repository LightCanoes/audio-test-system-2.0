<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">テスト シーケンス編集</h1>
      <div class="flex space-x-4">
        <button
          @click="handleSaveAll"
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
    <div class="grid grid-cols-4 gap-6">
      <!-- 左側：シーケンス管理 -->
      <div class="col-span-4 lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-medium">シーケンス管理</h2>
            <button
              @click="addSequence"
              class="p-1 text-blue-500 hover:text-blue-600"
            >
              <PlusIcon class="w-5 h-5" />
            </button>
          </div>
          
          <draggable
            v-model="sequences"
            class="space-y-2"
            handle=".drag-handle"
            item-key="id"
            @end="handleDragEnd"
          >
            <template #item="{ element, index }">
              <div 
                class="flex items-center space-x-2 p-2 rounded border"
                :class="{ 'bg-blue-50 border-blue-300': index === currentEditIndex }"
              >
                <button class="drag-handle cursor-move p-1">
                  <Bars3Icon class="w-4 h-4 text-gray-400" />
                </button>
                <span class="flex-grow text-sm">シーケンス {{ index + 1 }}</span>
                <button
                  @click="editSequence(index)"
                  class="p-1 text-blue-500 hover:text-blue-600"
                >
                  <PencilIcon class="w-4 h-4" />
                </button>
                <button
                  @click="deleteSequence(index)"
                  class="p-1 text-red-500 hover:text-red-600"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </template>
          </draggable>
        </div>
      </div>

      <!-- 右側：編集エリア -->
      <div class="col-span-4 lg:col-span-3 space-y-6">
        <!-- 音源ファイル管理 -->
        <div class="bg-white rounded-lg shadow p-4">
          <AudioFiles @select="handleAudioSelect" />
        </div>

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
                  v-for="(option, index) in currentSequence?.options"
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

              <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  正解選択肢
                </label>
                <select
                  v-model="currentSequence.correctOption"
                  class="w-full p-2 border rounded"
                >
                  <option
                    v-for="option in currentSequence?.options"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 教示文設定 -->
            <div v-if="currentTab === 'instruction'" class="space-y-4">
              <textarea
                v-model="currentSequence.instruction"
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
                    v-model="currentSequence.lightSettings.showPlayingIndicator"
                  />
                  <span>音源呈示提示灯を表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="currentSequence.lightSettings.showCorrectLight"
                  />
                  <span>正解提示灯を表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="currentSequence.lightSettings.showWrongLight"
                  />
                  <span>不正解提示灯を表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="currentSequence.lightSettings.showAlmostLight"
                  />
                  <span>おしい提示灯を表示</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- シーケンス設定 -->
        <div v-if="currentSequence" class="bg-white rounded-lg shadow p-4">
          <div class="space-y-4">
            <!-- タイミング設定 -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  開始待ち時間 (秒)
                </label>
                <input
                  v-model.number="currentSequence.waitTime"
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
                  v-model.number="currentSequence.pauseTime"
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
                  v-model="currentSequence.audio1"
                  class="w-full p-2 border rounded"
                >
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
                  v-model="currentSequence.audio2"
                  class="w-full p-2 border rounded"
                >
                  <option v-for="file in audioFiles" :key="file.id" :value="file.id">
                    {{ file.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 回答時間設定 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                回答時間 (秒)
              </label>
              <input
                v-model.number="currentSequence.answerTime"
                type="number"
                min="1"
                step="1"
                class="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  Bars3Icon
} from '@heroicons/vue/24/solid'
import draggable from 'vuedraggable'
import AudioFiles from '../components/AudioFiles.vue'

interface AudioFile {
  id: string
  name: string
  path: string
}

interface Option {
  value: string
  label: string
}

interface LightSettings {
  showPlayingIndicator: boolean
  showCorrectLight: boolean
  showWrongLight: boolean
  showAlmostLight: boolean
}

interface Sequence {
  id: string
  waitTime: number
  pauseTime: number
  answerTime: number
  audio1: string
  audio2: string
  options: Option[]
  correctOption: string
  instruction: string
  lightSettings: LightSettings
}

const audioFiles = ref<AudioFile[]>([])
const sequences = ref<Sequence[]>([])
const currentEditIndex = ref(-1)

const tabs = [
  { id: 'options', name: '回答選択肢' },
  { id: 'instruction', name: '教示文' },
  { id: 'lights', name: '提示灯' }
]
const currentTab = ref('options')

const currentSequence = ref<Sequence | null>(null)

watch(currentEditIndex, (newIndex) => {
  if (newIndex >= 0 && sequences.value[newIndex]) {
    currentSequence.value = { ...sequences.value[newIndex] }
  } else {
    currentSequence.value = null
  }
})

const addSequence = () => {
  const newSequence: Sequence = {
    id: Date.now().toString(),
    waitTime: 2,
    pauseTime: 1,
    answerTime: 5,
    audio1: '',
    audio2: '',
    options: [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' }
    ],
    correctOption: 'A',
    instruction: '',
    lightSettings: {
      showPlayingIndicator: true,
      showCorrectLight: true,
      showWrongLight: true,
      showAlmostLight: false
    }
  }
  sequences.value.push(newSequence)
  currentEditIndex.value = sequences.value.length - 1
}

const editSequence = (index: number) => {
  currentEditIndex.value = index
}

const deleteSequence = (index: number) => {
  if (confirm('このシーケンスを削除しますか？')) {
    sequences.value.splice(index, 1)
    if (currentEditIndex.value === index) {
      currentEditIndex.value = -1
    } else if (currentEditIndex.value > index) {
      currentEditIndex.value--
    }
  }
}

const handleDragEnd = () => {
  // ドラッグ完了後の処理（必要に応じて）
}

const addOption = () => {
  if (!currentSequence.value) return
  
  const lastOption = currentSequence.value.options[currentSequence.value.options.length - 1]
  const nextLabel = String.fromCharCode(lastOption.label.charCodeAt(0) + 1)
  
  currentSequence.value.options.push({
    value: nextLabel,
    label: nextLabel
  })
}

const deleteOption = (index: number) => {
  if (!currentSequence.value) return
  
  if (currentSequence.value.options.length <= 2) {
    alert('最低2つの選択肢が必要です')
    return
  }
  
  currentSequence.value.options.splice(index, 1)
  
  // 正解選択肢が削除された選択肢だった場合、最初の選択肢を正解に設定
  if (!currentSequence.value.options.find(opt => opt.value === currentSequence.value?.correctOption)) {
    currentSequence.value.correctOption = currentSequence.value.options[0].value
  }
}

const handleSaveAll = async () => {
  try {
    if (currentSequence.value && currentEditIndex.value >= 0) {
      sequences.value[currentEditIndex.value] = { ...currentSequence.value }
    }
    // TODO: シーケンスをファイルに保存する処理
    const testData = {
      sequences: sequences.value
    }
    await window.electronAPI.saveTestData(testData)
  } catch (error) {
    console.error('Error saving data:', error)
  }
}

const startTest = async () => {
  try {
    if (currentSequence.value && currentEditIndex.value >= 0) {
      sequences.value[currentEditIndex.value] = { ...currentSequence.value }
    }

    // シーケンスのバリデーション
    for (let i = 0; i < sequences.value.length; i++) {
      const seq = sequences.value[i]
      if (!seq.audio1 || !seq.audio2) {
        alert(`シーケンス${i + 1}の音源が選択されていません`)
        return
      }
      if (!seq.correctOption) {
        alert(`シーケンス${i + 1}の正解が選択されていません`)
        return
      }
    }

    const testData = {
      sequences: sequences.value
    }
    
    await window.electronAPI.createTestWindow(testData)
  } catch (error) {
    console.error('Error starting test:', error)
  }
}

// ファイルの読み込みと保存
onMounted(async () => {
  try {
    // オーディオファイルの読み込み
    audioFiles.value = await window.electronAPI.getAudioFiles()
    // シーケンスデータの読み込み（もし保存されていれば）
    const savedData = await window.electronAPI.loadTestData()
    if (savedData?.sequences) {
      sequences.value = savedData.sequences
    }
  } catch (error) {
    console.error('Error loading initial data:', error)
  }
})
</script>