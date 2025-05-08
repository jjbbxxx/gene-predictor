<template>
    <div class="container">
      <h2>癌症基因预测系统</h2>
  
      <!-- 上传模块 -->
      <el-upload
        class="upload-box"
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
      >
        <el-button type="primary">选择文件</el-button>
      </el-upload>
  
      <el-button type="success" @click="submitFile" style="margin-top: 10px">
        模拟预测
      </el-button>
  
      <!-- 结果展示表格 -->
      <el-table :data="tableData" style="margin-top: 20px; width: 100%">
        <el-table-column prop="gene" label="基因名称" />
        <el-table-column prop="score" label="预测得分" />
        <el-table-column prop="is_driver" label="是否驱动基因" />
      </el-table>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        file: null,
        tableData: [],
      };
    },
    methods: {
      handleFileChange(file) {
        this.file = file.raw;
      },
      submitFile() {
        // 模拟返回结果
        this.tableData = [
          { gene: 'TP53', score: 0.95, is_driver: '是' },
          { gene: 'BRCA1', score: 0.82, is_driver: '否' },
          { gene: 'EGFR', score: 0.91, is_driver: '是' },
        ];
      },
    },
  };
  </script>
  
  <style scoped>
  .container {
    padding: 30px;
  }
  </style>