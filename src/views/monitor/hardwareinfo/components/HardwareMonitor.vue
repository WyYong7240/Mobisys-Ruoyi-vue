<template>
  <el-card shadow="hover" class="custom-card">
    <template #header>
      <div class="card-header-flex">
        <div class="title-wrapper">
          <span class="main-title">节点硬件基础信息与时序监控</span>
          <span class="sub-title">{{ currentDevice?.name }}</span>
        </div>
        <el-button :icon="Refresh" circle @click="onRefresh" :disabled="!currentDevice" />
      </div>
    </template>

    <div v-if="currentDevice">
      <div v-if="hasHardwareData">
        <el-descriptions class="custom-descriptions" :column="3" border>
          <el-descriptions-item label-class-name="desc-label">
            <template #label>设备编号 <el-tooltip content="设备唯一标识码" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            {{ currentDevice.deviceNo }}
          </el-descriptions-item>
          <el-descriptions-item label-class-name="desc-label">
            <template #label>设备名称 <el-tooltip content="网络主机名或业务别名" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            {{ currentDevice.name }}
          </el-descriptions-item>
          <el-descriptions-item label-class-name="desc-label">
            <template #label>
              运行状态 
              <el-tooltip content="通过 Prometheus 原生 up 指标实时监测探针连通性" placement="top">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            
            <el-tag 
              :type="realtimeStatus === '在线' ? 'success' : (realtimeStatus === '获取中...' ? 'info' : 'danger')" 
              effect="dark" 
              round 
              size="default"
            >
              ● {{ realtimeStatus }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label-class-name="desc-label">
            <template #label>设备品牌 <el-tooltip content="资产库硬件品牌" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            <el-tag size="default" type="info" effect="plain">{{ currentDevice.brand }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label-class-name="desc-label">
            <template #label>设备型号 <el-tooltip content="资产库硬件型号" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            {{ currentDevice.model }}
          </el-descriptions-item>
          <el-descriptions-item label-class-name="desc-label">
            <template #label>MAC 地址 <el-tooltip content="物理机主网卡MAC地址" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            {{ currentDevice.macAddress }}
          </el-descriptions-item>

          <el-descriptions-item :span="2" label-class-name="desc-label">
            <template #label>CPU 型号 <el-tooltip content="处理器具体代号" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            <span class="highlight-text">{{ hardwareDetail.cpu.model }}</span>
          </el-descriptions-item>
          <el-descriptions-item label-class-name="desc-label">
            <template #label>架构 <el-tooltip content="CPU指令集架构" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            {{ hardwareDetail.cpu.arch }}
          </el-descriptions-item>

          <el-descriptions-item label-class-name="desc-label">
            <template #label>核心/线程 <el-tooltip content="物理核心数与逻辑线程数" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            <span class="data-badge blue">{{ hardwareDetail.cpu.cores }}C</span> / <span class="data-badge green">{{ hardwareDetail.cpu.threads }}T</span>
          </el-descriptions-item>
          <el-descriptions-item label-class-name="desc-label">
            <template #label>主频 <el-tooltip content="CPU基础运行频率" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            {{ hardwareDetail.cpu.freq }}
          </el-descriptions-item>
          <el-descriptions-item label-class-name="desc-label">
            <template #label>厂商</template>
            {{ hardwareDetail.cpu.vendor }}
          </el-descriptions-item>

          <el-descriptions-item label-class-name="desc-label">
            <template #label>内存插槽</template>
            共 {{ hardwareDetail.memory.totalSlots }} 插槽
          </el-descriptions-item>
          <el-descriptions-item :span="2" label-class-name="desc-label">
            <template #label>内存详情 <el-tooltip content="物理内存条信息" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip></template>
            <div class="slot-tags">
              <el-tooltip v-for="slot in hardwareDetail.memory.slots" :key="slot.slot" effect="dark" :content="`厂商: ${slot.manufacturer} | 频率: ${slot.speed}`">
                <el-tag size="default" type="success" class="mem-tag">
                  {{ slot.slot }}: {{ slot.size }} ({{ slot.type }})
                </el-tag>
              </el-tooltip>
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <el-row :gutter="16" style="margin-top: 24px;">
          <el-col :span="8">
            <div class="metric-box blue">
              <div class="metric-header">
                <el-icon><Cpu /></el-icon> CPU 使用率
                <el-tooltip content="当前CPU总算力被消耗的百分比" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip>
              </div>
              <div class="metric-body"><span class="num">{{ metrics.cpuUsage }}</span><span class="unit">%</span></div>
              <el-progress :percentage="parseFloat(metrics.cpuUsage)" :show-text="false" :stroke-width="6" color="#409EFF" />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="metric-box green">
              <div class="metric-header">
                <el-icon><Tickets /></el-icon> 内存使用率
                <el-tooltip content="物理内存已被占用的比例" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip>
              </div>
              <div class="metric-body"><span class="num">{{ metrics.memUsage }}</span><span class="unit">%</span></div>
              <el-progress :percentage="parseFloat(metrics.memUsage)" :show-text="false" :stroke-width="6" color="#67C23A" />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="metric-box purple">
              <div class="metric-header"><el-icon><Files /></el-icon> 已用内存</div>
              <div class="metric-body"><span class="num">{{ metrics.memUsedGb }}</span><span class="unit">GB</span></div>
              <div class="metric-footer">总量: {{ metrics.memTotalGb }} GB</div>
            </div>
          </el-col>
        </el-row>

        <div class="grafana-section">
          <div class="section-title">物理机/虚拟机实时性能趋势图</div>
          <el-row :gutter="15">
            <el-col :span="12" v-for="panel in panelList" :key="panel.id" style="margin-bottom: 20px;">
              <div class="iframe-container">
                <div class="iframe-header">
                  {{ panel.name }}
                  <el-tooltip :content="panel.desc" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip>
                </div>
                <iframe :src="getGrafanaUrl(panel.id)" width="100%" height="280" frameborder="0" scrolling="no"></iframe>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      <el-empty v-else description="该设备未安装硬件监控组件或处于离线状态" />
    </div>
    <el-empty v-else description="请从左侧树状图中选择目标设备" />
  </el-card>
</template>

<script setup>
import { Cpu, Tickets, Files, InfoFilled, Refresh } from '@element-plus/icons-vue'
import { getCurrentInstance, watch, onMounted, onBeforeUnmount } from 'vue'
import { currentDevice, hardwareDetail, metrics, hasHardwareData, panelList, getGrafanaUrl, loadHardwareData, realtimeStatus } from '@/api/monitor/deviceMonitor'

const { proxy } = getCurrentInstance()

const onRefresh = () => {
  if (currentDevice.value) loadHardwareData(proxy, currentDevice.value.name)
}

watch(() => currentDevice.value?.name, (newName) => {
  if (newName) {
    console.log('[Debug - Hardware] 监听到设备名改变，触发硬件数据加载:', newName)
    loadHardwareData(proxy, newName)
  }
}, { immediate: true })

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    if (currentDevice.value) {
      loadHardwareData(proxy, currentDevice.value.name, true)
    }
  }, 5000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped lang="scss">
.card-header-flex { display: flex; justify-content: space-between; align-items: center; }
.title-wrapper { display: flex; flex-direction: column; .main-title { font-size: 18px; font-weight: 700; color: #2c3e50; } .sub-title { font-size: 14px; color: #909399; margin-top: 6px; } }
:deep(.el-descriptions__content) { font-size: 15px !important; color: #303133; }
:deep(.desc-label) { background-color: #f8fafc !important; font-weight: 600; color: #5a6a7c; font-size: 14px; width: 140px; }
.info-icon { margin-left: 6px; color: #a8abb2; cursor: pointer; vertical-align: text-bottom; font-size: 15px; transition: color 0.3s; &:hover { color: #409eff; } }
.highlight-text { color: #337ecc; font-weight: 600; }
.data-badge { padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 14px; &.blue { color: #337ecc; background: #eef5fe; } &.green { color: #529b2e; background: #f0f9eb; } }
.metric-box { padding: 20px; border-radius: 8px; background: #fff; border: 1px solid #ebeef5; transition: all 0.3s; &:hover { transform: translateY(-4px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); } .metric-header { font-size: 15px; color: #606266; font-weight: bold; display: flex; align-items: center; gap: 6px; margin-bottom: 14px; } .metric-body { margin-bottom: 12px; .num { font-size: 32px; font-family: 'Helvetica Neue', Arial; font-weight: 700; } .unit { font-size: 16px; margin-left: 6px; color: #909399; } } .metric-footer { font-size: 13px; color: #a8abb2; margin-top: 10px; font-weight: 500;} &.blue { .num { color: #409eff; } background: #f4f8ff; border-color: #d9e8ff; } &.green { .num { color: #67c23a; } background: #f5fcf3; border-color: #e1f3d8;} &.purple { .num { color: #9254de; } background: #f9f4ff; border-color: #ebdff5;} }
.grafana-section { margin-top: 36px; .section-title { font-size: 18px; color: #2c3e50; font-weight: bold; margin-bottom: 20px; padding-left: 12px; border-left: 4px solid #409eff; } }
.iframe-container { border: 1px solid #ebeef5; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.02); .iframe-header { background: #f8fafc; padding: 12px 16px; font-size: 15px; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ebeef5; display: flex; align-items: center; } }
.mem-tag { margin-right: 8px; border: none; font-size: 13px; padding: 0 8px; }
</style>