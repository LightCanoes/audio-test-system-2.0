import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['ws']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['ws']
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    plugins: [vue()],
    build: {
      rollupOptions: {
        external: ['ws']
      }
    }
  }
})