import { createRouter, createWebHashHistory } from 'vue-router'


const routes = [
  { path: '/', name: 'home', component: () => import('./views/HamHome.vue') },
  { path: '/log', name: 'log', component: () => import('./views/HamLog.vue') },
  { path: '/relay', name: 'relay', component: () => import('./views/RelayQuery.vue') },
  { path: '/exam', name: 'exam', component: () => import('./views/HamExam.vue') },
  { path: '/maps', name: 'maps', component: () => import('./components/HamMaps.vue') }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
