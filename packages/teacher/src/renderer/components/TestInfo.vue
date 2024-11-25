// src/renderer/components/TestInfo.vue
<template>
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h3 class="text-lg font-medium">テスト情報</h3>
        <p class="text-sm text-gray-500">総問題数: {{ totalQuestions }}問</p>
      </div>
      <div class="text-right">
        <p class="text-sm text-gray-500">現在の問題: {{ currentQuestion + 1 }}</p>
        <p class="text-sm text-gray-500">残り時間: {{ remainingTime }}秒</p>
      </div>
    </div>

    <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
      <div
        class="bg-blue-600 h-2 rounded-full transition-all duration-300"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <div class="grid grid-cols-2 gap-4 mt-4">
      <div class="bg-gray-50 rounded p-3">
        <div class="text-sm text-gray-600">正答率</div>
        <div class="text-2xl font-bold text-green-600">
          {{ correctRate.toFixed(1) }}%
        </div>
      </div>
      <div class="bg-gray-50 rounded p-3">
        <div class="text-sm text-gray-600">平均解答時間</div>
        <div class="text-2xl font-bold text-blue-600">
          {{ averageTime.toFixed(1) }}秒
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentQuestion: number
  totalQuestions: number
  remainingTime: number
  correctRate: number
  averageTime: number
}>()

const progress = computed(() => 
  (currentQuestion.value + 1) / totalQuestions.value * 100
)
</script>