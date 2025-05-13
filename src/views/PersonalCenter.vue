<template>
    <el-container class="personal-center">
        <!-- 顶部 欢迎栏 -->
        <div class="top-bar">
            <span>欢迎您，{{ username }}&nbsp;</span>
            <el-link type="primary" @click="goPredict">预测界面</el-link>
            <span>｜</span>
            <el-link type="primary" @click="handleLogout">退出登录</el-link>
        </div>

        <!-- 左侧导航 -->
        <el-aside width="200px" class="personal-aside">
            <el-menu :default-active="activeMenu" @select="onMenuSelect" class="el-menu-vertical-demo">
                <el-menu-item index="predictions">预测记录</el-menu-item>
                <el-menu-item index="change_pwd">修改密码</el-menu-item>
                <el-menu-item v-if="isAdmin" index="members">成员管理</el-menu-item>
            </el-menu>
        </el-aside>

        <!-- 右侧内容区 -->
        <el-container>
            <el-header class="personal-header"></el-header>
            <el-main class="personal-main">
                <!-- 预测记录 -->
                <div v-if="activeMenu === 'predictions'">
                    <el-table :data="predictions" border style="width: 100%; margin-bottom: 20px;">
                        <el-table-column prop="id" label="记录 ID" width="100" />
                        <el-table-column prop="username" label="用户名" /> <!-- 显示用户名 -->
                        <el-table-column prop="timestamp" label="预测时间" />
                        <el-table-column label="批注" width="100">
                            <template #default="scope">
                                <el-button type="text" size="small"
                                    @click="viewAnnotations(scope.row.id)">查看</el-button>
                            </template>
                        </el-table-column>

                        <el-table-column label="下载 CSV">
                            <template #default="scope">
                                <el-button type="primary" size="small"
                                    @click="downloadPrediction(scope.row.id)">下载</el-button>
                            </template>
                        </el-table-column>

                    </el-table>

                </div>

                <!-- 修改密码 -->
                <div v-else-if="activeMenu === 'change_pwd'">
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

                <!-- 成员管理，仅管理员可见 -->
                <div v-else-if="activeMenu === 'members' && isAdmin">
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
            </el-main>
        </el-container>
    </el-container>
    <el-dialog title="历史批注" v-model="annoHistoryModal" width="500px">
        <el-table :data="annoHistory" border>
            <el-table-column prop="gene_index" label="Gene Index" width="100" />
            <el-table-column prop="comment" label="批注内容" />
            <el-table-column prop="timestamp" label="时间" width="180" />
        </el-table>
        <template #footer>
            <el-button @click="annoHistoryModal = false">关闭</el-button>
        </template>
    </el-dialog>

</template>

<script>
import axios from 'axios'

axios.defaults.baseURL = 'http://127.0.0.1:5050'
axios.defaults.withCredentials = true

export default {
    name: 'PersonalCenter',
    data() {
        return {
            activeMenu: 'predictions',
            isAdmin: false,
            username: '',
            users: [],
            predictions: [],
            pwdForm: {
                old_password: '',
                new_password: ''
            },
            annoHistoryModal: false,
            annoHistory: [],
        }
    },
    created() {
        // 获取用户身份信息
        axios
            .get('/api/check_auth')
            .then(res => {
                this.isAdmin = res.data.is_admin
                this.username = res.data.username || ''
            })
            .catch(() => {
                this.$message.error('获取用户信息失败')
            })
        // 默认加载预测记录
        this.loadPredictions()
    },
    methods: {
        // 侧边栏切换
        onMenuSelect(key) {
            this.activeMenu = key
            if (key === 'members') {
                this.loadUsers()
            } else if (key === 'predictions') {
                this.loadPredictions()
            } else if (key === 'change_pwd') {
                // 切换到修改密码时，重置表单验证状态
                this.$refs.pwdFormRef && this.$refs.pwdFormRef.clearValidate()
                this.pwdForm.old_password = ''
                this.pwdForm.new_password = ''
            }
        },
        // 加载用户列表（仅管理员）
        loadUsers() {
            axios
                .get('/api/users')
                .then(res => {
                    this.users = res.data
                })
                .catch(() => {
                    this.$message.error('加载用户列表失败')
                })
        },
        // 加载预测记录（管理员加载所有，普通用户加载自己）
        loadPredictions() {
            axios
                .get('/api/predictions')
                .then(res => {
                    this.predictions = res.data
                })
                .catch(() => {
                    this.$message.error('加载预测记录失败')
                })
        },
        // 切换用户管理员权限
        toggleAdmin(user) {
            axios
                .put(`/api/users/${user.id}`, { is_admin: user.is_admin })
                .then(() => this.$message.success('权限已更新'))
                .catch(() => {
                    this.$message.error('更新失败')
                    user.is_admin = !user.is_admin
                })
        },
        // 下载指定预测记录的 CSV
        downloadPrediction(id) {
            window.open(`${axios.defaults.baseURL}/api/download_csv/${id}`, '_blank')
        },
        // 提交修改密码
        submitChangePwd() {
            this.$refs.pwdFormRef.validate(async valid => {
                if (!valid) return
                try {
                    await axios.post('/api/change_password', this.pwdForm)
                    this.$message.success('密码修改成功')
                    this.pwdForm.old_password = ''
                    this.pwdForm.new_password = ''
                } catch (err) {
                    this.$message.error(err.response?.data?.error || '修改失败')
                }
            })
        },
        // 跳转到预测页
        goPredict() {
            console.log("Going to Predict page...");
            this.$router.push({ name: 'Predict' })
        },
        // 退出登录
        handleLogout() {
            axios
                .post('/api/logout')
                .then(() => {
                    this.$router.push({ name: 'Login' })
                })
                .catch(() => {
                    this.$message.error('退出失败')
                })
        },
        viewAnnotations(pid) {
            axios.get(`/api/predictions/${pid}/annotations`)
                .then(res => {
                    this.annoHistory = res.data
                    this.annoHistoryModal = true
                })
                .catch(() => {
                    this.$message.error('加载批注失败')
                })
        }
    }
}
</script>

<style scoped>
.personal-center {
    height: 100vh;
    position: relative;
}

.top-bar {
    position: absolute;
    top: 10px;
    right: 20px;
    z-index: 100;
    white-space: nowrap;
}

.personal-aside {
    background-color: #f5f7fa;
}

.personal-header {
    /* 如果需要 header 样式，可自行添加 */
}

.personal-main {
    padding: 20px;
    background-color: #fff;
    overflow-y: auto;
}

.pwd-form {
    max-width: 400px;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
}
</style>
