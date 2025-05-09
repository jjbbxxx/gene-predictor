<template>
  <div class="container">
    <h2>癌症基因预测系统</h2>

    <el-upload class="upload-box" action="#" :auto-upload="false" :on-change="handleFileChange">
      <el-button type="primary">选择文件</el-button>
    </el-upload>

    <el-button type="success" @click="submitFile" style="margin-top: 10px">
      模拟预测
    </el-button>

    <el-tabs v-model="activeTab" @tab-click="onTabClick" style="margin-top: 20px;">
      <el-tab-pane label="Top 100 高概率基因" name="top">
        <el-table :data="topTableData" border style="width: 100%; margin-top: 20px;">
          <el-table-column prop="gene_index" label="Gene Index" sortable />
          <el-table-column prop="probability" label="Probability" sortable />
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="图表视图" name="chart">
        <div id="chart" style="width: 1200px; height: 600px; margin: 20px auto 0;"></div>
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
      chart: null
    };
  },
  methods: {
    handleFileChange(file) {
      this.file = file.raw;
    },
    submitFile() {
      fetch('http://127.0.0.1:5000/api/predict_test')
        .then(res => res.json())
        .then(data => {
          this.tableData = data;
          this.topTableData = [...data]
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 100);
          this.$nextTick(() => {
            this.drawChart();
          });
        })
        .catch(err => {
          console.error('请求失败', err);
        });
    },
    drawChart() {
      if (this.chart) {
        this.chart.dispose();
      }
      const chartDom = document.getElementById('chart');
      if (!chartDom) return;

      const chart = echarts.init(chartDom);
      this.chart = chart;
      const top20 = this.topTableData.slice(0, 20);

      chart.setOption({
        title: { text: 'Top 20 Gene Probability (Scatter View)' },
        tooltip: {
          trigger: 'item',
          formatter: (params) => `Gene: ${params.data[0]}<br/>Probability: ${params.data[1]}`
        },
        dataZoom: [
          { type: 'slider', xAxisIndex: 0 },
          { type: 'inside', xAxisIndex: 0 }
        ],
        xAxis: {
          type: 'value',
          name: 'Gene Index',
          min: 0
        },
        yAxis: {
          type: 'value',
          name: 'Probability',
          min: 0.99,
          max: 1
        },
        series: [{
          name: 'Gene',
          type: 'scatter',
          symbolSize: 8,
          data: top20.map(d => [d.gene_index, d.probability]),
          itemStyle: {
            color: '#409EFF'
          },
          markPoint: {
            symbolSize: 30,
            label: {
              show: true,
              formatter: 'Top'
            },
          }
        }]
      });
    },
    onTabClick(tab) {
      if (tab.name === 'chart') {
        this.$nextTick(() => {
          this.drawChart();
        });
      }
    }
  },
};
</script>

<style scoped>
.container {
  padding: 30px;
}
</style>