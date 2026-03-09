<template>
  <div class="app-container dashboard-container">
    <el-row :gutter="20">
      <splitpanes :horizontal="appStore.device === 'mobile'" class="default-theme">
        <pane size="16">
          <div class="sidebar-wrapper">
            <div class="sidebar-header">
              <el-icon><Monitor /></el-icon>
              <span>设备列表</span>
            </div>
            <el-menu :default-active="activeDeviceId" class="device-menu-custom" @select="handleDeviceSelect">
              <el-menu-item v-for="device in deviceList" :key="device.id" :index="device.id.toString()">
                <el-icon><Platform /></el-icon>
                <template #title>{{ device.name }}</template>
              </el-menu-item>
            </el-menu>
          </div>
        </pane>

        <pane size="84">
          <div class="main-layout scrollable-pane">
            
            <el-card shadow="hover" class="custom-card">
              <template #header>
                <div class="card-header-flex">
                  <div class="title-wrapper">
                    <span class="main-title">节点硬件基础信息与时序监控</span>
                    <span class="sub-title">{{ currentDevice?.name }}</span>
                  </div>
                  <el-button :icon="Refresh" circle @click="loadData(currentDevice.name)" />
                </div>
              </template>

              <div v-if="currentDevice">
                <el-descriptions class="custom-descriptions" :column="3" border>
                  <el-descriptions-item label="设备编号" label-class-name="desc-label">{{ currentDevice.deviceNo }}</el-descriptions-item>
                  <el-descriptions-item label="设备名称" label-class-name="desc-label">{{ currentDevice.name }}</el-descriptions-item>
                  <el-descriptions-item label="设备类型" label-class-name="desc-label">
                    <el-tag size="small" type="info" effect="plain">{{ currentDevice.type }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="运行状态" label-class-name="desc-label">
                    <el-tag :type="currentDevice.status === '在线' ? 'success' : 'danger'" effect="dark" round size="small">
                      ● {{ currentDevice.status }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="CPU 型号" :span="2" label-class-name="desc-label">
                    <span class="highlight-text">{{ hardwareDetail.cpu.model }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="架构" label-class-name="desc-label">{{ hardwareDetail.cpu.arch }}</el-descriptions-item>
                  <el-descriptions-item label="核心/线程" label-class-name="desc-label">
                    <span class="data-badge blue">{{ hardwareDetail.cpu.cores }}C</span> / 
                    <span class="data-badge green">{{ hardwareDetail.cpu.threads }}T</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="主频" label-class-name="desc-label">{{ hardwareDetail.cpu.freq }}</el-descriptions-item>
                  <el-descriptions-item label="厂商" label-class-name="desc-label">{{ hardwareDetail.cpu.vendor }}</el-descriptions-item>
                  <el-descriptions-item label="内存插槽" label-class-name="desc-label">
                    共 {{ hardwareDetail.memory.totalSlots }} 插槽
                  </el-descriptions-item>
                  <el-descriptions-item label="内存详情" :span="2" label-class-name="desc-label">
                    <div class="slot-tags">
                      <el-tooltip v-for="slot in hardwareDetail.memory.slots" :key="slot.slot" effect="dark" :content="`厂商: ${slot.manufacturer} | 频率: ${slot.speed}`">
                        <el-tag size="small" type="success" class="mem-tag">
                          {{ slot.slot }}: {{ slot.size }} ({{ slot.type }})
                        </el-tag>
                      </el-tooltip>
                    </div>
                  </el-descriptions-item>
                </el-descriptions>

                <el-row :gutter="16" style="margin-top: 24px;">
                  <el-col :span="6">
                    <div class="metric-box blue">
                      <div class="metric-header"><el-icon><Cpu /></el-icon> CPU 使用率</div>
                      <div class="metric-body">
                        <span class="num">{{ metrics.cpuUsage }}</span><span class="unit">%</span>
                      </div>
                      <el-progress :percentage="parseFloat(metrics.cpuUsage)" :show-text="false" stroke-width="4" color="#409EFF" />
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="metric-box green">
                      <div class="metric-header"><el-icon><Tickets /></el-icon> 内存使用率</div>
                      <div class="metric-body">
                        <span class="num">{{ metrics.memUsage }}</span><span class="unit">%</span>
                      </div>
                      <el-progress :percentage="parseFloat(metrics.memUsage)" :show-text="false" stroke-width="4" color="#67C23A" />
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="metric-box purple">
                      <div class="metric-header"><el-icon><Files /></el-icon> 已用内存</div>
                      <div class="metric-body">
                        <span class="num">{{ metrics.memUsedGb }}</span><span class="unit">GB</span>
                      </div>
                      <div class="metric-footer">总量: {{ metrics.memTotalGb }} GB</div>
                    </div>
                  </el-col>
                </el-row>

                <div class="grafana-section">
                  <div class="section-title">实时性能趋势图</div>
                  <el-row :gutter="15">
                    <el-col :span="12" v-for="panel in panelList" :key="panel.id" style="margin-bottom: 15px;">
                      <div class="iframe-container">
                        <div class="iframe-header">{{ panel.name }}</div>
                        <iframe :src="getGrafanaUrl(panel.id)" width="100%" height="260" frameborder="0" scrolling="no"></iframe>
                      </div>
                    </el-col>
                  </el-row>
                </div>

              </div>
              <el-empty v-else description="请从左侧选择设备" />
            </el-card>

            <el-card shadow="hover" class="custom-card" style="margin-top: 20px;">
              <template #header>
                <div class="title-wrapper">
                  <span class="main-title">操作系统基础信息与实时性能</span>
                </div>
              </template>
              <div v-if="currentDevice">
                <el-descriptions class="custom-descriptions" :column="3" border>
                   <el-descriptions-item label="内核版本" label-class-name="desc-label">{{ serverInfo.sys?.osName || '-' }}</el-descriptions-item>
                   <el-descriptions-item label="系统架构" label-class-name="desc-label">{{ serverInfo.sys?.osArch || '-' }}</el-descriptions-item>
                   <el-descriptions-item label="服务器IP" label-class-name="desc-label">{{ serverInfo.sys?.computerIp || '-' }}</el-descriptions-item>
                </el-descriptions>
              </div>
            </el-card>
          </div>
        </pane>
      </splitpanes>
    </el-row>
  </div>
</template>

<script setup name="User">
// import { Monitor, Platform, Cpu, Tickets, Refresh, Files } from '@element-plus/icons-vue'
import { ref, computed, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'
import useAppStore from '@/store/modules/app'
import { Splitpanes, Pane } from "splitpanes"
import { queryPrometheus } from '@/api/monitor/prometheuse'
import { getServer } from '@/api/monitor/server'
import "splitpanes/dist/splitpanes.css"
import { Refresh } from '@element-plus/icons-vue'

const grafanaBaseUrl = "http://192.168.31.34:32556/d-solo/bc847f0f-175a-47d4-8808-958da9b029f3/node-resources-board"
const panelList = ref([
  {id: 1, name: "CPU利用率"},
  {id: 1, name: "内存利用率"},
  {id: 3, name: "网络接收速率" },
  {id: 4, name: "网络发送速率" },
  {id: 5, name: "磁盘利用率" }
])

const appStore = useAppStore()
const { proxy } = getCurrentInstance()
const timer = ref(null)

// 1. 定义响应式数据源
const serverInfo = ref({}) // 存放若依后端获取的静态信息
const hardwareDetail = ref({
  cpu: { model: '-', vendor: '-', arch: '-', cores: 0, threads: 0, freq: '-' },
  memory: { slots: [], totalSlots: 0 }
});
const metrics = ref({
  cpuUsage: 0,
  cpuFree: 100,
  memTotalGb: 0,
  memUsage: 0,
  memUsedGb: 0,
  memFreeGb: 0
}) // 存放 Prometheus 计算后的动态指标

// 模拟设备数据
const deviceList = ref([
  { id: 1, name: 'master', deviceNo: 'PC1', type: '主机', status: '在线' },
  { id: 2, name: 'node1', deviceNo: 'PC2', type: '主机', status: '在线' },
  { id: 3, name: 'node2', deviceNo: 'PC3', type: '主机', status: '在线' },
])

const activeDeviceId = ref('1')

// 生成 Grafana Iframe 地址的方法
const getGrafanaUrl = (panelId) => {
  if (!currentDevice.value) return ''
  
  const params = new URLSearchParams({
    orgId: 1,
    theme: 'light',
    panelId: panelId,
    // 注意：这里的变量名 'var-instance' 必须对应你 Grafana Dashboard 里的变量名
    // 如果你 Grafana 里的变量叫 node，这里就写 'var-node'
    'var-instance': currentDevice.value.name, 
    refresh: '5s' // 让 iframe 内部也自动刷新
  })
  return `${grafanaBaseUrl}?${params.toString()}`
}

// 获取当前选中的设备对象
const currentDevice = computed(() => 
  deviceList.value.find(d => d.id.toString() === activeDeviceId.value)
)

// 2. 核心修改：切换设备时，触发数据刷新
const handleDeviceSelect = (id) => {
  activeDeviceId.value = id
  const selectedDev = deviceList.value.find(d => d.id.toString() === id)
  if (selectedDev) {
    // 传递新设备的名称去拉取数据
    loadData(selectedDev.name)
  }
}

// 3. 拉取数据并格式化
async function loadData(deviceName, isSilent = false) {
  // 如果没有传入设备名，直接返回
  if (!deviceName) return;

  if (!isSilent) {
    proxy.$modal.loading("正在加载监控数据...")
  }

  try {
    // 并行请求：从若依后端获取静态信息
    const infoRes = await getServer()
    serverInfo.value = infoRes.data || {}

    // 并行请求：从 Prometheus 获取动态指标
    const instanceLabel = deviceName

    // 1. 定义需要查询的 PromQL
    const queries = {
      // CPU 静态信息 (从 Label 提取)
      cpuInfo: `hardware_cpu_model_info{instance="${instanceLabel}"}`,
      cpuCores: `hardware_cpu_cores_total{instance="${instanceLabel}"}`,
      cpuThreads: `hardware_cpu_threads_total{instance="${instanceLabel}"}`,
      cpuFreq: `hardware_cpu_frequency_hertz{instance="${instanceLabel}"}`,
      // 内存静态信息
      memSlots: `hardware_memory_slot_info{instance="${instanceLabel}"}`,
      memTotalSlots: `hardware_memory_slots_total{instance="${instanceLabel}"}`
    };

    // 2. 并行请求所有自定义指标
    const [cpuInfoRes, cpuCoresRes, cpuThreadsRes, cpuFreqRes, memSlotsRes, memTotalSlotsRes] = await Promise.all([
      queryPrometheus(queries.cpuInfo),
      queryPrometheus(queries.cpuCores),
      queryPrometheus(queries.cpuThreads),
      queryPrometheus(queries.cpuFreq),
      queryPrometheus(queries.memSlots),
      queryPrometheus(queries.memTotalSlots)
    ]);

    // 3. 解析 CPU 信息 (重点：从 metric 对象中提取 label)
    const cpuMetric = cpuInfoRes.data?.result?.[0]?.metric || {};
    hardwareDetail.value.cpu = {
      model: cpuMetric.model || '-',
      vendor: cpuMetric.vendor || '-',
      arch: cpuMetric.architecture || '-',
      cores: cpuCoresRes.data?.result?.[0]?.value?.[1] || 0,
      threads: cpuThreadsRes.data?.result?.[0]?.value?.[1] || 0,
      // 赫兹转GHz保留两位
      freq: cpuFreqRes.data?.result?.[0]?.value?.[1] 
            ? (parseFloat(cpuFreqRes.data?.result?.[0]?.value?.[1]) / 1e9).toFixed(2) + ' GHz' 
            : '-'
    };

    // 4. 解析内存插槽信息 (可能有多条结果)
    const slotResults = memSlotsRes.data?.result || [];
    hardwareDetail.value.memory.slots = slotResults.map(item => ({
      slot: item.metric.slot,
      size: (parseFloat(item.metric.size_bytes) / (1024 ** 3)).toFixed(0) + ' GB',
      type: item.metric.type,
      speed: item.metric.speed_mhz + ' MHz',
      manufacturer: item.metric.manufacturer
    }));
    hardwareDetail.value.memory.totalSlots = memTotalSlotsRes.data?.result?.[0]?.value?.[1] || 0;

    const [cpuRes, memRes, memTotalRes] = await Promise.all([
      // CPU 使用率 (%)
      queryPrometheus(`100 - (avg by(instance) (rate(node_cpu_seconds_total{instance="${instanceLabel}", mode="idle"}[1m])) * 100)`),
      // 内存使用率 (%)
      queryPrometheus(`(1 - (node_memory_MemAvailable_bytes{instance="${instanceLabel}"} / node_memory_MemTotal_bytes{instance="${instanceLabel}"})) * 100`),
      // 内存总量 (Bytes)
      queryPrometheus(`node_memory_MemTotal_bytes{instance="${instanceLabel}"}`)
    ])

    // 提取 Prometheus 原始数值
    const rawCpuUsage = parseFloat(cpuRes.data?.result?.[0]?.value?.[1] || 0)
    const rawMemUsage = parseFloat(memRes.data?.result?.[0]?.value?.[1] || 0)
    const rawMemTotalBytes = parseFloat(memTotalRes.data?.result?.[0]?.value?.[1] || 0)

    // 数据计算与格式化 (Bytes 转换为 GB)
    const memTotalGb = rawMemTotalBytes / (1024 ** 3)
    const memUsedGb = memTotalGb * (rawMemUsage / 100)
    const memFreeGb = memTotalGb - memUsedGb

    // 更新到响应式变量中，供页面渲染使用，保留两位小数
    metrics.value = {
      cpuUsage: rawCpuUsage.toFixed(2),
      cpuFree: (100 - rawCpuUsage).toFixed(2),
      memTotalGb: memTotalGb.toFixed(2),
      memUsage: rawMemUsage.toFixed(2),
      memUsedGb: memUsedGb.toFixed(2),
      memFreeGb: memFreeGb.toFixed(2)
    }

  } catch (error) {
    proxy.$modal.msgError("获取监控数据失败：" + error.message)
    // 失败时可以考虑重置 metrics 为 0
    console.error(error)
  } finally {
    if (!isSilent) {
      proxy.$modal.closeLoading()
    }
  }
}

// 开启定时刷新的函数
function startRefresh() {
  stopRefresh()

  timer.value = setInterval(() => {
    if (currentDevice.value) {
      loadData(currentDevice.value.name, true)
    }
  }, 5000)  // 设置每5s刷新一次数据
}

function stopRefresh() {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

// 初始化加载默认选中的设备数据
onMounted(() => {
  if (currentDevice.value) {
    loadData(currentDevice.value.name)
    startRefresh()
  }
})

// 组件销毁前，必须销毁定时器，防止内存泄露
onBeforeUnmount(() => {
  stopRefresh()
})
</script>

<style scoped lang="scss">
/* 容器背景色微调，增加层次感 */
.dashboard-container {
  background-color: #f5f7fa;
  min-height: calc(100vh - 84px);
}

/* 侧边栏样式 */
.sidebar-wrapper {
  background: #fff;
  height: 100%;
  border-right: 1px solid #e6e6e6;
  
  .sidebar-header {
    padding: 15px 20px;
    font-weight: bold;
    font-size: 15px;
    color: #303133;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #f0f0f0;
  }
}

.device-menu-custom {
  border-right: none !important;
  .el-menu-item.is-active {
    background-color: #ecf5ff;
    border-right: 3px solid #409eff;
  }
}

/* 卡片标题美化 */
.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-wrapper {
  display: flex;
  flex-direction: column;
  .main-title {
    font-size: 16px;
    font-weight: 700;
    color: #1f2f3d;
  }
  .sub-title {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}

/* 描述列表样式 */
:deep(.desc-label) {
  background-color: #f9fafc !important;
  font-weight: 600;
  color: #606266;
  width: 120px;
}

.highlight-text {
  color: #409eff;
  font-weight: 600;
}

.data-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  &.blue { color: #409eff; background: #eef5fe; }
  &.green { color: #67c23a; background: #f0f9eb; }
}

/* 指标卡片 (Dashboard 风格) */
.metric-box {
  padding: 16px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  transition: all 0.3s;
  
  &:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  
  .metric-header { font-size: 13px; color: #909399; display: flex; align-items: center; gap: 5px; margin-bottom: 12px; }
  .metric-body {
    margin-bottom: 8px;
    .num { font-size: 28px; font-family: 'Helvetica Neue', Arial; font-weight: bold; }
    .unit { font-size: 14px; margin-left: 4px; color: #909399; }
  }
  .metric-footer { font-size: 12px; color: #c0c4cc; margin-top: 8px; }

  &.blue { .num { color: #409eff; } }
  &.green { .num { color: #67c23a; } }
  &.purple { .num { color: #722ed1; } }
}

/* Grafana 区域 */
.grafana-section {
  margin-top: 30px;
  .section-title {
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 15px;
    padding-left: 10px;
    border-left: 4px solid #409eff;
  }
}

.iframe-container {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
  .iframe-header {
    background: #f8f9fb;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #606266;
    border-bottom: 1px solid #ebeef5;
  }
}

.mem-tag { margin-right: 6px; border: none; }
</style>