<template>
  <div class="container">
    <div v-if="isLoggedIn">
      <div class="header-actions" style="text-align: right; margin-bottom: 10px;">
        <el-button type="text" @click="handleLogout">退出</el-button>
      </div>

      <h2>癌症基因预测系统</h2>

      <!-- 文件上传 -->
      <el-upload class="upload-box" :auto-upload="false" :on-change="handleFileChange">
        <el-button type="primary">选择文件</el-button>
      </el-upload>
      <el-button type="success" @click="submitFile" style="margin-top: 10px">开始预测</el-button>

      <!-- 进度条 -->
      <el-progress v-if="progress > 0 && progress < 100" :percentage="progress" style="margin: 10px 0;" />

      <!-- 表格 / 图表 切换 -->
      <el-tabs v-model="activeTab" @tab-click="onTabClick" style="margin-top: 20px;">
        <el-tab-pane label="Top 100 高概率基因" name="top">
          <el-table class="top-table" :data="topTableData" border style="width: 100%; margin-top: 20px;">
            <el-table-column prop="gene_index" label="Gene Index" sortable />
            <el-table-column prop="probability" label="Probability" sortable />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="图表视图" name="chart">
          <div ref="chartContainer" class="chart-box"></div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 未登录时提示 -->
    <div v-else>
      <h3>请登录后进行操作</h3>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import * as echarts from 'echarts'

axios.defaults.baseURL = 'http://127.0.0.1:5050'
axios.defaults.withCredentials = true

export default {
  data() {
    return {
      isLoggedIn: false,
      topTableData: [],
      activeTab: 'top',
      chart: null,
      progress: 0,
      file: null
    }
  },
  created() {
    this.checkAuth()
  },
  methods: {
    checkAuth() {
      axios.get('/api/check_auth')
        .then(res => {
          this.isLoggedIn = res.data.logged_in
        })
        .catch(() => {
          this.isLoggedIn = false
        })
    },
    handleFileChange(file) {
      this.file = file.raw
    },
    submitFile() {
      this.progress = 0
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
        this.topTableData = data
          .sort((a, b) => b.probability - a.probability)
          .slice(0, 100)
        this.progress = 100
        source.close()

        // 如果当前在图表页，绘制图表
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
      const chartContainer = this.$refs.chartContainer
      if (!chartContainer || !this.topTableData.length) return

      // 确保容器的宽高有效
      if (chartContainer.clientWidth === 0 || chartContainer.clientHeight === 0) {
        console.warn('图表容器宽高为 0，无法绘制图表')
        return
      }

      // 如果已经有实例，先销毁再创建
      if (this.chart) {
        this.chart.dispose()
      }

      this.chart = echarts.init(chartContainer)
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
      })
    },

    onTabClick(tab) {
      if (tab.name === 'chart' && this.topTableData.length) {
        this.$nextTick(() => this.drawChart())
      }
    },

    handleLogout() {
      // 调用 API 清除会话
      axios.post('/api/logout')
        .then(() => {
          // 更新登录状态，跳转到登录页
          this.$router.push({ name: 'Login' })  // 使用 vue-router 进行页面跳转
        })
        .catch(() => {
          this.$message.error('退出失败')
        })
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
.chart-box {
  width: 100%;
  height: 600px;
  margin: 20px auto;
}
</style>
