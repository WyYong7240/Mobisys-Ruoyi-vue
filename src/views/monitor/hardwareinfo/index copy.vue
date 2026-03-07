<template>
  <div class="app-container">
    <el-row :gutter="20">
      <splitpanes :horizontal="appStore.device === 'mobile'" class="default-theme">
        <pane size="16">
          <el-col>
            <div class="head-container" style="margin-bottom: 20px;">
              <span>设备列表</span>
            </div>

            <div class="head-container">
              <el-menu :default-active="activeDeviceId" class="device-menu" @select="handleDeviceSelect">
                <el-menu-item v-for="device in deviceList" :key="device.id" :index="device.id.toString()">
                  {{ device.name }}
                </el-menu-item>
              </el-menu>
            </div>
          </el-col>
        </pane>

        <pane size="84">
          <el-col>
            <div class="main-layout">
              <el-card shadow="hover" class="main-content">
                <template #header>
                  <span>节点设备硬件基础信息与时序指标数据监控</span>
                  <br>
                  <span>{{ currentDevice?.name || '请选择设备' }}</span>
                </template>

                <div v-if="currentDevice">
                  <el-row :gutter="10">
                    <el-col :span="12" class="card-box">
                      <el-card>
                        <template #header>
                          <Cpu style="width: 1em; height: 1em; vertical-align: middle;" /> 
                          <span style="vertical-align: middle;">CPU</span>
                        </template>
                        <div class="el-table el-table--enable-row-hover el-table--medium">
                          <table cellspacing="0" style="width: 100%;">
                            <thead>
                              <tr>
                                <th class="el-table__cell is-leaf"><div class="cell">属性</div></th>
                                <th class="el-table__cell is-leaf"><div class="cell">值</div></th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td class="el-table__cell is-leaf"><div class="cell">总使用率</div></td>
                                <td class="el-table__cell is-leaf"><div class="cell">{{ metrics.cpuUsage }}%</div></td>
                              </tr>
                              <tr>
                                <td class="el-table__cell is-leaf"><div class="cell">当前空闲率</div></td>
                                <td class="el-table__cell is-leaf"><div class="cell">{{ metrics.cpuFree }}%</div></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </el-card>
                    </el-col>

                    <el-col :span="12" class="card-box">
                      <el-card>
                        <template #header>
                          <Tickets style="width: 1em; height: 1em; vertical-align: middle;" /> 
                          <span style="vertical-align: middle;">内存</span>
                        </template>
                        <div class="el-table el-table--enable-row-hover el-table--medium">
                          <table cellspacing="0" style="width: 100%;">
                            <thead>
                              <tr>
                                <th class="el-table__cell is-leaf"><div class="cell">属性</div></th>
                                <th class="el-table__cell is-leaf"><div class="cell">值</div></th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td class="el-table__cell is-leaf"><div class="cell">总内存</div></td>
                                <td class="el-table__cell is-leaf"><div class="cell">{{ metrics.memTotalGb }} G</div></td>
                              </tr>
                              <tr>
                                <td class="el-table__cell is-leaf"><div class="cell">已用内存</div></td>
                                <td class="el-table__cell is-leaf"><div class="cell">{{ metrics.memUsedGb }} G</div></td>
                              </tr>
                              <tr>
                                <td class="el-table__cell is-leaf"><div class="cell">剩余内存</div></td>
                                <td class="el-table__cell is-leaf"><div class="cell">{{ metrics.memFreeGb }} G</div></td>
                              </tr>
                              <tr>
                                <td class="el-table__cell is-leaf"><div class="cell">使用率</div></td>
                                <td class="el-table__cell is-leaf">
                                  <div class="cell" :class="{'text-danger': metrics.memUsage > 80}">
                                    {{ metrics.memUsage }}%
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </el-card>
                    </el-col>
                  </el-row>

                  <!-- Grafana 面板嵌入 -->
                  <!-- <el-row :gutter="15" style="margin-top: 20px;">
                    <el-col :span="12" v-for="panel in panelList" :key="panel.id">
                      <div class="grafana-container" style="border: 1px solid #ebeef5; border-radius: 4px; overflow: hidden;">
                        <div class="panel-title" style="padding: 5px 10px; background: #f8f9fb; font-size: 12px; color: #606266; border-bottom: 1px solid #ebeef5;">
                          {{ panel.name }}
                        </div>
                        <iframe
                          :src="getGrafanaUrl(panel.id)"
                          width="100%"
                          height="250"
                          frameborder="0"
                          scrolling="no">
                        </iframe>
                      </div>
                    </el-col>
                  </el-row> -->
                </div>
                <el-empty v-else description="请从左侧选择设备" />
              </el-card>

              <el-card shadow="hover" class="main-content" style="margin-top: 20px;">
                <template #header>
                  <span>节点设备操作系统基础信息与实时性能</span>
                  <br>
                  <span>{{ currentDevice?.name || '请选择设备' }}</span>
                </template>
                <div v-if="currentDevice">
                  <el-descriptions title="操作系统基础信息" :column="3" border>
                    <el-descriptions-item label="设备编号">{{ currentDevice.deviceNo }}</el-descriptions-item>
                    <el-descriptions-item label="设备名称">{{ currentDevice.name }}</el-descriptions-item>
                    <el-descriptions-item label="设备类型">{{ currentDevice.type }}</el-descriptions-item>
                    <el-descriptions-item label="状态">
                      <el-tag :type="currentDevice.status === '在线' ? 'success' : 'danger'">{{ currentDevice.status }}</el-tag>
                    </el-descriptions-item>
                  </el-descriptions>

                  <el-row :gutter="16" style="margin-top: 20px;">
                    <el-col :span="6">
                      <el-card shadow="hover">
                        <template #header>实时 CPU 使用率</template>
                        <div class="metric-value" style="font-size: 24px; font-weight: bold; color: #409EFF;">
                          {{ metrics.cpuUsage }}%
                        </div>
                      </el-card>
                    </el-col>
                    <el-col :span="6">
                      <el-card shadow="hover">
                        <template #header>实时 内存使用率</template>
                        <div class="metric-value" style="font-size: 24px; font-weight: bold; color: #67C23A;">
                          {{ metrics.memUsage }}%
                        </div>
                      </el-card>
                    </el-col>
                  </el-row>
                </div>
                <el-empty v-else description="请从左侧选择设备" />
              </el-card>
            </div>
          </el-col>
        </pane>
      </splitpanes>
    </el-row>
  </div>
</template>

<script setup name="User">
import { ref, computed, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'
import useAppStore from '@/store/modules/app'
import { Splitpanes, Pane } from "splitpanes"
import { queryPrometheus } from '@/api/monitor/prometheuse'
import { getServer } from '@/api/monitor/server'
import "splitpanes/dist/splitpanes.css"
import { Refresh } from '@element-plus/icons-vue'

const grafanaBaseUrl = "http://192.168.31.34:32556/d-solo/aa347ca0-0f9d-4716-a151-9494379e4405/microservice-pod"
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
  } finally {
    proxy.$modal.closeLoading()
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

<style scoped>
/* 补充一点样式让红色警告生效 */
.text-danger {
  color: #F56C6C;
  font-weight: bold;
}
</style>