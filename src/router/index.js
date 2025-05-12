import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'

// 视图组件
import LoginView from '../views/LoginView.vue'
import PredictView from '../views/PredictView.vue'
import AdminDashboard from '../views/AdminDashboard.vue'

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
    path: '/admin',
    name: 'Admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, adminOnly: true }
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
  // 1. 如果去的页面不需要登录，直接放行
  if (to.meta.requiresAuth === false) {
    return next()
  }

  try {
    // 2. 向后端检查登录 & 管理员状态
    const res = await axios.get('/api/check_auth')
    const { logged_in, is_admin } = res.data

    // 3. 如果没登录，重定向到登录页
    if (!logged_in) {
      return next({ name: 'Login' })
    }

    // 4. 如果目标是管理员页但当前不是管理员，重定向到普通预测页
    if (to.meta.adminOnly && !is_admin) {
      return next({ name: 'Predict' })
    }

    // 5. 如果目标是普通页但当前是管理员，也重定向到后台
    if (!to.meta.adminOnly && is_admin && to.name !== 'Admin') {
      return next({ name: 'Admin' })
    }

    // 6. 否则一切正常
    return next()
  } catch (err) {
    // 请求失败当作未登录处理
    return next({ name: 'Login' })
  }
})

export default router
