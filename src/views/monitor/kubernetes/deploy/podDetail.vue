<template>
  <div class="app-container">
    <el-page-header @back="goBack" :content="`Pod 详情监控: ${podName}`" style="margin-bottom: 20px;" />

    <el-card shadow="hover" style="margin-bottom: 20px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; font-size: 16px;">
            <el-icon style="margin-right: 5px; vertical-align: middle;"><Document /></el-icon>
            基础资源配置 (Configuration)
          </span>
          <el-button type="success" plain icon="Download" @click="downloadYaml">
            下载 YAML 配置文件
          </el-button>
        </div>
      </template>

    <el-descriptions :column="3" border size="default" v-loading="loading">
        <el-descriptions-item label="Pod 名称" label-class-name="desc-label" class-name="desc-content">{{ podInfo.metadata?.name }}</el-descriptions-item>
        <el-descriptions-item label="命名空间" label-class-name="desc-label" class-name="desc-content">{{ podInfo.metadata?.namespace }}</el-descriptions-item>
        <el-descriptions-item label="当前状态" label-class-name="desc-label" class-name="desc-content">
          <el-tag :type="getStatusType(podInfo.status?.phase)" effect="dark" size="default">{{ podInfo.status?.phase || 'Unknown' }}</el-tag>
        </el-descriptions-item>
        
        <el-descriptions-item label="Pod IP" label-class-name="desc-label" class-name="desc-content">{{ podInfo.status?.podIP }}</el-descriptions-item>
        <el-descriptions-item label="所在节点 (Node)" label-class-name="desc-label" class-name="desc-content">{{ podInfo.spec?.nodeName }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" label-class-name="desc-label" class-name="desc-content">{{ podInfo.metadata?.creationTimestamp }}</el-descriptions-item>
        
        <el-descriptions-item label="标签 (Labels)" :span="3" label-class-name="desc-label" class-name="desc-content">
          <template v-if="podInfo.metadata?.labels">
            <el-tag 
              v-for="(val, key) in podInfo.metadata.labels" 
              :key="key" 
              size="default" 
              type="info" 
              effect="plain"
              style="margin-right: 8px; margin-bottom: 4px; border-color: #dcdfe6; color: #606266;">
              <span style="font-weight: bold; color: #303133;">{{ key }}</span> : {{ val }}
            </el-tag>
          </template>
        </el-descriptions-item>
    </el-descriptions>

      <div style="margin-top: 25px;">
        <h4 style="margin-bottom: 15px; color: #303133; font-size: 16px;">
          <el-icon style="vertical-align: middle; margin-right: 5px; color: #409EFF;"><Box /></el-icon>
          包含的容器 (Containers)
        </h4>
        <el-table :data="podInfo.spec?.containers" border v-loading="loading" class="custom-pod-table">
          <el-table-column label="容器名称" prop="name" width="180">
            <template #default="scope">
              <span style="font-weight: bold; color: #303133;">{{ scope.row.name }}</span>
            </template>
          </el-table-column>
          
          <el-table-column label="容器镜像 (Image)" prop="image" min-width="280" show-overflow-tooltip>
            <template #default="scope">
              <span class="code-font">{{ scope.row.image }}</span>
            </template>
          </el-table-column>
          
          <el-table-column label="拉取策略" prop="imagePullPolicy" width="130" align="center" />
          
          <el-table-column label="端口映射 (Ports)" width="180">
            <template #default="scope">
              <div v-for="port in scope.row.ports" :key="port.containerPort" style="margin-bottom: 4px;">
                <el-tag size="default" type="warning" effect="light">
                  <span v-if="port.name" style="color: #E6A23C; margin-right: 4px;">{{ port.name }}</span>
                  <span style="font-weight: bold;">{{ port.containerPort }}/{{ port.protocol }}</span>
                </el-tag>
              </div>
              <span v-if="!scope.row.ports || scope.row.ports.length === 0" style="color: #909399;">-</span>
            </template>
          </el-table-column>
          
          <el-table-column label="存储卷挂载 (VolumeMounts)" min-width="300">
            <template #default="scope">
              <div v-for="mnt in scope.row.volumeMounts" :key="mnt.mountPath" class="volume-item">
                <el-tag size="small" type="primary" effect="plain" class="vol-name">{{ mnt.name }}</el-tag>
                <span style="margin: 0 8px; color: #C0C4CC;">➔</span>
                <span class="vol-path">{{ mnt.mountPath }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="真实容器ID" width="160" align="center">
            <template #default="scope">
               <el-tooltip :content="getContainerId(scope.row.name, false)" placement="top">
                 <span class="container-id-badge">
                   {{ getContainerId(scope.row.name, true) }}
                 </span>
               </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div style="margin-top: 20px;">
        <el-collapse>
          <el-collapse-item name="1">
            <template #title>
              <span style="font-weight: bold; font-size: 14px; color: #606266;">
                <el-icon style="margin-right: 5px;"><Warning /></el-icon>
                查看近期调度与生命周期事件 (Events)
              </span>
            </template>
            <el-timeline v-if="eventsData.length > 0" style="padding-top: 10px; padding-left: 10px;">
              <el-timeline-item 
                v-for="(activity, index) in eventsData" 
                :key="index" 
                :type="activity.includes('[Normal]') ? 'success' : 'danger'"
              >
                {{ activity }}
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无异常或调度事件" :image-size="60" />
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <span style="font-weight: bold; font-size: 16px;">
          <el-icon style="margin-right: 5px; vertical-align: middle;"><DataLine /></el-icon>
          Pod 实时性能指标 (Grafana Panels)
        </span>
      </template>

      <div class="grafana-section">
        <el-row :gutter="15">
          <el-col :span="12" v-for="panel in panelList" :key="panel.id" style="margin-bottom: 20px;">
            <div class="iframe-container">
              <div class="iframe-header">
                {{ panel.name }}
                <el-tooltip :content="panel.desc" placement="top"><el-icon class="info-icon"><InfoFilled /></el-icon></el-tooltip>
              </div>
              <iframe :src="getGrafanaUrl(panel.id, podName)" width="100%" height="280" frameborder="0" scrolling="no"></iframe>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPodDetail, getGrafanaUrl, panelList } from '@/api/monitor/kubernetes'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const podName = ref(route.query.podName || '')
const namespace = ref(route.query.namespace || '')

// 核心数据模型
const podInfo = ref({}) // 结构化的 Pod JSON 对象
const yamlData = ref('') // 原始 YAML 字符串
const eventsData = ref([])

const goBack = () => {
  router.go(-1)
}

const loadDetail = () => {
  if (!namespace.value || !podName.value) return
  loading.value = true
  getPodDetail(namespace.value, podName.value).then(res => {
    podInfo.value = res.data.pod || {}  // 接收后端的 JSON
    yamlData.value = res.data.yaml      // 接收 YAML 文本用于下载
    eventsData.value = res.data.events
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

// 获取容器真实 ID (处理 containerd:// 前缀并截取短 ID)
const getContainerId = (containerName, short = true) => {
  if (!podInfo.value.status || !podInfo.value.status.containerStatuses) return '-'
  const status = podInfo.value.status.containerStatuses.find(c => c.name === containerName)
  if (status && status.containerID) {
    const rawId = status.containerID.replace('containerd://', '').replace('docker://', '')
    return short ? rawId.substring(0, 12) : rawId
  }
  return '未分配'
}

// 状态标签颜色匹配
const getStatusType = (status) => {
  if (status === 'Running') return 'success'
  if (status === 'Pending') return 'warning'
  if (status === 'Failed' || status === 'CrashLoopBackOff' || status === 'Error') return 'danger'
  return 'info'
}

// 纯前端实现 YAML 文件下载功能
const downloadYaml = () => {
  if (!yamlData.value) {
    ElMessage.warning('YAML 数据尚未加载完成')
    return
  }
  const blob = new Blob([yamlData.value], { type: 'text/yaml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${podName.value}.yaml` // 默认下载的文件名
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success(`已开始下载 ${podName.value}.yaml`)
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
/* ================= 静态信息面板样式增强 ================= */

/* 描述列表 - 标签列（左侧栏） */
:deep(.desc-label) {
  background-color: #f0f4f8 !important; /* 更清爽的浅蓝灰色 */
  color: #303133 !important; /* 字体加深 */
  font-weight: 600 !important;
  font-size: 14px !important;
  width: 130px;
}

/* 描述列表 - 内容列（右侧栏） */
:deep(.desc-content) {
  color: #1f2d3d !important;
  font-size: 14px !important;
  font-weight: 500;
}

/* ================= 表格样式增强 ================= */

/* 整体表格字体放大，表头加粗加深 */
:deep(.custom-pod-table) {
  font-size: 14px;
}
:deep(.custom-pod-table .el-table__header th) {
  background-color: #f5f7fa !important;
  color: #303133;
  font-weight: bold;
}

/* 镜像名称使用等宽字体，看起来更极客 */
.code-font {
  font-family: Consolas, Monaco, "Courier New", monospace;
  color: #475669;
  font-size: 13px;
  background-color: #f9fafc;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

/* 存储卷挂载条目优化 */
.volume-item {
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  line-height: 1.2;
}
.vol-name {
  font-family: Consolas, monospace;
  border-radius: 2px;
}
.vol-path {
  font-weight: 600;
  color: #303133;
  word-break: break-all;
}

/* 容器 ID 徽章样式 */
.container-id-badge {
  font-family: Consolas, monospace;
  font-size: 13px;
  color: #606266;
  background-color: #f4f4f5;
  border: 1px solid #e9e9eb;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.container-id-badge:hover {
  background-color: #e9e9eb;
  color: #303133;
}

/* ... 这里保留你之前写的 Grafana 面板相关的 CSS (.grafana-section, .iframe-container 等) ... */
</style>