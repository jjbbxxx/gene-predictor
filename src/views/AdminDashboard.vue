<template>
  <div class="admin-view">
    <div class="header">
      <h2>管理员控制台</h2>
      <el-button type="text" @click="handleLogout">退出</el-button>  <!-- 退出按钮 -->
    </div>

    <el-table :data="users" border style="width: 100%; margin-top: 20px;">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column label="管理员权限">
        <template #default="scope">
          <el-switch
            v-model="scope.row.is_admin"
            @change="toggleAdmin(scope.row)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'AdminDashboard',
  data() {
    return {
      users: []
    }
  },
  created() {
    axios.get('/api/users')
      .then(res => { this.users = res.data })
      .catch(() => { this.$message.error('加载用户列表失败') })
  },
  methods: {
    toggleAdmin(user) {
      axios.put(`/api/users/${user.id}`, { is_admin: user.is_admin })
        .then(() => this.$message.success('权限已更新'))
        .catch(() => {
          this.$message.error('更新失败')
          user.is_admin = !user.is_admin
        })
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
.admin-view {
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
