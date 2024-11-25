<template>
  <div
    v-if="show"
    class="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 flex items-center"
    role="alert"
  >
    <span class="mr-2">{{ message }}</span>
    <button
      @click="handleClose"
      class="ml-auto bg-transparent text-red-700 hover:text-red-800 font-semibold"
    >
      <XMarkIcon class="h-5 w-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  show: boolean
  message: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleClose = () => {
  emit('close')
}
</script>
