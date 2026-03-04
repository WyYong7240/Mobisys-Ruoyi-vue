<template>
  <div class="app-container hardware-monitor">

    <!-- 左侧设备列表 -->
    <el-card shadow="hover" class="side-bar left-sidebar">
      <template #header>
        <span>设备列表</span>
      </template>
      <el-menu
        :default-active="activeDeviceId"
        class="device-menu"
        @select="handleDeviceSelect"
      >
        <el-menu-item v-for="device in deviceList" :key="device.id" :index="device.id.toString()">
          {{ device.name }}
        </el-menu-item>
      </el-menu>
    </el-card>

    <!-- 主体三栏布局 -->
    <div class="main-layout">

      <!-- 中间主内容区 -->
      <el-card shadow="hover" class="main-content">
        <template #header>
          <span>节点设备硬件基础信息与时序指标数据监控</span>
          <br>
          <span>{{ currentDevice?.name || '请选择设备' }}</span>
        </template>
        <div v-if="currentDevice">
          <!-- 原有设备详情内容 -->
          <el-descriptions title="设备基础信息" :column="3" border>
            <el-descriptions-item label="设备编号">{{ currentDevice.deviceNo }}</el-descriptions-item>
            <el-descriptions-item label="设备名称">{{ currentDevice.name }}</el-descriptions-item>
            <el-descriptions-item label="设备类型">{{ currentDevice.type }}</el-descriptions-item>
            <!-- ... 其他字段 ... -->
          </el-descriptions>

          <!-- 实时性能指标 -->
          <el-row :gutter="16" style="margin-top: 20px;">
            <el-col :span="6">
              <el-card shadow="hover">
                <template #header>CPU使用率</template>
                <div class="metric-value">{{ currentDevice.cpuUsage }}%</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="hover">
                <template #header>内存使用率</template>
                <div class="metric-value">{{ currentDevice.memUsage }}%</div>
              </el-card>
            </el-col>
            <!-- ... 其他指标 ... -->
          </el-row>
        </div>
        <el-empty v-else description="请从左侧选择设备" />
      </el-card>

      <el-card shadow="hover" class="main-content">
        <template #header>
          <span>节点设备硬件基础信息与时序指标数据监控</span>
          <br>
          <span>{{ currentDevice?.name || '请选择设备' }}</span>
        </template>
        <div v-if="currentDevice">
          <!-- 原有设备详情内容 -->
          <el-descriptions title="设备基础信息" :column="3" border>
            <el-descriptions-item label="设备编号">{{ currentDevice.deviceNo }}</el-descriptions-item>
            <el-descriptions-item label="设备名称">{{ currentDevice.name }}</el-descriptions-item>
            <el-descriptions-item label="设备类型">{{ currentDevice.type }}</el-descriptions-item>
            <!-- ... 其他字段 ... -->
          </el-descriptions>

          <!-- 实时性能指标 -->
          <el-row :gutter="16" style="margin-top: 20px;">
            <el-col :span="6">
              <el-card shadow="hover">
                <template #header>CPU使用率</template>
                <div class="metric-value">{{ currentDevice.cpuUsage }}%</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="hover">
                <template #header>内存使用率</template>
                <div class="metric-value">{{ currentDevice.memUsage }}%</div>
              </el-card>
            </el-col>
            <!-- ... 其他指标 ... -->
          </el-row>
        </div>
        <el-empty v-else description="请从左侧选择设备" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 模拟设备数据（实际应从后端 API 获取）
const deviceList = ref([
  { id: 1, name: '节点设备1', deviceNo: 'SW-CORE-001', type: '交换机', status: '在线', cpuUsage: 35.2, memUsage: 42.5 },
  { id: 2, name: '节点设备2', deviceNo: 'SW-ACCESS-002', type: '交换机', status: '离线', cpuUsage: 0, memUsage: 0 },
  { id: 3, name: '节点设备3', deviceNo: 'RT-BORDER-003', type: '路由器', status: '在线', cpuUsage: 65.8, memUsage: 78.1 },
])

const compareDeviceList = ref([
  { id: 4, name: '核心交换机-A', deviceNo: 'CORE-SW-A', type: '交换机', status: '在线', cpuUsage: 22.1, memUsage: 33.4 },
  { id: 5, name: '防火墙-FW01', deviceNo: 'FW-001', type: '防火墙', status: '在线', cpuUsage: 15.6, memUsage: 28.9 },
  { id: 6, name: '服务器-SRV01', deviceNo: 'SRV-DB-001', type: '服务器', status: '警告', cpuUsage: 89.3, memUsage: 92.1 },
])

const activeDeviceId = ref('1')
const activeCompareDeviceId = ref('4')

const currentDevice = computed(() => 
  deviceList.value.find(d => d.id.toString() === activeDeviceId.value)
)

const compareDevice = computed(() => 
  compareDeviceList.value.find(d => d.id.toString() === activeCompareDeviceId.value)
)

const handleDeviceSelect = (id) => {
  activeDeviceId.value = id
}

const handleCompareDeviceSelect = (id) => {
  activeCompareDeviceId.value = id
}
</script>

<style scoped>
.hardware-monitor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-card {
  margin-bottom: 16px;
}

.main-layout {
  display: flex;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}

.side-bar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.left-sidebar {
  border-right: 1px solid #eee;
}

.right-sidebar {
  border-left: 1px solid #eee;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

.device-menu {
  border-right: none;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  text-align: center;
  padding: 10px 0;
}
</style>