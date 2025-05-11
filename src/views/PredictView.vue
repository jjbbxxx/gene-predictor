<template>
  <div class="container">
    <h2>癌症基因预测系统</h2>
    <el-upload
      class="upload-box"
      :auto-upload="false"
      :on-change="handleFileChange"
    >
      <el-button type="primary">选择文件</el-button>
    </el-upload>
    <el-button
      type="success"
      @click="submitFile"
      style="margin-top: 10px"
    >
      开始预测
    </el-button>

    <!-- 进度条 -->
    <el-progress
      v-if="progress > 0 && progress < 100"
      :percentage="progress"
      style="margin: 10px 0;"
    />

    <!-- 表格 / 图表 切换 -->
    <el-tabs v-model="activeTab" @tab-click="onTabClick" style="margin-top: 20px;">
      <el-tab-pane label="Top 100 高概率基因" name="top">
        <el-table
          :data="topTableData"
          border
          style="width: 100%; margin-top: 20px;"
        >
          <el-table-column prop="gene_index" label="Gene Index" sortable />
          <el-table-column prop="probability" label="Probability" sortable />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="图表视图" name="chart">
        <div
          id="chart"
          style="width: 100%; height: 600px; margin: 20px auto;"
        ></div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  data() {
    return {
      file: null,
      tableData: [],
      topTableData: [],
      activeTab: 'top',
      chart: null,
      progress: 0,
    }
  },
  watch: {
    // 切到图表页且已有数据时自动绘制
    activeTab(newTab) {
      if (newTab === 'chart' && this.topTableData.length) {
        this.$nextTick(() => this.drawChart())
      }
    }
  },
  methods: {
    handleFileChange(file) {
      this.file = file.raw
    },
    submitFile() {
      this.progress = 0
      const source = new EventSource('http://127.0.0.1:5000/api/predict_stream')

      // 监听进度
      source.addEventListener('progress', e => {
        this.progress = parseInt(e.data, 10)
      })

      // 监听完成
      source.addEventListener('done', e => {
        let data
        try {
          data = JSON.parse(e.data)
        } catch (err) {
          console.error('解析预测结果失败', err, e.data)
          source.close()
          return
        }
        this.tableData     = data
        this.topTableData  = [...data]
          .sort((a, b) => b.probability - a.probability)
          .slice(0, 100)
        this.progress = 100
        source.close()

        // 如果当前正好在图表页，就立即绘制
        if (this.activeTab === 'chart') {
          this.$nextTick(() => this.drawChart())
        }
      })

      // 监听错误
      source.addEventListener('error', () => {
        console.error('预测失败')
        source.close()
      })
    },

      drawChart() {
    // 只有有数据时才绘制
    if (!this.topTableData.length) return

    // 销毁旧实例
    if (this.chart) {
      this.chart.dispose()
    }
    const chartDom = document.getElementById('chart')
    if (!chartDom) return

    // 初始化并 resize
    this.chart = echarts.init(chartDom)
    this.chart.resize()

    // 取前 20 个点
    const top20 = this.topTableData.slice(0, 20).map(d => [d.gene_index, d.probability])

    // 画图，只保留基础配置，无 dataZoom
    this.chart.setOption({
      title: {
        text: 'Top 20 Gene 概率 (散点图)',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: params =>
          `Gene: ${params.data[0]}<br/>Probability: ${params.data[1]}`
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Gene Index'
      },
      yAxis: {
        type: 'value',
        name: 'Probability',
        min: 0.99,
        max: 1
      },
      series: [
        {
          name: 'Gene',
          type: 'scatter',
          symbolSize: 8,
          data: top20,
          markPoint: {
            symbolSize: 30,
            label: { show: true, formatter: 'Top' }
          }
        }
      ]
    })
  },

    onTabClick(tab) {
      // 切到图表页且已有数据时绘制
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
.upload-box {
  /* 自定义上传框样式 */
}
</style>
