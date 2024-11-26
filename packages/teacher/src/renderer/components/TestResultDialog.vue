<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6"
    @click.self="close"
  >
    <div class="bg-white rounded-lg max-w-4xl w-full p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">テスト結果</h2>
        <button
          @click="close"
          class="text-gray-500 hover:text-gray-700"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- 総合成績 -->
      <div class="grid grid-cols-3 gap-6 mb-8">
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <div class="text-3xl font-bold text-green-600">
            {{ stats.overallStats.correctRate.toFixed(1) }}%
          </div>
          <div class="text-sm text-gray-600">総合正答率</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <div class="text-3xl font-bold text-blue-600">
            {{ stats.overallStats.averageTime.toFixed(1) }}秒
          </div>
          <div class="text-sm text-gray-600">平均解答時間</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <div class="text-3xl font-bold text-purple-600">
            {{ stats.students.length }}
          </div>
          <div class="text-sm text-gray-600">参加人数</div>
        </div>
      </div>

      <!-- 学生別成績 -->
      <div class="mb-8">
        <h3 class="text-lg font-medium mb-4">学生別成績</h3>
        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="student in stats.students"
            :key="student.id"
            class="bg-gray-50 rounded-lg p-4"
          >
            <div class="flex justify-between items-center">
              <div>
                <div class="font-medium">{{ student.name || `学生${student.id}` }}</div>
                <div class="text-sm text-gray-600">
                  正解: {{ student.correctCount }}/{{ totalQuestions }}問
                </div>
              </div>
              <div class="text-2xl font-bold"
                :class="{
                  'text-green-600': student.correctRate >= 80,
                  'text-yellow-600': student.correctRate >= 60 && student.correctRate < 80,
                  'text-red-600': student.correctRate < 60
                }"
              >
                {{ student.correctRate.toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 問題別統計 -->
      <div>
        <h3 class="text-lg font-medium mb-4">問題別統計</h3>
        <div class="space-y-6">
          <div
            v-for="(questionStat, index) in stats.questionStats"
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
                v-for="option in getQuestionOptions(index)"
                :key="option.value"
                class="flex items-center space-x-2"
              >
                <div class="w-8 text-center">{{ option.label }}</div>
                <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all"
                    :class="{
                      'bg-green-500': option.value === getCorrectOption(index),
                      'bg-gray-400': option.value !== getCorrectOption(index)
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
          @click="exportPDF"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          PDFエクスポート
        </button>
        <button
          @click="close"
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          閉じる
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid'
import type { TestSettings, TestOption } from '../types'

interface Props {
  show: boolean
  stats: any // 这里可以定义具体的统计类型
  test: TestSettings
  totalQuestions: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const close = () => {
  emit('close')
}

const getQuestionOptions = (questionIndex: number) => {
  return props.test.sequences[questionIndex].options
}

const getCorrectOption = (questionIndex: number) => {
  return props.test.sequences[questionIndex].correctOption
}

const getOptionCount = (questionStat: any, option: string) => {
  return questionStat.optionCounts[option] || 0
}

const getOptionPercentage = (questionStat: any, option: string) => {
  const count = getOptionCount(questionStat, option)
  return questionStat.totalAnswers > 0
    ? (count / questionStat.totalAnswers) * 100
    : 0
}

const exportCSV = async () => {
  try {
    // 生成CSV数据
    const rows = [
      // ヘッダー
      ['学生ID', '名前', '正解数', '正答率', '平均解答時間'],
      // 学生データ
      ...props.stats.students.map(student => [
        student.id,
        student.name || `学生${student.id}`,
        student.correctCount,
        `${student.correctRate.toFixed(1)}%`,
        `${student.averageTime.toFixed(1)}秒`
      ]),
      // 空行
      [],
      // 問題別統計
      ['問題番号', '正答率', '平均解答時間', '回答者数'],
      ...props.stats.questionStats.map((stat, index) => [
        `問題${index + 1}`,
        `${stat.correctRate.toFixed(1)}%`,
        `${stat.averageTime.toFixed(1)}秒`,
        stat.totalAnswers
      ])
    ]

    // 将数组转换为CSV文本
    const csvContent = rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // 下载文件
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

const exportPDF = async () => {
  try {
    // 调用主进程的PDF导出功能
    await window.electronAPI.exportTestResultPDF({
      stats: props.stats,
      test: props.test,
      totalQuestions: props.totalQuestions
    })
  } catch (error) {
    console.error('Failed to export PDF:', error)
  }
}
</script>