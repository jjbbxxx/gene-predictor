<template>
  <div class="auth-wrapper">
    <el-card class="auth-card" shadow="always">
      <div class="auth-header">
        <img src="@/assets/logo.png" alt="系统图标" class="auth-logo" />
        <h2 class="auth-title">癌症基因识别系统</h2>
      </div>
      <el-form :model="authForm" ref="authFormRef" label-width="0">
        <el-form-item prop="username"
          :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]">
          <el-input
            v-model="authForm.username"
            placeholder="用户名"
            prefix-icon="el-icon-user"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item prop="password"
          :rules="[{ required: true, message: '请输入密码', trigger: 'blur' }]">
          <el-input
            v-model="authForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="el-icon-lock"
            autocomplete="off"
          />
        </el-form-item>
        <div class="auth-actions">
          <el-button @click="handleRegister">注册</el-button>
          <el-button type="primary" @click="handleLogin">登录</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'LoginView',
  data() {
    return {
      authForm: { username: '', password: '' }
    }
  },
  methods: {
    async handleLogin() {
      console.log('[LoginView] 点击登录，表单数据：', this.authForm)
      try {
        // 校验
        await this.$refs.authFormRef.validate()
        console.log('[LoginView] 校验通过，发起登录请求')
        // 发起登录
        const res = await axios.post('/api/login', this.authForm,{ withCredentials: true })
        console.log('[LoginView] 登录接口返回：', res)
        // 手动调用 check_auth，确认状态
        const status = await axios.get('/api/check_auth',{ withCredentials: true })
        console.log('[LoginView] /api/check_auth 返回：', status.data)
        if (status.data.logged_in) {
          // 显式跳转
          console.log('[LoginView] 登录成功，跳转到 Predict')
          this.$router.replace({ name: 'Predict' })
        } else {
          console.warn('[LoginView] 登录后仍然没拿到 logged_in')
          this.$message.error('登录后状态异常，请重试')
        }
      } catch (err) {
        console.error('[LoginView] 登录失败：', err)
        this.$message.error(err.response?.data?.error || '登录失败')
      }
    },
    async handleRegister() {
      console.log('[LoginView] 点击注册，表单数据：', this.authForm)
      try {
        await this.$refs.authFormRef.validate()
        console.log('[LoginView] 校验通过，发起注册请求')
        const res = await axios.post('/api/register', this.authForm)
        console.log('[LoginView] 注册接口返回：', res)
        // 注册完成后同样走登录检查和跳转
        const status = await axios.get('/api/check_auth')
        console.log('[LoginView] /api/check_auth 返回：', status.data)
        if (status.data.logged_in) {
          this.$router.replace({ name: 'Predict' })
        } else {
          this.$message.error('注册后状态异常，请重试')
        }
      } catch (err) {
        console.error('[LoginView] 注册失败：', err)
        this.$message.error(err.response?.data?.error || '注册失败')
      }
    }
  }
}
</script>

<style scoped>
.auth-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f2f6fc;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 30px 20px;
  border-radius: 8px;
}
.auth-header {
  text-align: center;
  margin-bottom: 30px;
}
.auth-logo {
  width: 48px;
  height: 48px;
  margin-bottom: 10px;
}
.auth-title {
  font-size: 24px;
  font-weight: bold;
}
.auth-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}
.auth-actions .el-button {
  width: 48%;
}
</style>
