<template>
  <div class="container">
    <!-- 右上角欢迎栏 -->
    <div class="top-bar">
      <span>欢迎您，{{ username }}&nbsp;</span>
      <el-link type="primary" @click="goProfile">个人中心</el-link>
      <span>｜</span>
      <el-link type="primary" @click="handleLogout">退出登录</el-link>
    </div>

    <div v-if="isLoggedIn">
      <h2>癌症基因识别系统</h2>

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
          <el-button v-if="topTableData.length" type="success" @click="downloadCSV" style="margin-top: 10px;">
            下载原始预测结果 (CSV)
          </el-button>
          <el-table class="top-table" :data="topTableData" border style="width: 100%; margin-top: 20px;">
            <el-table-column prop="gene_index" label="Gene Index" sortable />
            <el-table-column prop="probability" label="Probability" sortable />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button size="mini" @click="openAnnoModal(scope.row)">批注</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="图表视图" name="chart">
          <div ref="chartContainer" class="chart-box"></div>
          <el-button type="success" @click="downloadChart" style="margin-top: 10px;">下载图表</el-button>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div v-else>
      <h3>请登录后进行操作</h3>
    </div>
  </div>
  <el-dialog title="基因批注" v-model="annoModalVisible">
  <div>Gene Index: {{ currentAnnoRow?.gene_index }}</div>
  <el-input
    type="textarea"
    v-model="annoComment"
    placeholder="请输入批注内容"
    rows="4"
  />
  <template #footer>
    <el-button @click="annoModalVisible = false">取消</el-button>
    <el-button type="primary" @click="saveAnnotation">保存</el-button>
  </template>
</el-dialog>
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
      isAdmin: false,
      username: '',
      topTableData: [],
      activeTab: 'top',
      chart: null,
      progress: 0,
      file: null,
      annoModalVisible: false,
      currentAnnoRow: null,
      annoComment: ''
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
          this.isAdmin = res.data.is_admin
          this.username = res.data.username || ''
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
        (async () => {
          try {
            const res = await axios.get('/api/predictions')
            if (Array.isArray(res.data) && res.data.length > 0) {
              // 假设 predictions 接口按 timestamp 倒序返回
              this.currentPredId = res.data[0].id
            }
          } catch {
            this.$message.error('获取预测 ID 失败，无法批注')
          }
        })()
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
      this.chart.on('click', params => {
        if (params.seriesType === 'scatter') {
          const geneIndex = params.data[0]
          // 同表格，打开批注框
          this.openAnnoModal({ gene_index: geneIndex })
        }
      })
    },

    downloadChart() {
      if (!this.chart) {
        this.$message.error('图表未生成')
        return
      }
      const imgUrl = this.chart.getDataURL({
        pixelRatio: 2,  // 图片清晰度
        backgroundColor: '#fff'
      })

      // 创建一个临时链接下载图表
      const link = document.createElement('a')
      link.href = imgUrl
      link.download = '预测图表.png'
      link.click()
    },

    downloadCSV() {
      axios.get('/api/download_csv', { responseType: 'blob' })
        .then(response => {
          // 创建一个临时链接并点击下载
          const url = URL.createObjectURL(response.data)
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', 'predictions.csv')
          link.click()
          URL.revokeObjectURL(url)  // 清理临时链接
        })
        .catch(() => {
          this.$message.error('下载失败')
        })
    },

    onTabClick(tab) {
      if (tab.name === 'chart' && this.topTableData.length) {
        this.$nextTick(() => this.drawChart())
      }
    },
    goProfile() {
      this.$router.push({ name: 'Profile' })
    },
    handleLogout() {
      // 调用 API 清除会话
      axios.post('/api/logout')
        .then(() => {
          this.isLoggedIn = false
          // 更新登录状态，跳转到登录页
          this.$router.push({ name: 'Login' })  // 使用 vue-router 进行页面跳转
        })
        .catch(() => {
          this.$message.error('退出失败')
        })

    },
    openAnnoModal(row) {
      this.currentAnnoRow = row
      // 先拉取已有批注（可选）
      axios.get(`/api/predictions/${this.currentPredId}/annotations`)
        .then(res => {
          const a = res.data.find(x => x.gene_index === row.gene_index)
          this.annoComment = a ? a.comment : ''
          this.annoModalVisible = true
        })
    },
    saveAnnotation() {
      axios.post(`/api/predictions/${this.currentPredId}/annotations`, {
        gene_index: this.currentAnnoRow.gene_index,
        comment: this.annoComment
      }).then(() => {
        this.$message.success('批注已保存')
        this.annoModalVisible = false
      }).catch(err => {
        this.$message.error(err.response?.data?.error || '保存失败')
      })
    }
  }
}
</script>

<style scoped>
.container {
  padding: 30px;
}

/* 右上角欢迎栏 */
.top-bar {
  text-align: right;
  padding: 10px 30px;
  background-color: #f5f7fa;
}

.chart-box {
  width: 100%;
  height: 600px;
  margin: 20px auto;
}
</style>

