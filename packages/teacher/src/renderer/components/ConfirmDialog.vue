<template>
    <div
      v-if="show"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="$emit('cancel')"
    >
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-medium mb-4">{{ title }}</h3>
        <p class="text-gray-600 mb-6">{{ message }}</p>
        <div class="flex justify-end space-x-4">
          <button
            @click="$emit('cancel')"
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            キャンセル
          </button>
          <button
            @click="$emit('confirm')"
            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  defineProps<{
    show: boolean
    title: string
    message: string
    confirmText: string
  }>()
  
  defineEmits<{
    (e: 'confirm'): void
    (e: 'cancel'): void
  }>()
  </script>