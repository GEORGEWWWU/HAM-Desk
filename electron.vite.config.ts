import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts'),
          'preload-maps': resolve('src/preload/preload-maps.ts')
        },
        output: {
          entryFileNames: '[name].js'
        }
      }
    }
  },

  renderer: {
    resolve: { alias: { '@renderer': resolve('src/renderer/src') } },
    plugins: [vue()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          maps: resolve('src/renderer/maps.html')
        }
      }
    }
  }
})
