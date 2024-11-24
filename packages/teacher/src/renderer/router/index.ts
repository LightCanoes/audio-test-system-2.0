import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'settings',
    component: () => import('../views/TestSettings.vue')
  },
  {
    path: '/test',
    name: 'test',
    component: () => import('../views/TestWindow.vue')
  },
  {
    path: '/student',
    name: 'student',
    component: () => import('../views/StudentView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router