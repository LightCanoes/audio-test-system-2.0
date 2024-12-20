// src/renderer/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'
import TestSettings from '../views/TestSettings.vue'
import TestWindow from '../views/TestWindow.vue'
import StudentView from '../views/StudentView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'settings',
      component: TestSettings
    },
    {
      path: '/test',
      name: 'test',
      component: TestWindow
    },
    {
      path: '/student',
      name: 'student',
      component: StudentView
    }
  ]
})

export default router