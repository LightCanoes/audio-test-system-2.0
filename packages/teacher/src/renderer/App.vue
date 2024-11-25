<template>
  <audio-player />
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
import AudioPlayer from './components/AudioPlayer.vue'
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-leave-to,
.fade-enter-from {
  opacity: 0;
}
</style>