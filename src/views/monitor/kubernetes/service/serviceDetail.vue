<template>
  <div class="app-container">
    <el-page-header @back="goBack" :content="`Service 详情: ${serviceName}`" style="margin-bottom: 20px;" />

    <el-card shadow="hover" style="margin-bottom: 20px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; font-size: 16px;">
            <el-icon style="margin-right: 5px; vertical-align: middle; color: #E6A23C;"><Document /></el-icon>
            服务网络配置 (Network Configuration)
          </span>
          <el-button type="success" plain icon="Download" @click="downloadYaml">
            下载 YAML 配置文件
          </el-button>
        </div>
      </template>

      <el-descriptions :column="3" border size="default" v-loading="loading">
        <el-descriptions-item label="Service 名称" label-class-name="desc-label" class-name="desc-content">{{ svcInfo.metadata?.name }}</el-descriptions-item>
        <el-descriptions-item label="命名空间" label-class-name="desc-label" class-name="desc-content">{{ svcInfo.metadata?.namespace }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" label-class-name="desc-label" class-name="desc-content">{{ svcInfo.metadata?.creationTimestamp }}</el-descriptions-item>
        
        <el-descriptions-item label="服务类型 (Type)" label-class-name="desc-label" class-name="desc-content">
          <el-tag :type="getServiceTypeColor(svcInfo.spec?.type)" effect="dark">{{ svcInfo.spec?.type }}</el-tag>
        </el-descriptions-item>

        <el-descriptions-item label="集群内部 IP" label-class-name="desc-label" class-name="desc-content">
          <span class="code-font">{{ svcInfo.spec?.clusterIP }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="Session Affinity" label-class-name="desc-label" class-name="desc-content">
          {{ svcInfo.spec?.sessionAffinity || 'None' }}
        </el-descriptions-item>

        <el-descriptions-item label="标签选择器 (Selector)" :span="3" label-class-name="desc-label" class-name="desc-content">
          <template v-if="svcInfo.spec?.selector">
            <el-tag 
              v-for="(val, key) in svcInfo.spec.selector" 
              :key="key" 
              size="default" 
              type="warning" 
              effect="plain"
              class="k8s-selector-tag">
              <span class="label-key">{{ key }}</span> : {{ val }}
            </el-tag>
          </template>
          <span v-else style="color: #909399;">无选择器 (可能是 ExternalName 或手动维护 Endpoint)</span>
        </el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 25px;">
        <h4 style="margin-bottom: 15px; color: #303133; font-size: 16px;">
          <el-icon style="vertical-align: middle; margin-right: 5px; color: #E6A23C;"><Link /></el-icon>
          端口映射 (Port Mappings)
        </h4>
        <el-table :data="svcInfo.spec?.ports" border v-loading="loading" class="custom-k8s-table">
          <el-table-column label="端口名称" prop="name" width="150" >
             <template #default="scope">
               <span style="font-weight: bold;">{{ scope.row.name || '-' }}</span>
             </template>
          </el-table-column>
          <el-table-column label="服务端口 (Port)" prop="port" align="center">
            <template #default="scope">
              <el-tag size="default" type="success" effect="light" style="font-weight: bold; font-size: 14px;">
                {{ scope.row.port }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="协议" prop="protocol" width="100" align="center" />
          <el-table-column label="目标端口 (TargetPort)" prop="targetPort" align="center">
             <template #default="scope">
               <span class="code-font">{{ scope.row.targetPort }}</span>
             </template>
          </el-table-column>
          <el-table-column label="节点端口 (NodePort)" prop="nodePort" align="center">
             <template #default="scope">
               <span v-if="scope.row.nodePort" style="font-weight: bold; color: #E6A23C;">{{ scope.row.nodePort }}</span>
               <span v-else>-</span>
             </template>
          </el-table-column>
        </el-table>
      </div>

     <div style="margin-top: 25px;">
        <h4 style="margin-bottom: 15px; color: #303133; font-size: 16px;">
          <el-icon style="vertical-align: middle; margin-right: 5px; color: #67C23A;"><Connection /></el-icon>
          后端真实端点 (Endpoints)
        </h4>
        <el-table :data="endpointList" border v-loading="loading" class="custom-k8s-table" empty-text="当前服务未匹配到任何就绪的 Pod 端点">
          <el-table-column label="后端 Pod 名称" prop="targetRefName" min-width="200" show-overflow-tooltip>
            <template #default="scope">
              <span style="font-weight: bold; color: #303133;">{{ scope.row.targetRefName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Pod IP 地址" prop="ip" width="160" align="center">
            <template #default="scope">
              <span class="code-font endpoint-ip">{{ scope.row.ip }}</span>
            </template>
          </el-table-column>
          <el-table-column label="所在节点 (Node)" prop="nodeName" width="160" align="center" />
          <el-table-column label="暴露端口" prop="ports" width="180" align="center">
            <template #default="scope">
              <el-tag size="small" type="success" effect="plain" style="font-weight: bold;">
                {{ scope.row.ports }}
              </el-tag>
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
                服务事件追踪 (Events)
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
            <el-empty v-else description="暂无服务事件" :image-size="60" />
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>

    <!-- <el-card shadow="hover">
      <template #header>
        <span style="font-weight: bold; font-size: 16px;">
          <el-icon style="margin-right: 5px; vertical-align: middle; color: #409EFF;"><DataLine /></el-icon>
          服务流量监控 (Grafana) - 需配置 var-service 变量
        </span>
      </template>
      <div class="grafana-section">
        <el-row :gutter="15">
          <el-col :span="12" v-for="panel in svcPanelList" :key="panel.id" style="margin-bottom: 20px;">
            <div class="iframe-container">
              <div class="iframe-header">
                {{ panel.name }}
                <el-tooltip :content="panel.desc" placement="top">
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <iframe 
                :src="getServiceGrafanaUrl(panel.id, serviceName)" 
                width="100%" 
                height="280" 
                frameborder="0" 
                scrolling="no">
              </iframe>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card> -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getServiceDetail, getServiceGrafanaUrl, svcPanelList } from '@/api/monitor/kuber/service'
import { ElMessage } from 'element-plus'
import { Document, Link, Warning, DataLine, InfoFilled, Connection } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const namespace = ref(route.query.namespace || '')
const serviceName = ref(route.query.serviceName || '')

// 数据模型
const svcInfo = ref({}) 
const yamlData = ref('') 
const eventsData = ref([])
const rawEndpoints = ref({})
const endpointList = ref([])

const goBack = () => { router.go(-1) }

const loadDetail = () => {
  if (!namespace.value || !serviceName.value) return
  loading.value = true
  getServiceDetail(namespace.value, serviceName.value).then(res => {
    svcInfo.value = res.data.service || {}  
    yamlData.value = res.data.yaml      
    eventsData.value = res.data.events

    rawEndpoints.value = res.data.endpoints || {}
    parseEndpoints()
    
    loading.value = false
  }).catch(() => { loading.value = false })
}

// 【新增】：解析 K8s Endpoints 的深层嵌套结构为扁平化数组
const parseEndpoints = () => {
  const list = []
  const subsets = rawEndpoints.value.subsets
  if (subsets && subsets.length > 0) {
    subsets.forEach(subset => {
      // 提取该分组下的所有端口
      const portsStr = subset.ports 
        ? subset.ports.map(p => `${p.port}/${p.protocol}`).join(', ') 
        : '-'
      
      // 提取该分组下的所有就绪 IP 地址
      if (subset.addresses) {
        subset.addresses.forEach(addr => {
          list.push({
            ip: addr.ip,
            nodeName: addr.nodeName || '-',
            targetRefName: addr.targetRef ? addr.targetRef.name : '未知来源 (可能为外部注册)',
            ports: portsStr
          })
        })
      }
    })
  }
  endpointList.value = list
}

const downloadYaml = () => {
  if (!yamlData.value) { ElMessage.warning('YAML 数据尚未加载'); return }
  const blob = new Blob([yamlData.value], { type: 'text/yaml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = `${serviceName.value}.yaml`
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  ElMessage.success(`已开始下载 ${serviceName.value}.yaml`)
}

// 颜色匹配
const getServiceTypeColor = (type) => {
  if (type === 'NodePort') return 'warning'
  if (type === 'LoadBalancer') return 'success'
  if (type === 'ExternalName') return 'danger'
  return 'info'
}

onMounted(() => { loadDetail() })
</script>

<style scoped>
:deep(.desc-label) {
  background-color: #f0f4f8 !important; color: #303133 !important;
  font-weight: 600 !important; font-size: 14px !important; width: 150px; /* 再调宽一点 */
}
:deep(.desc-content) { color: #1f2d3d !important; font-size: 14px !important; font-weight: 500; }
:deep(.custom-k8s-table .el-table__header th) { background-color: #f5f7fa !important; color: #303133; font-weight: bold; }

.code-font {
  font-family: Consolas, Monaco, "Courier New", monospace;
  color: #E6A23C; /* Service 用橘色调 */
  font-size: 13px; background-color: #fdf6ec; padding: 2px 6px; border-radius: 4px; border: 1px solid #faecd8;
}

.k8s-selector-tag { margin-right: 8px; margin-bottom: 4px; border-color: #faecd8; color: #E6A23C; }
.label-key { font-weight: bold; color: #303133; }

/* Grafana 样式复用 */
.grafana-section { padding-top: 10px; }
.iframe-container { border: 1px solid #ebeef5; border-radius: 4px; background-color: #fff; transition: all 0.3s; overflow: hidden; }
.iframe-container:hover { box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); }
.iframe-header {
  height: 40px; line-height: 40px; padding: 0 15px; background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5; font-size: 14px; font-weight: 600; color: #303133;
  display: flex; align-items: center; justify-content: space-between;
}
.info-icon { color: #909399; cursor: pointer; font-size: 16px; }
.info-icon:hover { color: #409EFF; }

/* 【新增】：为 Endpoint IP 专门定制的绿色代码块样式 */
.endpoint-ip {
  color: #67C23A; 
  background-color: #f0f9eb; 
  border-color: #e1f3d8;
  font-weight: bold;
}

</style>