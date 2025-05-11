<template>
  <div class="container">
    <!-- 登录对话框 -->
    <el-dialog title="登录" v-model:modelValue="showLoginDialog" append-to-body width="30%">
      <el-form :model="loginForm" ref="loginFormRef">
        <el-form-item label="用户名" prop="username" :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]">
          <el-input v-model="loginForm.username" autocomplete="off" />
        </el-form-item>
        <el-form-item label="密码" prop="password" :rules="[{ required: true, message: '请输入密码', trigger: 'blur' }]">
          <el-input v-model="loginForm.password" type="password" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLoginDialog = false">取消</el-button>
        <el-button type="primary" @click="handleLogin">登录</el-button>
      </template>
      <div style="margin-top: 10px; text-align: right;">
        <el-link type="primary" @click="openRegister">没有账号？注册</el-link>
      </div>
    </el-dialog>

    <!-- 注册对话框 -->
    <el-dialog title="注册" v-model:modelValue="showRegisterDialog" append-to-body width="30%">
      <el-form :model="registerForm" ref="registerFormRef">
        <el-form-item label="用户名" prop="username" :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]">
          <el-input v-model="registerForm.username" autocomplete="off" />
        </el-form-item>
        <el-form-item label="密码" prop="password" :rules="[{ required: true, message: '请输入密码', trigger: 'blur' }]">
          <el-input v-model="registerForm.password" type="password" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRegisterDialog = false">取消</el-button>
        <el-button type="primary" @click="handleRegister">注册并登录</el-button>
      </template>
    </el-dialog>

    <!-- 登录/注册按钮 -->
    <div v-if="!isLoggedIn" class="auth-actions">
      <el-button type="primary" @click="showLoginDialog = true">登录</el-button>
      <el-button @click="showRegisterDialog = true">注册</el-button>
    </div>

    <!-- 主体内容 -->
    <div v-else>
      <div class="header-actions" style="text-align: right; margin-bottom: 10px;">
        <el-button type="text" @click="handleLogout">退出</el-button>
      </div>

      <h2>癌症基因预测系统</h2>
      <el-upload class="upload-box" :auto-upload="false" :on-change="handleFileChange">
        <el-button type="primary">选择文件</el-button>
      </el-upload>
      <el-button type="success" @click="submitFile" style="margin-top: 10px">开始预测</el-button>

      <!-- 进度条 -->
      <el-progress v-if="progress > 0 && progress < 100" :percentage="progress" style="margin: 10px 0;" />

      <!-- 表格 / 图表 切换 -->
      <el-tabs v-model="activeTab" @tab-click="onTabClick" style="margin-top: 20px;">
        <el-tab-pane label="Top 100 高概率基因" name="top">
          <el-table :data="topTableData" border style="width: 100%; margin-top: 20px;">
            <el-table-column prop="gene_index" label="Gene Index" sortable />
            <el-table-column prop="probability" label="Probability" sortable />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="图表视图" name="chart">
          <div id="chart" style="width: 100%; height: 600px; margin: 20px auto;"></div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import * as echarts from 'echarts'

// API 基础地址与凭证配置
axios.defaults.baseURL = 'http://127.0.0.1:5050'
axios.defaults.withCredentials = true

export default {
  data() {
    return {
      file: null,
      tableData: [],
      topTableData: [],
      activeTab: 'top',
      chart: null,
      progress: 0,
      isLoggedIn: false,
      showLoginDialog: false,
      showRegisterDialog: false,
      loginForm: { username: '', password: '' },
      registerForm: { username: '', password: '' },
    }
  },
  created() {
    // 检查登录状态
    axios.get('/api/check_auth')
      .then(res => { this.isLoggedIn = res.data.logged_in })
      .catch(() => { this.isLoggedIn = false })
  },
  watch: {
    activeTab(newTab) {
      if (newTab === 'chart' && this.topTableData.length) {
        this.$nextTick(() => this.drawChart())
      }
    }
  },
  methods: {
    openRegister() {
      this.showLoginDialog = false
      this.showRegisterDialog = true
    },
    handleLogin() {
      this.$refs.loginFormRef.validate(valid => {
        if (!valid) return
        axios.post('/api/login', this.loginForm)
          .then(() => {
            this.isLoggedIn = true
            this.showLoginDialog = false
          })
          .catch(err => {
            this.$message.error(err.response?.data?.error || '登录失败')
          })
      })
    },
    handleRegister() {
      this.$refs.registerFormRef.validate(valid => {
        if (!valid) return
        axios.post('/api/register', this.registerForm)
          .then(() => {
            this.isLoggedIn = true
            this.showRegisterDialog = false
          })
          .catch(err => {
            this.$message.error(err.response?.data?.error || '注册失败')
          })
      })
    },
    handleLogout() {
      axios.post('/api/logout')
        .then(() => { this.isLoggedIn = false })
        .catch(() => { this.$message.error('退出失败') })
    },
    handleFileChange(file) {
      this.file = file.raw
    },
    submitFile() {
      this.progress = 0
      // SSE 连接后端预测流
      const source = new EventSource(`${axios.defaults.baseURL}/api/predict_stream`, { withCredentials: true })

      source.addEventListener('progress', e => {
        this.progress = parseInt(e.data, 10)
      })

      source.addEventListener('done', e => {
        let data
        try {
          data = JSON.parse(e.data)
        } catch {
          this.$message.error('解析预测结果失败')
          source.close()
          return
        }
        this.tableData = data
        this.topTableData = [...data]
          .sort((a, b) => b.probability - a.probability)
          .slice(0, 100)
        this.progress = 100
        source.close()

        if (this.activeTab === 'chart') {
          this.$nextTick(() => this.drawChart())
        }
      })

      source.addEventListener('error', () => {
        this.$message.error('预测失败')
        source.close()
      })
    },
    drawChart() {
      if (!this.topTableData.length) return
      if (this.chart) {
        this.chart.dispose()
      }
      const chartDom = document.getElementById('chart')
      if (!chartDom) return
      this.chart = echarts.init(chartDom)
      this.chart.resize()

      const top20 = this.topTableData.slice(0, 20).map(d => [d.gene_index, d.probability])

      this.chart.setOption({
        title: { text: 'Top 20 Gene 概率 (散点图)', left: 'center' },
        tooltip: {
          trigger: 'item',
          formatter: params => `Gene: ${params.data[0]}<br/>Probability: ${params.data[1]}`
        },
        grid: { left: '10%', right: '10%', bottom: '15%', containLabel: true },
        xAxis: { type: 'value', name: 'Gene Index' },
        yAxis: { type: 'value', name: 'Probability', min: 0.99, max: 1 },
        series: [{ name: 'Gene', type: 'scatter', symbolSize: 8, data: top20 }]
      });
    },
    onTabClick(tab) {
      if (tab.name === 'chart' && this.topTableData.length) {
        this.$nextTick(() => this.drawChart())
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 30px;
}
.upload-box {}
.auth-actions { text-align: center; margin-top: 50px; }
.header-actions {}
</style>
