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
    <div class="grid grid-cols-10 gap-6">
      <!-- 左側：刺激リストと基本設定 -->
      <div class="col-span-4 space-y-6">
        <!-- 刺激リスト -->
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
            <!-- ボタン設定 -->
            <div v-if="currentTab === 'buttons'" class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="font-medium">ボタン設定</h3>
                <button
                  @click="addButton"
                  class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  追加
                </button>
              </div>

              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-2 py-1 text-left w-20">ID</th>
                    <th class="px-2 py-1 text-left">ラベル</th>
                    <th class="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(button, index) in testSettings.options" :key="index">
                    <td class="px-2 py-1">{{ button.value }}</td>
                    <td class="px-2 py-1">
                      <input
                        v-model="button.label"
                        class="w-full p-2 border rounded"
                        placeholder="ラベル"
                      />
                    </td>
                    <td class="px-2 py-1">
                      <button
                        @click="deleteButton(index)"
                        class="p-1 text-red-500 hover:text-red-600"
                      >
                        <TrashIcon class="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
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

            <!-- ランプ設定 -->
            <div v-if="currentTab === 'lamps'" class="space-y-4">
              <div class="space-y-2">
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="testSettings.lightSettings.showPlayingIndicator"
                  />
                  <span>音源呈示ランプを表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="testSettings.lightSettings.showCorrectLight"
                  />
                  <span>正解ランプを表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="testSettings.lightSettings.showWrongLight"
                  />
                  <span>不正解ランプを表示</span>
                </label>
                
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    v-model="testSettings.lightSettings.showAlmostLight"
                  />
                  <span>おしいランプを表示</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：スケジュールリスト -->
      <div class="col-span-6 bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-medium">スケジュールリスト</h3>
          <button
            @click="addSequence"
            class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            追加
          </button>
        </div>

        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              <th class="w-6"></th>
              <th class="w-20 py-2 font-normal text-center">反復回数</th>
              <th class="w-16 py-2 font-normal text-center">開始時間</th>
              <th class="w-24 py-2 font-normal text-center">刺激1</th>
              <th class="w-16 py-2 font-normal text-center">休止</th>
              <th class="w-24 py-2 font-normal text-center">刺激2</th>
              <th class="w-16 py-2 font-normal text-center">制限時間</th>
              <th class="w-24 py-2 font-normal text-center">正答ボタン</th>
              <th class="w-20"></th>
            </tr>
            <tr class="text-xs text-gray-500">
              <th></th>
              <th class="text-center pt-1">[回]</th>
              <th class="text-center pt-1">[秒]</th>
              <th class="text-center pt-1">[ID]</th>
              <th class="text-center pt-1">[秒]</th>
              <th class="text-center pt-1">[ID]</th>
              <th class="text-center pt-1">[秒]</th>
              <th></th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            <draggable
              v-model="testSettings.sequences"
              tag="tbody"
              item-key="id"
              handle=".drag-handle"
              :animation="150"
              ghost-class="opacity-50"
            >
              <template #item="{ element: sequence, index }">
                <tr 
                  class="border-b hover:bg-gray-50"
                  :class="{ 'border-blue-500 border-2': currentPlayingIndex === index && isPlaying }"
                >
                  <td class="py-2 px-2">
                    <div class="flex items-center">
                      <button class="drag-handle cursor-move">
                        <Bars3Icon class="w-4 h-4 text-gray-400" />
                      </button>
                      <span class="ml-1">試行{{ index + 1 }}</span>
                    </div>
                  </td>
                  <td class="px-1 py-1">
                    <input
                      v-model.number="sequence.repeatCount"
                      type="number"
                      min="1"
                      step="1"
                      class="w-full p-1 text-sm border rounded text-center"
                    />
                  </td>
                  <td class="px-1 py-1">
                    <input
                      v-model.number="sequence.waitTime"
                      type="number"
                      min="0"
                      step="0.5"
                      class="w-full p-1 text-sm border rounded text-center"
                    />
                  </td>
                  <td class="px-1 py-1">
                    <select
                      v-model="sequence.audio1"
                      class="w-full p-1 text-sm border rounded text-center"
                    >
                      <option value="">---</option>
                      <option 
                        v-for="(file, idx) in audioFiles" 
                        :key="file.id" 
                        :value="file.id"
                      >
                        刺激{{ idx + 1 }}
                      </option>
                    </select>
                  </td>
                  <td class="px-1 py-1">
                    <input
                      v-model.number="sequence.pauseTime"
                      type="number"
                      min="0"
                      step="0.5"
                      class="w-full p-1 text-sm border rounded text-center"
                    />
                  </td>
                  <td class="px-1 py-1">
                    <select
                      v-model="sequence.audio2"
                      class="w-full p-1 text-sm border rounded text-center"
                    >
                      <option value="">---</option>
                      <option 
                        v-for="(file, idx) in audioFiles" 
                        :key="file.id" 
                        :value="file.id"
                      >
                        刺激{{ idx + 1 }}
                      </option>
                    </select>
                  </td>
                  <td class="px-1 py-1">
                    <input
                      v-model.number="sequence.answerTime"
                      type="number"
                      min="1"
                      step="1"
                      class="w-full p-1 text-sm border rounded text-center"
                    />
                  </td>
                  <td class="px-1 py-1">
                    <select
                      v-model="sequence.correctOption"
                      class="w-full p-1 text-sm border rounded text-center"
                    >
                      <option value="">---</option>
                      <option
                        v-for="option in testSettings.options"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </td>
                  <td class="px-2 py-1">
                    <div class="flex items-center space-x-1">
                      <button
                        v-if="isPlaying && currentPlayingIndex === index"
                        @click="pauseSequence"
                        class="p-1 text-yellow-500 hover:text-yellow-600"
                      >
                        <PauseIcon class="w-4 h-4" />
                      </button>
                      <button
                        v-else-if="isPaused && currentPlayingIndex === index"
                        @click="resumeSequence"
                        class="p-1 text-green-500 hover:text-green-600"
                      >
                        <PlayIcon class="w-4 h-4" />
                      </button>
                      <button
                        v-else
                        @click="playSequence(index)"
                        class="p-1 text-blue-500 hover:text-blue-600"
                      >
                        <PlayIcon class="w-4 h-4" />
                      </button>
                      <button
                        v-if="currentPlayingIndex === index"
                        @click="stopSequence"
                        class="p-1 text-red-500 hover:text-red-600"
                      >
                        <StopIcon class="w-4 h-4" />
                      </button>
                      <button
                        @click="deleteSequence(index)"
                        class="p-1 text-red-500 hover:text-red-600"
                      >
                        <TrashIcon class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </draggable>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  TrashIcon,
  Bars3Icon,
  PlusIcon
} from '@heroicons/vue/24/solid'
import draggable from 'vuedraggable'
import AudioFiles from '../components/AudioFiles.vue'
import type { AudioFile, TestSettings, TestSequence } from '../types'

// 状態管理
const audioFiles = ref<AudioFile[]>([])
const currentPlayingId = ref<string | null>(null)
const currentPlayingIndex = ref(-1)
const isPlaying = ref(false)
const isPaused = ref(false)

// 設定タブ
const tabs = [
  { id: 'buttons', name: 'ボタン' },
  { id: 'instruction', name: '教示文' },
  { id: 'lamps', name: 'ランプ' }
]
const currentTab = ref('buttons')

// 初期設定
const testSettings = ref<TestSettings>({
  instruction: '',
  options: [
    { value: 'A', label: 'A' }
  ],
  sequences: [],
  lightSettings: {
    showPlayingIndicator: true,
    showCorrectLight: true,
    showWrongLight: true,
    showAlmostLight: false
  }
})

// シーケンス管理
const createNewSequence = (): TestSequence => {
  return {
    id: Date.now().toString(),
    repeatCount: 1,
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
  if (confirm('この試行を削除しますか？')) {
    if (currentPlayingIndex.value === index) {
      stopSequence()
    }
    testSettings.value.sequences.splice(index, 1)
  }
}

// ボタン管理
const addButton = () => {
  const lastButton = testSettings.value.options[testSettings.value.options.length - 1]
  const nextValue = String.fromCharCode(lastButton.label.charCodeAt(0) + 1)
  
  testSettings.value.options.push({
    value: nextValue,
    label: nextValue
  })
}

const deleteButton = (index: number) => {
  if (testSettings.value.options.length <= 1) {
    alert('最低1つのボタンが必要です')
    return
  }
  
  const buttonToDelete = testSettings.value.options[index]
  testSettings.value.options.splice(index, 1)
  
  // 削除したボタンが正解だった場合、正解を更新
  testSettings.value.sequences.forEach(sequence => {
    if (sequence.correctOption === buttonToDelete.value) {
      sequence.correctOption = ''
    }
  })
}

// シーケンス再生制御
const playSequence = async (index: number) => {
  // 先に古い再生を停止
  if (currentPlayingIndex.value !== -1) {
    await stopSequence()
  }

  currentPlayingIndex.value = index
  isPlaying.value = true
  isPaused.value = false
  
  const sequence = testSettings.value.sequences[index]
  
  try {
    // 待ち時間
    await new Promise(resolve => setTimeout(resolve, sequence.waitTime * 1000))
    if (!isPlaying.value) return

    // 音源1
    await window.electronAPI.playAudio(sequence.audio1)
    if (!isPlaying.value) return

    // 休止時間
    await new Promise(resolve => setTimeout(resolve, sequence.pauseTime * 1000))
    if (!isPlaying.value) return

    // 音源2
    await window.electronAPI.playAudio(sequence.audio2)

    // 再生完了時
    setTimeout(() => {
      stopSequence()
    }, 1000)  // 音源2の再生が終わってから1秒後に停止
  } catch (error) {
    console.error('Error playing sequence:', error)
    stopSequence()
  }
}

const pauseSequence = async () => {
  isPlaying.value = false
  isPaused.value = true
  await window.electronAPI.pauseAudio()
}

const resumeSequence = async () => {
  isPlaying.value = true
  isPaused.value = false
  await window.electronAPI.resumeAudio()
  await playSequence(currentPlayingIndex.value)
}

const stopSequence = async () => {
  isPlaying.value = false
  isPaused.value = false
  currentPlayingIndex.value = -1
  await window.electronAPI.stopAudio()
}

// ファイル操作
const handleAudioFilesUpdate = (files: AudioFile[]) => {
  audioFiles.value = files
}

// 保存と読み込み
const saveSettings = async () => {
  try {
    // クローン可能なデータだけを保存
    const settingsToSave = {
      instruction: testSettings.value.instruction,
      options: testSettings.value.options.map(opt => ({
        value: opt.value,
        label: opt.label
      })),
      sequences: testSettings.value.sequences.map(seq => ({
        id: seq.id,
        repeatCount: seq.repeatCount,
        waitTime: seq.waitTime,
        audio1: seq.audio1,
        pauseTime: seq.pauseTime,
        audio2: seq.audio2,
        answerTime: seq.answerTime,
        correctOption: seq.correctOption
      })),
      lightSettings: { ...testSettings.value.lightSettings },
      audioFiles: audioFiles.value.map(file => ({
        id: file.id,
        path: file.originalPath,
        name: file.name,
        comment: file.comment
      }))
    }
    
    await window.electronAPI.saveTestSettingsToFile(settingsToSave)
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
      if (settings.audioFiles) {
        audioFiles.value = settings.audioFiles
      }
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
      alert('少なくとも1つの試行を追加してください')
      return
    }

    for (let i = 0; i < testSettings.value.sequences.length; i++) {
      const seq = testSettings.value.sequences[i]
      if (!seq.audio1 || !seq.audio2) {
        alert(`試行${i + 1}の刺激が選択されていません`)
        return
      }
      if (!seq.correctOption) {
        alert(`試行${i + 1}の正答ボタンが選択されていません`)
        return
      }
    }

    // テストデータを作成（循環参照を避ける）
    const testData = {
      instruction: testSettings.value.instruction,
      options: JSON.parse(JSON.stringify(testSettings.value.options)),
      sequences: JSON.parse(JSON.stringify(testSettings.value.sequences)),
      lightSettings: { ...testSettings.value.lightSettings },
      audioFiles: audioFiles.value.map(file => ({
        id: file.id,
        path: file.originalPath,
        name: file.name,
        comment: file.comment
      }))
    }

    await window.electronAPI.createTestWindow(testData)
  } catch (error) {
    console.error('Error starting test:', error)
    alert('テストの開始に失敗しました')
  }
}

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
  if (currentPlayingIndex.value !== -1) {
    stopSequence()
  }
})
</script>