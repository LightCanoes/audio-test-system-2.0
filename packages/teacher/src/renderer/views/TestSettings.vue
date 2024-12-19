<style scoped>
.input-highlight {
  box-shadow: 0 0 0 2px #3b82f6, 0 0 8px #3b82f6;
  border-color: transparent;
  transition: all 0.3s ease;
}

.input-normal {
  transition: all 0.3s ease;
}
</style>

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
          <h2 class="font-medium mb-4">刺激リスト</h2>
          <div class="border rounded overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-2 py-1 border-b text-left w-20">ID</th>
                  <th class="px-2 py-1 border-b text-left w-60">オリジナルファイル</th>
                  <th class="px-2 py-1 border-b text-left w-20">コメント</th>
                  <th class="px-2 py-1 border-b w-25"></th>
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
                    <div class="flex items-center space-x-1">
                      <button
                        v-if="isAudioPlaying(file.id) && !isAudioPaused(file.id) &&!isSequencePlaying"
                        @click="pauseAudio(file.id)"
                        class="p-1 text-yellow-500 hover:text-yellow-600"
                      >
                        <PauseIcon class="w-4 h-4" />
                      </button>
                      <button
                        v-else-if="isAudioPlaying(file.id) && isAudioPaused(file.id) &&!isSequencePlaying"
                        @click="resumeAudio(file.id)"
                        class="p-1 text-green-500 hover:text-green-600"
                      >
                        <PlayIcon class="w-4 h-4" />
                      </button>
                      <button
                        v-else
                        @click="playAudio(file.id)"
                        class="p-1 text-blue-500 hover:text-blue-600"
                      >
                        <PlayIcon class="w-4 h-4" />
                      </button>
                      <button
                        v-if="isAudioPlaying(file.id)&&!isPlaying &&!isSequencePlaying"
                        @click="stopAudio"
                        class="p-1 text-red-500 hover:text-red-600"
                      >
                        <StopIcon class="w-4 h-4" />
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
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-medium">ボタン設定</h3>
                <button
                  @click="addButton"
                  class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  追加
                </button>
              </div>

              <div class="space-y-2">
                <div
                  v-for="(button, index) in testSettings.options"
                  :key="index"
                  class="flex items-center space-x-4"
                >
                  <div class="w-20">
                    <span class="text-sm text-gray-600">ID: {{ button.value }}</span>
                  </div>
                  <div class="flex-grow">
                    <input
                      v-model="button.label"
                      class="w-full p-2 border rounded"
                      placeholder="ラベル"
                    />
                  </div>
                  <div>
                    <button
                      @click="deleteButton(index)"
                      class="p-1 text-red-500 hover:text-red-600"
                    >
                      <TrashIcon class="w-5 h-5" />
                    </button>
                  </div>
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

        <table class="w-full text-sm border-collapse">
          <thead>
            
              <tr>
                <th class="px-4 py-2 font-normal text-center bg-gray-50" rowspan="2"　width="100"></th>
                <th class="px-2 pt-2 pb-0 font-normal text-center bg-gray-50" width="70">反復回数</th>
                <th class="px-2 pt-2 pb-0 font-normal text-center bg-gray-50" width="70">開始時間</th>
                <th class="px-2 pt-2 pb-0 font-normal text-center bg-gray-50" width="100">刺激1</th>
                <th class="px-2 pt-2 pb-0 font-normal text-center bg-gray-50" width="70">休止</th>
                <th class="px-2 pt-2 pb-0 font-normal text-center bg-gray-50" width="100">刺激2</th>
                <th class="px-2 pt-2 pb-0 font-normal text-center bg-gray-50" width="70">制限時間</th>
                <th class="px-2 py-2 font-normal text-center bg-gray-50" rowspan="2" width="100">正答ボタン</th>
                <th class="px-2 py-2 font-normal text-center bg-gray-50" rowspan="2" width="100"></th>
              </tr>
              <tr>
                <th class="px-2 pt-0 pb-2 text-xs text-gray-500 text-center bg-gray-50 font-normal">[回]</th>
                <th class="px-2 pt-0 pb-2 text-xs text-gray-500 text-center bg-gray-50 font-normal">[秒]</th>
                <th class="px-2 pt-0 pb-2 text-xs text-gray-500 text-center bg-gray-50 font-normal">[ID]</th>
                <th class="px-2 pt-0 pb-2 text-xs text-gray-500 text-center bg-gray-50 font-normal">[秒]</th>
                <th class="px-2 pt-0 pb-2 text-xs text-gray-500 text-center bg-gray-50 font-normal">[ID]</th>
                <th class="px-2 pt-0 pb-2 text-xs text-gray-500 text-center bg-gray-50 font-normal">[秒]</th>
              </tr>
            </thead>
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
              >
                <td class="px-4 py-2">
                  <div class="flex items-center">
                    <button class="drag-handle cursor-move mr-2">
                      <Bars3Icon class="w-4 h-4 text-gray-400" />
                    </button>
                    <span>試行{{ index + 1 }}</span>
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
                      :class="[
                        'w-full p-1 text-sm border rounded text-center',
                        currentPlayingIndex === index && playingStage === 'wait' 
                          ? 'input-highlight' 
                          : 'input-normal'
                      ]"
                    />
                  </td>
                  <td class="px-1 py-1">
                    <select
                      v-model="sequence.audio1"
                      :class="[
                        'w-full p-1 text-sm border rounded text-center',
                        currentPlayingIndex === index && playingStage === 'audio1' 
                          ? 'input-highlight' 
                          : 'input-normal'
                      ]"
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
                      :class="[
                        'w-full p-1 text-sm border rounded text-center',
                        currentPlayingIndex === index && playingStage === 'pause' 
                          ? 'input-highlight' 
                          : 'input-normal'
                      ]"
                    />
                  </td>
                  <td class="px-1 py-1">
                    <select
                      v-model="sequence.audio2"
                      :class="[
                        'w-full p-1 text-sm border rounded text-center',
                        currentPlayingIndex === index && playingStage === 'audio2' 
                          ? 'input-highlight' 
                          : 'input-normal'
                      ]"
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
                      :class="[
                        'w-full p-1 text-sm border rounded text-center',
                        currentPlayingIndex === index && playingStage === 'answer' 
                          ? 'input-highlight' 
                          : 'input-normal'
                      ]"
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
import type { AudioFile, TestSettings, TestSequence } from '../types'

// 音频文件相关
const audioFiles = ref<AudioFile[]>([])               // 音频文件列表，基础数据
const currentPlayingId = ref<string | null>(null)     // 当前播放的音频ID
let audioElement: HTMLAudioElement | null = null      // 当前播放的音频元素
const isPausedMap = ref(new Map<string, boolean>())   // 记录每个音频文件的暂停状态

//序列播放相关：
const currentPlayingIndex = ref(-1)
const playingStage = ref<'wait' | 'audio1' | 'pause' | 'audio2' | 'answer' | null>(null)
const remainingTime = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

// 重复了，可以删除？
const isSequencePlaying = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const sequencePlayingId = ref<string | null>(null) // 当前播放的序列ID

//继承原AudioFiles.vue的内容
const isAudioPlaying = (fileId: string) => currentPlayingId.value === fileId
const isAudioPaused = (fileId: string) => isPausedMap.value.get(fileId) || false
const startTimer = (duration: number) => {
  return new Promise<void>((resolve) => {
    if (countdownInterval) clearInterval(countdownInterval)
    
    let startTime = Date.now()
    let endTime = startTime + duration
    let pausedDuration = 0  // 记录暂停的总时长
    
    countdownInterval = setInterval(() => {
      if (isPaused.value) {
        // 记录暂停开始的时间
        if (!pausedDuration) {
          pausedDuration = Date.now() - startTime
        }
        return
      }

      // 如果刚从暂停恢复，调整开始和结束时间
      if (pausedDuration) {
        const pauseTime = Date.now() - startTime - pausedDuration
        startTime = startTime + pauseTime
        endTime = endTime + pauseTime
        pausedDuration = 0
      }
      
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      remainingTime.value = Math.ceil(remaining / 1000)


      if (remaining <= 0) {
        if (countdownInterval) {
          clearInterval(countdownInterval)
          countdownInterval = null
        }
        resolve()  // 只有在真正计时结束时才 resolve
      }
    }, 100)
  })
}
const playLocalAudio = (path: string, id: string) => {
  if (audioElement) {
    audioElement.pause()
    audioElement = null
  }
  
  audioElement = new Audio()
  // 设置音频属性以确保正常播放
  audioElement.preservesPitch = true  // 保持音高不变
  audioElement.playbackRate = 1.0     // 保持播放速率
  audioElement.src = path
  audioElement.onended = () => {
    currentPlayingId.value = null
    audioElement = null  // 播放结束时清理音频元素
  }
  
  audioElement.play().catch(error => {
    console.error('Error playing audio:', error)
    currentPlayingId.value = null
    audioElement = null
  })
  
  currentPlayingId.value = id
}

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
const loadAudioFiles = async () => {
  try {
    audioFiles.value = await window.electronAPI.getAudioFiles()
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
const playAudio = async (fileId: string) => {
  try {
    if (!isSequencePlaying.value) {
        if (currentPlayingId.value && currentPlayingId.value !== fileId) {
          await stopAudio()
        }
        await window.electronAPI.playAudio(fileId)
        currentPlayingId.value = fileId
        isPausedMap.value.set(fileId, false)
      }   
    }
  catch (error) {
    console.error('Failed to play audio:', error)
  }
  
}

// 暂停时只暂停播放，不销毁音频元素
const pauseAudio = async (fileId: string) => {
  try {
    if (audioElement) {
      audioElement.pause()
    }
    await window.electronAPI.pauseAudio()
    isPausedMap.value.set(fileId, true)
  } catch (error) {
    console.error('Failed to pause audio:', error)
  }
}

// 恢复时继续原来的音频元素播放
const resumeAudio = async (fileId: string) => {
  try {
    if (audioElement) {
      await audioElement.play()  // 使用原来的音频元素继续播放
    }
    await window.electronAPI.resumeAudio()
    isPausedMap.value.set(fileId, false)
  } catch (error) {
    console.error('Failed to resume audio:', error)
  }
}

// 音频停止时才真正清理音频元素
const stopAudio = async () => {
  try {
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
      audioElement = null
    }
    await window.electronAPI.stopAudio()
    if (currentPlayingId.value) {
      isPausedMap.value.delete(currentPlayingId.value)
    }
    currentPlayingId.value = null
  } catch (error) {
    console.error('Failed to stop audio:', error)
  }
}
const deleteFile = async (fileId: string) => {
  try {
    if (!isSequencePlaying.value) {
      if (confirm('本当に削除しますか？')) {
        if (currentPlayingId.value === fileId) {
          await stopAudio()
        }
        await window.electronAPI.deleteAudioFile(fileId)
        await loadAudioFiles()
      }
    }
  } catch (error) {
    console.error('Failed to delete audio file:', error)
  }
}




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
    { value: '1', label: '1' }
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
  const nextValue = (testSettings.value.options.length + 1).toString()
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
const waitForAudioToFinish = () => {
  return new Promise<void>((resolve) => {
    if (audioElement) {
      audioElement.onended = () => {
        resolve();
      };
    } else {
      resolve(); // 音声要素がない場合は即時解決
    }
  });
};
const playSequence = async (index: number) => {
  // 如果有音频在播放，先停止它
  if (currentPlayingId.value) {
    await stopAudio()
  }

  // 先に古い再生を停止
  if (currentPlayingIndex.value !== -1) {
    await stopSequence()
  }

  currentPlayingIndex.value = index
  isPlaying.value = true
  isPaused.value = false
  sequencePlayingId.value = testSettings.value.sequences[index].id
  isSequencePlaying.value = true
  
  const sequence = testSettings.value.sequences[index]
  
  try {
    // 待ち時間
    playingStage.value = 'wait'
    remainingTime.value = sequence.waitTime
    await startTimer(sequence.waitTime * 1000)

    // 音源1
    playingStage.value = 'audio1'
    await window.electronAPI.playAudio(sequence.audio1)
    // 音声の完了を待つ
    await waitForAudioToFinish()


    // 休止時間
    playingStage.value = 'pause'
    remainingTime.value = sequence.pauseTime
    await startTimer(sequence.pauseTime * 1000)

    // 音源2
    playingStage.value = 'audio2'
    await window.electronAPI.playAudio(sequence.audio2)
    await waitForAudioToFinish()
    
    // 回答時間
    playingStage.value = 'answer'
    remainingTime.value = sequence.answerTime
    await startTimer(sequence.answerTime * 1000)
    // 再生完了時
    stopSequence()
  } catch (error) {
    console.error('Error playing sequence:', error)
    stopSequence()
  }
}

const pauseSequence = async () => {
  isPaused.value = true
  isPlaying.value = false
  // 暂停当前音频（如果在播放）
  if (playingStage.value === 'audio1' || playingStage.value === 'audio2') {
    await window.electronAPI.pauseAudio()
  }


}

const resumeSequence = async () => {
  isPaused.value = false
  isPlaying.value = true
  // 根据当前阶段恢复播放
  if (playingStage.value === 'audio1' || playingStage.value === 'audio2') {
    await window.electronAPI.resumeAudio()
  } 
}

const stopSequence = async () => {
  isPlaying.value = false
  isPaused.value = false
  isSequencePlaying.value = false  // 重置序列播放状态
  playingStage.value = null
  currentPlayingIndex.value = -1
  remainingTime.value = 0
  if (countdownInterval) clearInterval(countdownInterval)
  await window.electronAPI.stopAudio()
}

const saveSettings = async () => {
  try {
    // 创建一个没有循环引用的干净对象
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
        path: file.originalPath,  // 确保使用原始路径
        originalPath: file.originalPath,
        name: file.name,
        comment: file.comment || ''
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
      // 先加载音频文件
      if (settings.audioFiles) {
        // 确保数据结构完整
        const processedAudioFiles = settings.audioFiles.map(file => ({
          ...file,
          originalPath: file.path,  // 确保 originalPath 存在
        }))
        await window.electronAPI.setAudioFiles(processedAudioFiles)
        audioFiles.value = await window.electronAPI.getAudioFiles()
      }
      
      testSettings.value = {
        instruction: settings.instruction,
        options: settings.options,
        sequences: settings.sequences,
        lightSettings: settings.lightSettings
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

    const testData = JSON.parse(JSON.stringify({
      ...testSettings.value,
      audioFiles: audioFiles.value.map(file => ({
        id: file.id,
        path: file.originalPath,
        name: file.name,
        comment: file.comment
      }))
    }))

    await window.electronAPI.createTestWindow(testData)
  } catch (error) {
    console.error('Error starting test:', error)
    alert('テストの開始に失敗しました')
  }
}




onMounted(async () => {
  try {
    await loadAudioFiles()
    setupAudioControls()
  } catch (error) {
    console.error('Error loading initial data:', error)
  }
})


onUnmounted(() => {
  if (currentPlayingIndex.value !== -1) {
    stopSequence()
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  if (audioElement) {
    audioElement.pause()
    audioElement = null
  }
})
</script>