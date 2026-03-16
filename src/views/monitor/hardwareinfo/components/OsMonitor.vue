<template>
  <el-card shadow="hover" class="custom-card" style="margin-top: 20px;">
    <template #header>
      <div class="title-wrapper">
        <span class="main-title">操作系统基础信息与深度监控</span>
        <span class="sub-title">包含进程、用户组及应用列表</span>
      </div>
    </template>
    
    <div v-if="currentDevice">
      <div v-if="hasOsData">
        <el-tabs v-model="activeOsTab" class="os-tabs">
          <el-tab-pane label="系统与用户组" name="sysinfo">
            <el-descriptions class="custom-descriptions" :column="3" border>
              <el-descriptions-item label-class-name="desc-label">
                <template #label>操作系统 <el-tooltip content="运行的操作系统发行版" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <span class="highlight-text">{{ osDetail.osName }}</span>
              </el-descriptions-item>
              <el-descriptions-item label-class-name="desc-label">
                <template #label>发行版本 <el-tooltip content="操作系统的具体版本号" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                {{ osDetail.osVersion }}
              </el-descriptions-item>
              <el-descriptions-item label-class-name="desc-label">
                <template #label>内核版本 <el-tooltip content="Linux Kernel 内核版本号" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                {{ osDetail.kernelVersion }}
              </el-descriptions-item>

              <el-descriptions-item label-class-name="desc-label">
                <template #label>服务器 IP <el-tooltip content="数据库记录的管理或业务IP" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <span style="font-weight: bold;">{{ currentDevice.ipAddress }}</span>
              </el-descriptions-item>
              <el-descriptions-item label-class-name="desc-label">
                <template #label>系统用户名 <el-tooltip content="数据库记录的系统默认登录用户" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                {{ currentDevice.username }}
              </el-descriptions-item>
              <el-descriptions-item label-class-name="desc-label">
                <template #label>节点属性 <el-tooltip content="标识是否加入 Kubernetes 集群" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <el-tag :type="currentDevice.isK8s === '1' ? 'primary' : 'info'" size="small" effect="light">
                  {{ currentDevice.isK8s === '1' ? 'K8s 集群节点' : '普通物理机节点' }}
                </el-tag>
              </el-descriptions-item>
              
              <el-descriptions-item label-class-name="desc-label">
                <template #label>负责人 <el-tooltip content="当前资产管理负责人" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <el-tag type="warning" size="small" v-if="currentDevice.leader !== '-'">{{ currentDevice.leader }}</el-tag>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label-class-name="desc-label" :span="2">
                <template #label>录入时间 <el-tooltip content="物理机资产信息录入系统时间" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                {{ currentDevice.createTime }}
              </el-descriptions-item>
            </el-descriptions>

            <div class="section-sub-title" style="margin-top: 20px;">系统用户与用户组分布</div>
            <el-table :data="osDetail.userGroups" border stripe style="width: 100%" max-height="300">
              <el-table-column prop="groupName" label="用户组 (Group)" width="200">
                <template #header>用户组 <el-tooltip content="系统定义的用户组名称" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <template #default="scope"><el-tag effect="plain" type="info">{{ scope.row.groupName }}</el-tag></template>
              </el-table-column>
              <el-table-column prop="users" label="包含用户 (Users)">
                <template #header>包含用户 <el-tooltip content="归属于该用户组的登录用户" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <template #default="scope">
                  <div class="slot-tags">
                    <el-tag v-for="user in scope.row.users" :key="user" size="default" class="mem-tag">
                      <el-icon><User /></el-icon> {{ user }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="实时进程监控" name="processes">
            <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
              <span style="font-size: 13px; color: #909399;"><el-icon><InfoFilled /></el-icon> 数据展示资源占用 Top 的进程组</span>
            </div>
            <el-table :data="osDetail.processes" border stripe style="width: 100%" max-height="500">
              <el-table-column prop="name" label="进程名称" width="180">
                <template #header>进程名称 <el-tooltip content="运行的进程名或进程组名" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <template #default="scope"><span style="font-weight: bold;">{{ scope.row.name }}</span></template>
              </el-table-column>
              <el-table-column prop="pid" label="PID" width="100">
                <template #header>PID <el-tooltip content="进程标识符" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
              </el-table-column>
              <el-table-column prop="state" label="状态" width="120">
                <template #header>状态 <el-tooltip content="进程当前运行状态" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <template #default="scope"><el-tag :type="scope.row.state === 'Running' ? 'success' : 'info'" size="small">{{ scope.row.state }}</el-tag></template>
              </el-table-column>
              <el-table-column prop="cpu" label="CPU使用率" sortable>
                <template #header>CPU使用率 <el-tooltip content="进程分配到的CPU时间占比" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <template #default="scope"><span class="data-badge blue">{{ scope.row.cpu }}%</span></template>
              </el-table-column>
              <el-table-column prop="memory" label="内存占用" sortable>
                <template #header>内存占用 <el-tooltip content="常驻物理内存 (RSS)" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <template #default="scope"><span class="data-badge green">{{ scope.row.memory }}</span></template>
              </el-table-column>
              <el-table-column prop="diskRead" label="磁盘读" width="120">
                <template #header>磁盘读 <el-tooltip content="每秒磁盘读取速率" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
              </el-table-column>
              <el-table-column prop="diskWrite" label="磁盘写" width="120">
                <template #header>磁盘写 <el-tooltip content="每秒磁盘写入速率" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="已安装应用列表" name="apps">
            <el-table :data="osDetail.installedApps" border stripe style="width: 100%" max-height="500">
              <el-table-column type="index" width="50" />
              <el-table-column prop="name" label="软件名称">
                <template #header>软件名称 <el-tooltip content="系统中通过包管理器安装的软件包名称" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
                <template #default="scope"><span class="highlight-text">{{ scope.row.name }}</span></template>
              </el-table-column>
              <el-table-column prop="version" label="版本号">
                <template #header>版本号 <el-tooltip content="当前安装的软件版本" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
              </el-table-column>
              <el-table-column prop="arch" label="架构" width="150" />
            </el-table>
          </el-tab-pane>

        </el-tabs>
      </div>
      <el-empty v-else description="该设备未安装进程/系统级监控探针" />
    </div>
  </el-card>
</template>

<script setup>
import { InfoFilled, User } from '@element-plus/icons-vue'
import { getCurrentInstance, watch, onMounted, onBeforeUnmount } from 'vue'
import { currentDevice, osDetail, hasOsData, activeOsTab, loadOsData } from '@/api/monitor/deviceMonitor'

const { proxy } = getCurrentInstance()

watch(() => currentDevice.value?.name, (newName) => {
  if (newName) {
    console.log('[Debug - OS] 监听到设备名改变，触发OS数据加载:', newName)
    // isSilent 设置为 true 防止两个框同时弹 loading
    loadOsData(proxy, newName, true)
  }
}, { immediate: true })

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    if (currentDevice.value) {
      loadOsData(proxy, currentDevice.value.name, true)
    }
  }, 5000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped lang="scss">
.title-wrapper { display: flex; flex-direction: column; .main-title { font-size: 18px; font-weight: 700; color: #2c3e50; } .sub-title { font-size: 14px; color: #909399; margin-top: 6px; } }
:deep(.el-descriptions__content) { font-size: 15px !important; color: #303133; }
:deep(.desc-label) { background-color: #f8fafc !important; font-weight: 600; color: #5a6a7c; font-size: 14px; width: 140px; }
.info-icon { margin-left: 6px; color: #a8abb2; cursor: pointer; vertical-align: text-bottom; font-size: 15px; transition: color 0.3s; &:hover { color: #409eff; } }
.highlight-text { color: #337ecc; font-weight: 600; }
.data-badge { padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 14px; &.blue { color: #337ecc; background: #eef5fe; } &.green { color: #529b2e; background: #f0f9eb; } }
.mem-tag { margin-right: 8px; border: none; font-size: 13px; padding: 0 8px; }
.os-tabs { margin-top: 10px; :deep(.el-tabs__item) { font-size: 15px; font-weight: bold; } }
.section-sub-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; padding-left: 10px; border-left: 3px solid #67c23a; }
</style>