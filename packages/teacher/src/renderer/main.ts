import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

// 创建并挂载应用
const app = createApp(App)

// 使用路由
app.use(router)

// 错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err)
  console.error('Error info:', info)
}

// 挂载应用
app.mount('#app')