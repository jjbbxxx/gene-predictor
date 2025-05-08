import { createRouter, createWebHistory } from 'vue-router'
import PredictView from '../views/PredictView.vue'

const routes = [
  {
    path: '/',
    name: 'Predict',
    component: PredictView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router