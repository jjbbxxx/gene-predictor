<template>
  <el-container class="admin-container">
    <!-- 侧边栏 -->
    <el-aside width="200px" class="admin-aside">
      <el-menu :default-active="activeMenu" @select="onMenuSelect" class="el-menu-vertical-demo">
        <el-menu-item index="members">成员管理</el-menu-item>
        <el-menu-item index="predictions">预测记录</el-menu-item>
        <el-menu-item index="change_pwd">修改密码</el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部操作栏 -->
      <el-header class="admin-header">
        <h2>管理员控制台</h2>
        <el-button type="text" @click="handleLogout">退出</el-button>
      </el-header>

      <!-- 主体内容根据 activeMenu 渲染 -->
      <el-main class="admin-main">
        <!-- 成员管理视图 -->
        <div v-if="activeMenu === 'members'">
          <el-table :data="users" border style="width: 100%;">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column label="管理员权限">
              <template #default="scope">
                <el-switch v-model="scope.row.is_admin" @change="toggleAdmin(scope.row)" />
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 预测记录视图 -->
        <div v-else-if="activeMenu === 'predictions'">
          <el-table :data="predictions" border style="width: 100%;">
            <el-table-column prop="id" label="记录 ID" width="100" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="timestamp" label="预测时间" />
            <el-table-column label="下载 CSV">
              <template #default="scope">
                <el-button type="primary" size="small" @click="downloadPrediction(scope.row.id)">下载</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 修改密码 -->
        <div v-else-if="activeMenu === 'change_pwd'" class="change-pwd-form">
          <el-form :model="pwdForm" ref="pwdFormRef" label-width="100px" class="pwd-form">
            <el-form-item label="旧 密 码" prop="old_password"
              :rules="[{ required: true, message: '请输入旧密码', trigger: 'blur' }]">
              <el-input v-model="pwdForm.old_password" type="password" autocomplete="off" />
            </el-form-item>
            <el-form-item label="新 密 码" prop="new_password"
              :rules="[{ required: true, message: '请输入新密码', trigger: 'blur' }]">
              <el-input v-model="pwdForm.new_password" type="password" autocomplete="off" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitChangePwd">提交修改</el-button>
            </el-form-item>
          </el-form>
        </div>


      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import axios from 'axios'

export default {
  name: 'AdminDashboard',
  data() {
    return {
      activeMenu: 'members',  // 默认显示成员管理
      users: [],
      predictions: [],
      pwdForm: {
        old_password: '',
        new_password: ''
      }
    }
  },
  created() {
    this.loadUsers()
    // 如果默认菜单是 predictions，可以在这里加载
    if (this.activeMenu === 'predictions') {
      this.loadPredictions()
    }
  },
  methods: {
    onMenuSelect(key) {
      this.activeMenu = key
      if (key === 'predictions') {
        this.loadPredictions()
      } else if (key === 'members') {
        this.loadUsers()
      }
    },
    loadUsers() {
      axios.get('/api/users')
        .then(res => { this.users = res.data })
        .catch(() => { this.$message.error('加载用户列表失败') })
    },
    loadPredictions() {
      axios.get('/api/predictions')
        .then(res => { this.predictions = res.data })
        .catch(() => { this.$message.error('加载预测记录失败') })
    },
    toggleAdmin(user) {
      axios.put(`/api/users/${user.id}`, { is_admin: user.is_admin })
        .then(() => this.$message.success('权限已更新'))
        .catch(() => {
          this.$message.error('更新失败')
          user.is_admin = !user.is_admin
        })
    },
    downloadPrediction(id) {
      window.open(`${axios.defaults.baseURL}/api/download_csv/${id}`, '_blank')
    },
    handleLogout() {
      axios.post('/api/logout')
        .then(() => {
          this.$router.push({ name: 'Login' })
        })
        .catch(() => {
          this.$message.error('退出失败')
        })
    },
    submitChangePwd() {
      this.$refs.pwdFormRef.validate(valid => {
        if (!valid) return
        axios.post('/api/change_password', this.pwdForm)
          .then(() => {
            this.$message.success('密码修改成功')
            // 清空表单
            this.pwdForm.old_password = ''
            this.pwdForm.new_password = ''
          })
          .catch(err => {
            const msg = err.response?.data?.error || '修改失败'
            this.$message.error(msg)
          })
      })
    }
  }
}
</script>

<style scoped>
.admin-container {
  height: 100vh;
}

.admin-aside {
  background-color: #f5f7fa;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.admin-main {
  padding: 20px;
  background-color: #fff;
  overflow-y: auto;
}
</style>
