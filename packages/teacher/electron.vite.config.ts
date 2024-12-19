import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['ws', 'electron', 'path', 'fs', 'url', 'events', 'os', 'http']  // 添加所有需要的Node.js内置模块
      }
    },
    entry: 'src/main/index.ts' // 添加这个入口配置
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        external: ['ws']
      }
    },
    entry: 'src/preload/index.ts' // 添加这个入口配置
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        },
        external: ['ws']
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer')
      }
    },
    plugins: [vue()],
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer
        ]
      }
    }
  }
})