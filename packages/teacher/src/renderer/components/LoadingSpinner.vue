<template>
  <div v-if="show" class="flex items-center justify-center">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span v-if="message" class="ml-3 text-gray-600">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  message?: string
}>()
</script>
