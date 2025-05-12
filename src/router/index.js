import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'

// 视图组件
import LoginView from '../views/LoginView.vue'
import PredictView from '../views/PredictView.vue'
//import AdminDashboard from '../views/AdminDashboard.vue'
import PersonalCenter from '@/views/PersonalCenter.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Predict',
    component: PredictView,
    meta: { requiresAuth: true, adminOnly: false }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: PersonalCenter,
    meta: { requiresAuth: true, adminOnly: false }
  },
  {
    // 兜底重定向
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局导航守卫
router.beforeEach(async (to, from, next) => {
  try {
    const { logged_in } = await axios.get('/api/check_auth').then(res => res.data)
    
    // 1. 如果目标页面不需要登录，直接放行
    if (to.meta.requiresAuth === false) {
      return next()
    }

    // 2. 如果用户没有登录，重定向到登录页面
    if (!logged_in) {
      return next({ name: 'Login' })
    }

    // 3. 如果用户已经登录，允许访问任何页面
    return next()
  } catch (err) {
    // 如果请求失败当作未登录处理
    return next({ name: 'Login' })
  }
})




export default router
