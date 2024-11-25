<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg max-w-4xl w-full p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">テスト結果</h2>
        <button
          @click="handleClose"
          class="text-gray-500 hover:text-gray-700"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <div class="space-y-6">
        <!-- Overall stats -->
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg text-center">
            <div class="text-3xl font-bold text-green-600">
              {{ overallStats.correctRate.toFixed(1) }}%
            </div>
            <div class="text-sm text-gray-600">総合正答率</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg text-center">
            <div class="text-3xl font-bold text-blue-600">
              {{ students.length }}
            </div>
            <div class="text-sm text-gray-600">参加者数</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg text-center">
            <div class="text-3xl font-bold text-purple-600">
              {{ questionStats.length }}
            </div>
            <div class="text-sm text-gray-600">問題数</div>
          </div>
        </div>

        <!-- Question stats -->
        <div>
          <h3 class="text-lg font-medium mb-4">問題別正答率</h3>
          <div class="space-y-3">
            <div
              v-for="(stat, index) in questionStats"
              :key="index"
              class="bg-gray-50 p-4 rounded-lg"
            >
              <div class="flex justify-between items-center mb-2">
                <div class="font-medium">問題 {{ index + 1 }}</div>
                <div class="text-green-600 font-medium">
                  {{ stat.correctRate.toFixed(1) }}%
                </div>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-green-500 h-2 rounded-full"
                  :style="{ width: `${stat.correctRate}%` }"
                ></div>
              </div>
              <div class="mt-2 text-sm text-gray-600">
                平均回答時間: {{ stat.averageTime.toFixed(1) }}秒
              </div>
            </div>
          </div>
        </div>

        <!-- Student results -->
        <div>
          <h3 class="text-lg font-medium mb-4">学生別結果</h3>
          <div class="overflow-auto max-h-60">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学生
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    正答率
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    正解数
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    回答数
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="student in sortedStudents"
                  :key="student.id"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ student.name || `学生${student.id}` }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ student.correctRate.toFixed(1) }}%
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ student.correctCount }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ student.totalAnswered }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-4 mt-6">
          <button
            @click="handleExport"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            結果をエクスポート
          </button>
          <button
            @click="handleClose"
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
import { computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import type { Student, QuestionStats } from '../types/shims'

interface Props {
  show: boolean
  students: Student[]
  questionStats: QuestionStats[]
  overallStats: {
    correctRate: number
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'export'): void
}>()

const sortedStudents = computed(() => {
  return [...props.students].sort((a, b) => b.correctRate - a.correctRate)
})

const handleClose = () => {
  emit('close')
}

const handleExport = () => {
  emit('export')
}
</script>
