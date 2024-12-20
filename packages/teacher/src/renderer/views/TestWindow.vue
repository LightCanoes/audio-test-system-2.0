<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <!-- テストコントロール -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center space-x-4">
        <h1 class="text-2xl font-bold">テスト実行</h1>
        <div class="text-sm px-3 py-1 rounded-full"
          :class="{
            'bg-blue-100 text-blue-800': !isStarted,
            'bg-green-100 text-green-800': isPlaying,
            'bg-yellow-100 text-yellow-800': isPaused,
          }"
        >
          {{ statusText }}
        </div>
      </div>
      
      <div class="text-sm text-gray-600">
        接続URL: http://{{ serverAddress }}:8080
       <br>
        <span class="text-xs">（自動的に http://localhost:5173/#/student へリダイレクトされます）</span>
      </div>

      <div class="flex space-x-4">
        <button
          v-if="!isStarted"
          @click="startTest"
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          テスト開始
        </button>
        <template v-else>
          <button
            v-if="isPlaying"
            @click="pauseTest"
            class="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            一時停止
          </button>
          <button
            v-if="isPaused"
            @click="resumeTest"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            再開
          </button>
          <button
            @click="stopTest"
            class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            テスト終了
          </button>
        </template>
      </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="grid grid-cols-3 gap-6">
      <!-- 左: 学生リスト -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium">接続中の学生</h2>
          <span class="text-sm text-gray-600">{{ students.length }}人</span>
        </div>
        <div class="space-y-2">
          <div
            v-for="student in students"
            :key="student.id"
            class="p-3 rounded-lg"
            :class="getStudentStatusClass(student)"
          >
            <div class="flex justify-between items-center">
              <div>
                <div class="font-medium">{{ student.name || `学生${student.id}` }}</div>
                <div class="text-sm text-gray-600">
                  正答率: {{ student.correctRate.toFixed(1) }}%
                </div>
              </div>
              <div v-if="student.currentAnswer" class="text-lg font-bold">
                {{ student.currentAnswer }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中央: 現在の問題 -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium">現在の問題</h2>
          <div class="text-sm text-gray-600">
            {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}
          </div>
        </div>

        <!-- 再生状態 -->
        <div class="space-y-4">
          <div class="relative pt-1">
            <div class="flex mb-2 items-center justify-between">
              <div class="text-sm">進行状況</div>
              <div class="text-sm">{{ remainingTime }}秒</div>
            </div>
            <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div
                class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                :style="{ width: `${progressPercentage}%` }"
              ></div>
            </div>
          </div>

          <!-- 音源インジケータ -->
          <div class="flex justify-center space-x-8">
            <div class="text-center">
              <div
                class="w-4 h-4 rounded-full mb-1 mx-auto"
                :class="{ 'bg-blue-500': playingStage === 'audio1', 'bg-gray-300': playingStage !== 'audio1' }"
              ></div>
              <span class="text-xs text-gray-600">音源1</span>
            </div>
            <div class="text-center">
              <div
                class="w-4 h-4 rounded-full mb-1 mx-auto"
                :class="{ 'bg-blue-500': playingStage === 'audio2', 'bg-gray-300': playingStage !== 'audio2' }"
              ></div>
              <span class="text-xs text-gray-600">音源2</span>
            </div>
          </div>

          <!-- シーケンス制御ボタン -->
          <div class="flex justify-center space-x-4 mt-4">
            <button
              v-if="isPlaying && !isPaused && (playingStage === 'audio1' || playingStage === 'audio2')"
              @click="pauseAudio"
              class="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              音源再生一時停止
            </button>
            <button
              v-if="isPaused && (playingStage === 'audio1' || playingStage === 'audio2')"
              @click="resumeAudio"
              class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              音源再生再開
            </button>
          </div>
          <!-- 正解表示 -->
          <div v-if="showingAnswer" class="mt-4">
            <div class="text-center font-medium mb-2">正解</div>
            <div class="grid grid-cols-2 gap-4">
              <div
                v-for="option in currentSequence?.options"
                :key="option.value"
                class="p-3 text-center rounded-lg border-2"
                :class="{
                  'border-green-500 bg-green-50': option.value === currentSequence?.correctOption,
                  'border-gray-200': option.value !== currentSequence?.correctOption
                }"
              >
                {{ option.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右: 統計情報 -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium">統計情報</h2>
        </div>

        <!-- 現在の問題の統計 -->
        <div v-if="currentQuestionStats" class="mb-6">
          <h3 class="text-sm font-medium text-gray-600 mb-2">現在の問題</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 bg-gray-50 rounded-lg text-center">
              <div class="text-2xl font-bold text-green-600">
                {{ currentQuestionStats.correctRate.toFixed(1) }}%
              </div>
              <div class="text-sm text-gray-600">正答率</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg text-center">
              <div class="text-2xl font-bold text-blue-600">
                {{ currentQuestionStats.averageTime.toFixed(1) }}秒
              </div>
              <div class="text-sm text-gray-600">平均回答時間</div>
            </div>
          </div>

          <!-- 選択肢分布 -->
          <div v-if="showingAnswer" class="mt-4 space-y-2">
            <div
              v-for="option in currentSequence?.options"
              :key="option.value"
              class="flex items-center space-x-2"
            >
              <div class="w-8 text-center">{{ option.label }}</div>
              <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full transition-all"
                  :class="option.value === currentSequence?.correctOption ? 'bg-green-500' : 'bg-gray-400'"
                  :style="{
                    width: `${getOptionPercentage(option.value)}%`
                  }"
                ></div>
              </div>
              <div class="w-16 text-right text-sm">
                {{ getOptionCount(option.value) }}人
              </div>
            </div>
          </div>
        </div>

        <!-- 全体統計 -->
        <div v-if="questionStats.length > 0">
          <h3 class="text-sm font-medium text-gray-600 mb-2">全体</h3>
          <div class="space-y-4">
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600 text-center">
                {{ overallStats.correctRate.toFixed(1) }}%
              </div>
              <div class="text-sm text-gray-600 text-center">総合正答率</div>
            </div>

            <!-- 問題別正答率 -->
            <div class="space-y-2">
              <div
                v-for="(stat, index) in questionStats"
                :key="index"
                class="flex items-center space-x-2"
              >
                <div class="w-16 text-sm">問題{{ index + 1 }}</div>
                <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500"
                    :style="{ width: `${stat.correctRate}%` }"
                  ></div>
                </div>
                <div class="w-16 text-right text-sm">
                  {{ stat.correctRate.toFixed(1) }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 結果ダイアログ -->
    <div
      v-if="showResults"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6"
      @click.self="closeResults"
    >
      <div class="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">テスト結果</h2>
          <button
            @click="closeResults"
            class="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <!-- 総合成績 -->
        <div class="grid grid-cols-3 gap-6 mb-8">
          <div class="bg-gray-50 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-green-600">
              {{ testStats?.overallStats.correctRate.toFixed(1) }}%
            </div>
            <div class="text-sm text-gray-600">総合正答率</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-blue-600">
              {{ testStats?.overallStats.averageTime.toFixed(1) }}秒
            </div>
            <div class="text-sm text-gray-600">平均解答時間</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-purple-600">
              {{ students.length }}
            </div>
            <div class="text-sm text-gray-600">参加人数</div>
          </div>
        </div>

        <!-- 問題別統計 -->
        <div>
          <h3 class="text-lg font-medium mb-4">問題別統計</h3>
          <div class="space-y-6">
            <div
              v-for="(questionStat, index) in testStats?.questionStats"
              :key="index"
              class="bg-gray-50 rounded-lg p-4"
            >
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium">問題 {{ index + 1 }}</h4>
                <div 
                  class="text-lg font-bold"
                  :class="{
                    'text-green-600': questionStat.correctRate >= 80,
                    'text-yellow-600': questionStat.correctRate >= 60 && questionStat.correctRate < 80,
                    'text-red-600': questionStat.correctRate < 60
                  }"
                >
                  {{ questionStat.correctRate.toFixed(1) }}%
                </div>
              </div>

              <!-- 選択肢分布 -->
              <div class="space-y-2">
                <div
                  v-for="option in test?.sequences[index].options"
                  :key="option.value"
                  class="flex items-center space-x-2"
                >
                  <div class="w-8 text-center">{{ option.label }}</div>
                  <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full transition-all"
                      :class="{
                        'bg-green-500': option.value === test?.sequences[index].correctOption,
                        'bg-gray-400': option.value !== test?.sequences[index].correctOption
                      }"
                      :style="{
                        width: `${getOptionPercentage(questionStat, option.value)}%`
                      }"
                    ></div>
                  </div>
                  <div class="w-20 text-right text-sm">
                    {{ getOptionCount(questionStat, option.value) }}人
                    ({{ getOptionPercentage(questionStat, option.value).toFixed(1) }}%)
                  </div>
                </div>
              </div>

              <!-- 平均解答時間 -->
              <div class="mt-2 flex justify-between text-sm text-gray-600">
                <span>平均解答時間</span>
                <span>{{ questionStat.averageTime.toFixed(1) }}秒</span>
              </div>
            </div>
          </div>
        </div>

        <!-- エクスポートボタン -->
        <div class="mt-6 flex justify-end space-x-4">
          <button
            @click="exportCSV"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            CSVエクスポート
          </button>
          <button
            @click="closeResults"
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
import { XMarkIcon } from '@heroicons/vue/24/solid'
import type { 
  TestSettings, 
  TestOption,
  TestSequence, 
  StudentStats, 
  QuestionStats 
} from '../types'

// 状態管理
const isStarted = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const playingStage = ref<'wait' | 'audio1' | 'pause' | 'audio2' | 'answer' | null>(null)
const currentQuestionIndex = ref(-1)
const remainingTime = ref(0)
const showingAnswer = ref(false)
const showResults = ref(false)

// サーバーアドレス
const serverAddress = ref('')

// テストデータ
const test = ref<TestSettings | null>(null)
const currentSequence = computed(() => 
  test.value?.sequences[currentQuestionIndex.value] || null
)
const totalQuestions = computed(() => 
  test.value?.sequences.length || 0
)

// 学生と統計データ
const students = ref<StudentStats[]>([])
const currentQuestionStats = ref<QuestionStats | null>(null)
const questionStats = ref<QuestionStats[]>([])
const testStats = ref<any>(null)

// 计算属性
const statusText = computed(() => {
  if (!isStarted.value) return '準備中'
  if (isPaused.value) return '一時停止中'
  if (isPlaying.value) return 'テスト実行中'
  return '終了'
})

const progressPercentage = computed(() => {
  if (!currentSequence.value || remainingTime.value === 0) return 0
  const totalTime = getCurrentStageTime()
  return ((totalTime - remainingTime.value) / totalTime) * 100
})

const overallStats = computed(() => {
  if (questionStats.value.length === 0) return { correctRate: 0 }
  const totalCorrect = questionStats.value.reduce((sum, q) => sum + q.correctAnswers, 0)
  const totalAnswers = questionStats.value.reduce((sum, q) => sum + q.totalAnswers, 0)
  return {
    correctRate: totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0
  }
})

// 方法
const getCurrentStageTime = () => {
  if (!currentSequence.value) return 0
  
  switch (playingStage.value) {
    case 'wait':
      return currentSequence.value.waitTime
    case 'pause':
      return currentSequence.value.pauseTime
    case 'answer':
      return currentSequence.value.answerTime
    default:
      return 0
  }
}

const startTest = async () => {
  try {
    console.log('Attempting to start test with data:', test.value)
    if (!test.value) {
      console.error('No test data available')
      return
    }
    isStarted.value = true
    isPlaying.value = true
    await window.electronAPI.startTest(test.value)
  } catch (error) {
    console.error('Failed to start test:', error)
  }
}

const pauseTest = async () => {
  try {
    isPlaying.value = false
    isPaused.value = true
    await window.electronAPI.pauseTest()
  } catch (error) {
    console.error('Failed to pause test:', error)
  }
}

const resumeTest = async () => {
  try {
    isPlaying.value = true
    isPaused.value = false
    await window.electronAPI.resumeTest()
  } catch (error) {
    console.error('Failed to resume test:', error)
  }
}

const stopTest = async () => {
  try {
    await window.electronAPI.stopTest()
    isPlaying.value = false
    isPaused.value = false
    showResults.value = true
  } catch (error) {
    console.error('Failed to stop test:', error)
  }
}

const pauseAudio = async () => {
  try {
    await window.electronAPI.pauseAudio()
  } catch (error) {
    console.error('Failed to pause audio:', error)
  }
}

const resumeAudio = async () => {
  try {
    await window.electronAPI.resumeAudio()
  } catch (error) {
    console.error('Failed to resume audio:', error)
  }
}

const getStudentStatusClass = (student: StudentStats) => {
  if (!student.currentAnswer) return 'bg-gray-50'
  if (showingAnswer.value) {
    return student.currentAnswer === currentSequence.value?.correctOption
      ? 'bg-green-50'
      : 'bg-red-50'
  }
  return 'bg-blue-50'
}

const getOptionCount = (questionStat: QuestionStats, option: string) => {
  return questionStat.optionCounts[option] || 0
}

const getOptionPercentage = (questionStat: QuestionStats, option: string) => {
  const count = getOptionCount(questionStat, option)
  return questionStat.totalAnswers > 0
    ? (count / questionStat.totalAnswers) * 100
    : 0
}

const closeResults = () => {
  showResults.value = false
}

const exportCSV = async () => {
  if (!testStats.value || !test.value) return

  try {
    // 生成CSV数据
    const rows = [
      ['問題', '正答率', '平均解答時間', '総回答数'],
      ...testStats.value.questionStats.map((stat: any, index: number) => [
        `問題${index + 1}`,
        `${stat.correctRate.toFixed(1)}%`,
        `${stat.averageTime.toFixed(1)}秒`,
        stat.totalAnswers
      ]),
      [],
      ['学生ID', '正答数', '正答率', '平均解答時間'],
      ...students.value.map(student => [
        student.name || `学生${student.id}`,
        student.correctCount,
        `${student.correctRate.toFixed(1)}%`,
        `${student.averageTime?.toFixed(1) || '-'}秒`
      ])
    ]

    const csvContent = rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `test_result_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Failed to export CSV:', error)
  }
}
// 明确定义回调函数的类型
const handleStudentUpdate = (updatedStudents: StudentStats[]) => {
  students.value = updatedStudents
}

const handleStatsUpdate = (stats: {
  currentQuestionStats: QuestionStats
  questionStats: QuestionStats[]
  overallStats: {
    totalAnswers: number
    correctAnswers: number
    correctRate: number
    averageTime: number
  }
}) => {
  currentQuestionStats.value = stats.currentQuestionStats
  questionStats.value = stats.questionStats
  testStats.value = stats
}

// 初期化とクリーンアップ
onMounted(async () => {
  console.log('Test window mounted, setting up handlers')
  // サーバーアドレス取得
  try {
    const addresses = await window.electronAPI.getNetworkAddresses()
    serverAddress.value = addresses[0] || 'localhost'
  } catch (error) {
    console.error('Failed to get server address:', error)
    serverAddress.value = 'localhost'
  }

  // テストデータ初期化
  const cleanup = window.electronAPI.onInitTestData((data) => {
    console.log('Test window received initial data:', data)
    if (data) {
      test.value = data
      console.log('Test data set:', test.value)
    }
  })
  // 状態更新の監視
  window.electronAPI.onTestStateUpdate((state) => {
    playingStage.value = state.playingStage
    remainingTime.value = state.remainingTime
  })

  // 学生リスト更新の監視
  window.electronAPI.onStudentListUpdate((updatedStudents) => {
    console.log('Received student list update:', updatedStudents)
    students.value = updatedStudents
  })

  // 統計更新の監視
  window.electronAPI.onStatsUpdate(handleStatsUpdate)

  onUnmounted(() => {
    cleanup()
  })
  
})

onUnmounted(() => {
  // クリーンアップ処理
})
</script>