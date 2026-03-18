<template>
  <div class="app-container">
    <div class="topology-wrapper">
      <div class="topology-header">
        <div class="header-left">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" width="28" height="20">
              <path fill="currentColor" d="M12 2C6.48 2 2 4.69 2 8v8c0 3.31 4.48 6 10 6s10-2.69 10-6V8c0-3.31-4.48-6-10-6zm0 2c4.42 0 8 1.79 8 4s-3.58 4-8 4-8-1.79-8-4 3.58-4 8-4zm0 16c-4.42 0-8-1.79-8-4v-2.55c1.72 1.43 4.33 2.55 8 2.55s6.28-1.12 8-2.55V16c0 2.21-3.58 4-8 4zm0-6c-4.42 0-8-1.79-8-4V7.45C5.72 8.88 8.33 10 12 10s6.28-1.12 8-2.55V10c0 2.21-3.58 4-8 4z"/>
            </svg>
          </div>
          <div class="header-title">
            <span class="title-text">物理机拓扑图</span>
            <span class="title-sub">Physical Machine Topology</span>
          </div>
          <div class="header-stats">
            <div class="stat-box">
              <div class="stat-icon-wrap pm">
                <span class="stat-icon">🟦</span>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ pmCount }}</span>
                <span class="stat-label">物理服务器</span>
              </div>
            </div>
            <div class="stat-box">
              <div class="stat-icon-wrap node">
                <span class="stat-icon">🔗</span>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ totalNodes }}</span>
                <span class="stat-label">节点总数</span>
              </div>
            </div>
          </div>
        </div>
        <div class="header-right">
          <el-button class="cyber-btn" @click="refreshTopology">
            <span class="btn-icon">⟳</span>
            刷新
          </el-button>
          <el-button type="primary" class="cyber-btn primary" @click="showAddNodeDialog">
            <span class="btn-icon">+</span>
            新增节点
          </el-button>
        </div>
      </div>

      <div class="topology-canvas" ref="chartRef">
        <div class="particles-bg"></div>
        <div class="stats-overlay">
          <div class="stat-pill pm">
            <span class="pill-glow"></span>
            <span class="pill-icon">🟦</span>
            <span class="pill-label">物理机</span>
            <span class="pill-value">{{ pmCount }}</span>
          </div>
          <div class="stat-pill app">
            <span class="pill-glow"></span>
            <span class="pill-icon">🟢</span>
            <span class="pill-label">应用</span>
            <span class="pill-value">{{ appCount }}</span>
          </div>
          <div class="stat-pill db">
            <span class="pill-glow"></span>
            <span class="pill-icon">🟧</span>
            <span class="pill-label">数据库</span>
            <span class="pill-value">{{ dbCount }}</span>
          </div>
        </div>
        <div class="corner-decoration tl"></div>
        <div class="corner-decoration tr"></div>
        <div class="corner-decoration bl"></div>
        <div class="corner-decoration br"></div>
      </div>

      <el-drawer
        v-model="drawerVisible"
        title="节点详情"
        direction="rtl"
        size="420"
        class="cyber-drawer"
      >
        <div v-if="selectedNode" class="node-details">
          <div class="node-info">
            <div class="node-icon-outer" :class="selectedNode.type">
              <div class="node-icon-inner">
                <span class="node-icon-text">{{ getNodeIcon(selectedNode.type) }}</span>
              </div>
            </div>
            <h3 class="node-name">{{ selectedNode.name }}</h3>
            <p class="node-id">ID: {{ selectedNode.id }}</p>
            <el-tag size="small" :type="getTypeColor(selectedNode.type)" class="node-type-tag" :class="selectedNode.type">
              {{ getTypeLabel(selectedNode.type) }}
            </el-tag>
          </div>

          <div v-if="selectedNode.type === 'pm'" class="node-metrics">
            <div class="metric-row">
              <span class="metric-label">IP 地址</span>
              <span class="metric-value">{{ selectedNode.ip || '未配置' }}</span>
            </div>
          </div>

          <el-divider class="cyber-divider" />

          <div class="services-deployed">
            <div class="services-header">
              <h4 class="section-title">
                <span class="section-line"></span>
                已部署服务
              </h4>
              <el-button v-if="selectedNode.type === 'pm'" size="small" class="add-service-btn" @click="showAddServiceDialog">
                + 添加服务
              </el-button>
            </div>
            <el-empty v-if="!selectedNode.services || selectedNode.services.length === 0" description="暂无部署服务" />
            <el-scrollbar height="240">
              <div v-for="service in selectedNode.services" :key="service.id" class="service-card">
                <div class="service-card-header">
                  <span class="service-name">{{ service.name }}</span>
                  <span class="service-status" :class="service.status">
                    {{ service.status === 'running' ? '运行中' : '异常' }}
                  </span>
                </div>
                <div class="service-card-body">
                  <div class="service-meta">
                    <span class="meta-label">端口</span>
                    <span class="meta-value">{{ service.port }}</span>
                  </div>
                  <div class="service-meta">
                    <span class="meta-label">版本</span>
                    <span class="meta-value">{{ service.version }}</span>
                  </div>
                  <div class="service-meta">
                    <span class="meta-label">启动时间</span>
                    <span class="meta-value">{{ service.startTime }}</span>
                  </div>
                </div>
                <div v-if="selectedNode.type === 'pm'" class="service-actions">
                  <el-button size="small" text @click="showEditServiceDialog(service)">编辑</el-button>
                  <el-button size="small" text type="danger" @click="deleteService(service)">删除</el-button>
                </div>
              </div>
            </el-scrollbar>
          </div>

          <el-divider class="cyber-divider" />

          <div class="node-actions">
            <el-button type="primary" class="action-btn" block @click="showEditNodeDialog">
              <span>✏️</span> 编辑节点
            </el-button>
            <el-button type="danger" class="action-btn danger" block @click="deleteNode">
              <span>🗑️</span> 删除节点
            </el-button>
          </div>
        </div>
      </el-drawer>

      <el-dialog
        v-model="nodeDialogVisible"
        :title="isEditing ? '编辑节点' : '新增节点'"
        width="480px"
        class="cyber-dialog"
      >
        <el-form :model="nodeForm" ref="nodeFormRef" label-width="100px" class="cyber-form">
          <el-form-item label="节点ID" prop="id">
            <el-input v-model="nodeForm.id" :disabled="isEditing" />
          </el-form-item>
          <el-form-item label="节点名称" prop="name">
            <el-input v-model="nodeForm.name" />
          </el-form-item>
          <el-form-item label="节点类型" prop="type">
            <el-select v-model="nodeForm.type" style="width: 100%" :disabled="isEditing">
              <el-option label="物理服务器" value="pm" />
              <el-option label="应用服务" value="app" />
              <el-option label="数据库" value="db" />
            </el-select>
          </el-form-item>
          <template v-if="nodeForm.type === 'pm'">
            <el-form-item label="IP地址" prop="ip">
              <el-input v-model="nodeForm.ip" placeholder="192.168.1.1" />
            </el-form-item>
          </template>
        </el-form>
        <template #footer>
          <el-button @click="nodeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitNodeForm">确定</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="serviceDialogVisible"
        :title="isEditingService ? '编辑服务' : '新增服务'"
        width="420px"
        class="cyber-dialog"
      >
        <el-form :model="serviceForm" ref="serviceFormRef" label-width="80px" class="cyber-form">
          <el-form-item label="服务ID" prop="id">
            <el-input v-model="serviceForm.id" disabled />
          </el-form-item>
          <el-form-item label="服务名" prop="name">
            <el-input v-model="serviceForm.name" placeholder="Nginx" />
          </el-form-item>
          <el-form-item label="端口" prop="port">
            <el-input v-model="serviceForm.port" placeholder="8080" />
          </el-form-item>
          <el-form-item label="版本" prop="version">
            <el-input v-model="serviceForm.version" placeholder="1.0.0" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="serviceForm.status" style="width: 100%">
              <el-option label="运行中" value="running" />
              <el-option label="异常" value="stopped" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="serviceDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitServiceForm">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'

const chartRef = ref(null)
let chartInstance = null

const pmCount = ref(0)
const appCount = ref(0)
const dbCount = ref(0)
const totalNodes = ref(0)

const selectedNode = ref(null)
const drawerVisible = ref(false)

const nodeDialogVisible = ref(false)
const isEditing = ref(false)
const nodeForm = ref({ id: '', name: '', type: 'pm', ip: '', status: 'online' })
const nodeFormRef = ref(null)

const serviceDialogVisible = ref(false)
const isEditingService = ref(false)
const serviceForm = ref({ id: '', name: '', port: '', version: '', status: 'running', startTime: '' })
const serviceFormRef = ref(null)

const expandedNodes = ref(new Set())

const nodes = ref([
  { 
    id: 'pm-001', 
    name: '物理服务器-001', 
    type: 'pm', 
    x: 350, 
    y: 180, 
    ip: '192.168.1.101',
    status: 'online',
    services: [
      { id: 'svc-001', name: 'Nginx', port: '80, 443', version: '1.24.0', startTime: '2026-03-15 10:00:00', status: 'running' }
    ] 
  },
  { 
    id: 'pm-002', 
    name: '物理服务器-002', 
    type: 'pm', 
    x: 550, 
    y: 180, 
    ip: '192.168.1.102',
    status: 'online',
    services: [
      { id: 'svc-002', name: 'Auth-Service', port: '8080', version: '2.1.0', startTime: '2026-03-15 11:00:00', status: 'running' }
    ] 
  },
  { 
    id: 'pm-003', 
    name: '物理服务器-003', 
    type: 'pm', 
    x: 750, 
    y: 180, 
    ip: '192.168.1.103',
    status: 'online',
    services: [] 
  },
  { id: 'app-001', name: 'Nginx网关', type: 'app', x: 450, y: 320, services: [
    { id: 'svc-001', name: 'Nginx主服务', port: '80, 443', version: '1.24.0', startTime: '2026-03-15 10:00:00', status: 'running' }
  ] },
  { id: 'app-002', name: '认证服务', type: 'app', x: 650, y: 320, services: [
    { id: 'svc-002', name: 'Auth-Service', port: '8080', version: '2.1.0', startTime: '2026-03-15 11:00:00', status: 'running' }
  ] },
  { id: 'db-001', name: 'MySQL主库', type: 'db', x: 450, y: 460, services: [
    { id: 'svc-003', name: 'MySQL服务', port: '3306', version: '8.0.32', startTime: '2026-03-15 09:00:00', status: 'running' }
  ] },
  { id: 'db-002', name: 'Redis集群', type: 'db', x: 650, y: 460, services: [
    { id: 'svc-004', name: 'Redis主节点', port: '6379', version: '7.0.0', startTime: '2026-03-15 09:00:00', status: 'running' }
  ] }
])

const links = ref([
  { source: 'pm-001', target: 'app-001', type: 'deploy' },
  { source: 'pm-002', target: 'app-002', type: 'deploy' },
  { source: 'pm-001', target: 'db-001', type: 'deploy' },
  { source: 'pm-002', target: 'db-002', type: 'deploy' },
  { source: 'app-001', target: 'app-002', type: 'service' },
  { source: 'app-002', target: 'db-001', type: 'service' },
  { source: 'app-001', target: 'db-002', type: 'service' }
])

const getTypeLabel = (type) => {
  const labels = { pm: '物理服务器', app: '应用服务', db: '数据库' }
  return labels[type] || type
}

const getTypeColor = (type) => {
  const colors = { pm: 'primary', app: 'success', db: 'warning' }
  return colors[type] || 'info'
}

const getNodeIcon = (type) => {
  const icons = { pm: '🟦', app: '🟢', db: '🟧' }
  return icons[type] || '📋'
}

const updateStats = () => {
  pmCount.value = nodes.value.filter(n => n.type === 'pm').length
  appCount.value = nodes.value.filter(n => n.type === 'app').length
  dbCount.value = nodes.value.filter(n => n.type === 'db').length
  totalNodes.value = nodes.value.length
}

const getVisibleNodes = () => {
  const visibleNodes = new Set()
  
  nodes.value.forEach(node => {
    if (node.type === 'pm') {
      visibleNodes.add(node.id)
    }
  })

  expandedNodes.value.forEach(pmId => {
    links.value.forEach(link => {
      if (link.source === pmId) {
        visibleNodes.add(link.target)
        const targetNode = nodes.value.find(n => n.id === link.target)
        if (targetNode && targetNode.type === 'app') {
          links.value.forEach(innerLink => {
            if (innerLink.source === targetNode.id) {
              visibleNodes.add(innerLink.target)
            }
          })
        }
      }
    })
  })

  return nodes.value.filter(n => visibleNodes.has(n.id))
}

const getVisibleLinks = () => {
  const visibleLinks = []
  
  expandedNodes.value.forEach(pmId => {
    links.value.forEach(link => {
      if (link.source === pmId) {
        visibleLinks.push(link)
        const targetNode = nodes.value.find(n => n.id === link.target)
        if (targetNode && targetNode.type === 'app') {
          links.value.forEach(innerLink => {
            if (innerLink.source === targetNode.id) {
              visibleLinks.push(innerLink)
            }
          })
        }
      }
    })
  })

  return visibleLinks
}

const renderChart = () => {
  if (!chartInstance) return

  const visibleNodes = getVisibleNodes()
  const visibleLinks = getVisibleLinks()

  const nodeColors = {
    pm: { primary: '#6366f1', secondary: '#818cf8', glow: 'rgba(99, 102, 241, 0.6)' },
    app: { primary: '#8b5cf6', secondary: '#a78bfa', glow: 'rgba(139, 92, 246, 0.6)' },
    db: { primary: '#3b82f6', secondary: '#60a5fa', glow: 'rgba(59, 130, 246, 0.6)' }
  }

  const canvasWidth = chartRef.value?.clientWidth || 1200
  const canvasHeight = chartRef.value?.clientHeight || 700
  const padding = 100

  visibleNodes.forEach(node => {
    const nodeSize = node.type === 'pm' ? 70 : 55
    if (node.x < padding + nodeSize) node.x = padding + nodeSize
    if (node.x > canvasWidth - padding - nodeSize) node.x = canvasWidth - padding - nodeSize
    if (node.y < padding + nodeSize) node.y = padding + nodeSize
    if (node.y > canvasHeight - padding - nodeSize) node.y = canvasHeight - padding - nodeSize
  })

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: padding,
      right: padding,
      top: padding,
      bottom: padding
    },
    xAxis: {
      min: 0,
      max: canvasWidth,
      show: false,
      type: 'value'
    },
    yAxis: {
      min: 0,
      max: canvasHeight,
      show: false,
      type: 'value'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10, 10, 20, 0.95)',
      borderColor: '#6366f1',
      textStyle: { color: '#fff' },
      formatter: (params) => {
        const node = params.data
        if (node) {
          let html = `<div style="font-size:14px;font-weight:600;margin-bottom:6px;">${node.name}</div>`
          html += `<div style="color:#94a3b8;font-size:12px;">类型: ${getTypeLabel(node.type)}</div>`
          if (node.services && node.services.length > 0) {
            html += `<div style="color:#6366f1;font-size:12px;margin-top:4px;">服务数量: ${node.services.length}</div>`
          }
          return html
        }
        return ''
      }
    },
    series: [{
      type: 'graph',
      layout: 'none',
      roam: true,
      draggable: true,
      data: visibleNodes.map(n => {
        const colors = nodeColors[n.type] || nodeColors.pm
        return {
          id: n.id,
          name: n.name,
          x: n.x,
          y: n.y,
          symbolSize: n.type === 'pm' ? 70 : 55,
          itemStyle: {
            color: {
              type: 'radial',
              x: 0.3,
              y: 0.3,
              r: 0.7,
              colorStops: [
                { offset: 0, color: colors.secondary },
                { offset: 1, color: colors.primary }
              ]
            },
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 25,
            shadowColor: colors.glow
          },
          label: {
            show: true,
            position: 'bottom',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            backgroundColor: 'rgba(10, 10, 20, 0.8)',
            padding: [6, 12],
            borderRadius: 6
          },
          node: n
        }
      }),
      links: visibleLinks.map(l => {
        const isService = l.type === 'service'
        return {
          source: l.source,
          target: l.target,
          lineStyle: {
            color: isService ? {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(168, 85, 247, 0.4)' },
                { offset: 1, color: 'rgba(244, 114, 182, 0.4)' }
              ]
            } : {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 245, 255, 0.3)' },
                { offset: 1, color: 'rgba(0, 212, 255, 0.3)' }
              ]
            },
            width: isService ? 1.5 : 2,
            type: 'solid',
            curveness: 0.15
          }
        }
      }),
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 8],
      focusNodeAdjacency: true,
      force: {
        repulsion: 1200,
        edgeLength: [120, 180]
      }
    }]
  }

  chartInstance.setOption(option, true)
}

const handleNodeClick = (params) => {
  const nodeData = params.data
  if (nodeData && nodeData.node) {
    const node = nodeData.node
    if (node.type === 'pm') {
      if (expandedNodes.value.has(node.id)) {
        expandedNodes.value.delete(node.id)
      } else {
        expandedNodes.value.add(node.id)
      }
      renderChart()
      selectedNode.value = node
      drawerVisible.value = true
    } else {
      selectedNode.value = node
      drawerVisible.value = true
    }
  }
}

const handleNodeDrag = (params) => {
  if (params.data && params.data.node) {
    const node = params.data.node
    const canvasWidth = chartRef.value?.clientWidth || 1200
    const canvasHeight = chartRef.value?.clientHeight || 700
    const padding = 100
    const nodeSize = node.type === 'pm' ? 70 : 55
    
    let newX = params.data.x
    let newY = params.data.y
    
    if (newX < padding + nodeSize) newX = padding + nodeSize
    if (newX > canvasWidth - padding - nodeSize) newX = canvasWidth - padding - nodeSize
    if (newY < padding + nodeSize) newY = padding + nodeSize
    if (newY > canvasHeight - padding - nodeSize) newY = canvasHeight - padding - nodeSize
    
    node.x = newX
    node.y = newY
  }
}

const refreshTopology = () => {
  updateStats()
  nextTick(() => {
    renderChart()
  })
}

const showAddNodeDialog = () => {
  isEditing.value = false
  nodeForm.value = { 
    id: `pm-${Date.now().toString().slice(-3)}`, 
    name: '', 
    type: 'pm', 
    ip: '192.168.1.',
    status: 'online',
    services: []
  }
  nodeDialogVisible.value = true
}

const showEditNodeDialog = () => {
  if (!selectedNode.value) return
  isEditing.value = true
  nodeForm.value = { ...selectedNode.value }
  nodeDialogVisible.value = true
}

const submitNodeForm = async () => {
  if (!nodeForm.value.name || !nodeForm.value.id) {
    ElMessage.warning('节点ID和名称不能为空')
    return
  }

  if (isEditing.value) {
    const index = nodes.value.findIndex(n => n.id === nodeForm.value.id)
    if (index !== -1) {
      nodes.value[index] = { ...nodes.value[index], ...nodeForm.value }
    }
  } else {
    const canvasWidth = chartRef.value?.clientWidth || 1200
    const canvasHeight = chartRef.value?.clientHeight || 700
    nodes.value.push({
      ...nodeForm.value,
      x: 300 + Math.random() * (canvasWidth - 600),
      y: 150 + Math.random() * 100,
      services: nodeForm.value.services || []
    })
  }

  nodeDialogVisible.value = false
  updateStats()
  renderChart()
  ElMessage.success(isEditing.value ? '节点更新成功' : '节点添加成功')
}

const deleteNode = () => {
  if (!selectedNode.value) return

  ElMessageBox.confirm('确认删除该节点吗？', '警告', {
    type: 'warning'
  }).then(() => {
    nodes.value = nodes.value.filter(n => n.id !== selectedNode.value.id)
    links.value = links.value.filter(l => l.source !== selectedNode.value.id && l.target !== selectedNode.value.id)
    drawerVisible.value = false
    selectedNode.value = null
    updateStats()
    renderChart()
    ElMessage.success('节点删除成功')
  }).catch(() => {})
}

const showAddServiceDialog = () => {
  if (!selectedNode.value) return
  isEditingService.value = false
  serviceForm.value = { 
    id: `svc-${Date.now().toString().slice(-4)}`, 
    name: '', 
    port: '', 
    version: '1.0.0', 
    status: 'running',
    startTime: new Date().toLocaleString('zh-CN')
  }
  serviceDialogVisible.value = true
}

const showEditServiceDialog = (service) => {
  isEditingService.value = true
  serviceForm.value = { ...service }
  serviceDialogVisible.value = true
}

const submitServiceForm = async () => {
  if (!serviceForm.value.name || !serviceForm.value.port) {
    ElMessage.warning('服务名称和端口不能为空')
    return
  }

  if (!selectedNode.value) return

  if (isEditingService.value) {
    const index = selectedNode.value.services.findIndex(s => s.id === serviceForm.value.id)
    if (index !== -1) {
      selectedNode.value.services[index] = { ...serviceForm.value }
    }
  } else {
    if (!selectedNode.value.services) {
      selectedNode.value.services = []
    }
    selectedNode.value.services.push({ ...serviceForm.value })
  }

  const nodeIndex = nodes.value.findIndex(n => n.id === selectedNode.value.id)
  if (nodeIndex !== -1) {
    nodes.value[nodeIndex].services = [...selectedNode.value.services]
  }

  serviceDialogVisible.value = false
  renderChart()
  ElMessage.success(isEditingService.value ? '服务更新成功' : '服务添加成功')
}

const deleteService = (service) => {
  if (!selectedNode.value) return

  ElMessageBox.confirm('确认删除该服务吗？', '警告', {
    type: 'warning'
  }).then(() => {
    selectedNode.value.services = selectedNode.value.services.filter(s => s.id !== service.id)
    const nodeIndex = nodes.value.findIndex(n => n.id === selectedNode.value.id)
    if (nodeIndex !== -1) {
      nodes.value[nodeIndex].services = [...selectedNode.value.services]
    }
    renderChart()
    ElMessage.success('服务删除成功')
  }).catch(() => {})
}

const handleResize = () => {
  chartInstance?.resize()
  const canvasWidth = chartRef.value?.clientWidth || 1200
  const canvasHeight = chartRef.value?.clientHeight || 700
  const padding = 100
  
  nodes.value.forEach(node => {
    const nodeSize = node.type === 'pm' ? 70 : 55
    if (node.x < padding + nodeSize) node.x = padding + nodeSize
    if (node.x > canvasWidth - padding - nodeSize) node.x = canvasWidth - padding - nodeSize
    if (node.y < padding + nodeSize) node.y = padding + nodeSize
    if (node.y > canvasHeight - padding - nodeSize) node.y = canvasHeight - padding - nodeSize
  })
  
  renderChart()
}

onMounted(() => {
  nextTick(() => {
    if (chartRef.value) {
      chartInstance = echarts.init(chartRef.value)
      
      chartInstance.on('click', (params) => {
        if (params.dataType === 'node') {
          handleNodeClick(params)
        }
      })

      chartInstance.on('drag', (params) => {
        if (params.dataType === 'node') {
          handleNodeDrag(params)
        }
      })

      window.addEventListener('resize', handleResize)

      updateStats()
      renderChart()
    }
  })
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap');

.app-container {
  min-height: calc(100vh - 40px);
  padding: 16px;
  background: 
    radial-gradient(ellipse at 30% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 100%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 60%),
    linear-gradient(180deg, #0f1729 0%, #131b2e 50%, #0c1322 100%);
}

.topology-wrapper {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.topology-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1px 2px;
  background: linear-gradient(135deg, rgba(30, 41, 75, 0.7) 0%, rgba(15, 23, 41, 0.9) 100%);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 60px rgba(99, 102, 241, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  border-radius: 14px;
  color: white;
  box-shadow: 
    0 4px 20px rgba(99, 102, 241, 0.4),
    0 0 30px rgba(139, 92, 246, 0.3);
  animation: logoGlow 3s ease-in-out infinite;
}

@keyframes logoGlow {
  0%, 100% { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4), 0 0 30px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 4px 25px rgba(99, 102, 241, 0.6), 0 0 40px rgba(139, 92, 246, 0.5); }
}

.header-title {
  display: flex;
  flex-direction: column;
}

.title-text {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
}

.title-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-top: 2px;
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 18px;
}

.stat-icon-wrap.pm {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(129, 140, 248, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.stat-icon-wrap.node {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(167, 139, 250, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-content .stat-value {
  font-size: 20px;
  font-weight: 700;
  font-family: 'Orbitron', sans-serif;
  color: #fff;
  line-height: 1.2;
  text-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}

.stat-content .stat-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  gap: 12px;
}

.cyber-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  transition: all 0.3s ease;
}

.cyber-btn:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #818cf8;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
}

.cyber-btn.primary {
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  border-color: #6366f1;
  color: #fff;
  font-weight: 600;
}

.cyber-btn.primary:hover {
  background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
}

.topology-canvas {
  height: calc(100vh - 150px);
  border-radius: 16px;
  background: 
    radial-gradient(ellipse at 30% 30%, rgba(0, 245, 255, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 70%, rgba(168, 85, 247, 0.03) 0%, transparent 50%),
    linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 18, 0.98) 100%);
  border: 1px solid rgba(0, 245, 255, 0.15);
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 8px 40px rgba(0, 0, 0, 0.5),
    inset 0 0 80px rgba(0, 245, 255, 0.02);
}

.particles-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(rgba(0, 245, 255, 0.15) 1px, transparent 1px),
    radial-gradient(rgba(168, 85, 247, 0.1) 1px, transparent 1px);
  background-size: 60px 60px, 40px 40px;
  opacity: 0.6;
  animation: particlesMove 20s linear infinite;
}

@keyframes particlesMove {
  0% { transform: translateY(0); }
  100% { transform: translateY(-60px); }
}

.stats-overlay {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 10;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(10, 10, 20, 0.9);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.stat-pill::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
}

.stat-pill.pm::before { background: linear-gradient(90deg, #6366f1, transparent); }
.stat-pill.app::before { background: linear-gradient(90deg, #8b5cf6, transparent); }
.stat-pill.db::before { background: linear-gradient(90deg, #3b82f6, transparent); }

.stat-pill.pm { border: 1px solid rgba(99, 102, 241, 0.3); }
.stat-pill.app { border: 1px solid rgba(139, 92, 246, 0.3); }
.stat-pill.db { border: 1px solid rgba(59, 130, 246, 0.3); }

.pill-glow {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stat-pill.pm .pill-glow { background: #6366f1; box-shadow: 0 0 10px #6366f1; animation: glowPulse 2s infinite; }
.stat-pill.app .pill-glow { background: #8b5cf6; box-shadow: 0 0 10px #8b5cf6; animation: glowPulse 2s infinite 0.3s; }
.stat-pill.db .pill-glow { background: #3b82f6; box-shadow: 0 0 10px #3b82f6; animation: glowPulse 2s infinite 0.6s; }

@keyframes glowPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.pill-icon {
  font-size: 14px;
}

.pill-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.pill-value {
  font-size: 15px;
  font-weight: 700;
  font-family: 'Orbitron', sans-serif;
  color: #fff;
}

.corner-decoration {
  position: absolute;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(0, 245, 255, 0.2);
}

.corner-decoration.tl { top: 10px; left: 10px; border-right: none; border-bottom: none; }
.corner-decoration.tr { top: 10px; right: 10px; border-left: none; border-bottom: none; }
.corner-decoration.bl { bottom: 10px; left: 10px; border-right: none; border-top: none; }
.corner-decoration.br { bottom: 10px; right: 10px; border-left: none; border-top: none; }

.node-details {
  padding: 20px 0;
}

.node-info {
  text-align: center;
  padding-bottom: 20px;
}

.node-metrics {
  background: rgba(20, 20, 35, 0.6);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
}

.metric-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.metric-row:last-child {
  margin-bottom: 0;
}

.metric-label {
  width: 70px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.metric-value {
  flex: 1;
  font-size: 13px;
  color: #818cf8;
  font-family: 'Orbitron', monospace;
}

.node-icon-outer {
  width: 90px;
  height: 90px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.node-icon-outer::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #3b82f6);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: rotateGlow 3s linear infinite;
}

@keyframes rotateGlow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.node-icon-outer.pm { background: linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(0, 212, 255, 0.1)); }
.node-icon-outer.app { background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(192, 132, 252, 0.1)); }
.node-icon-outer.db { background: linear-gradient(135deg, rgba(244, 114, 182, 0.2), rgba(249, 168, 212, 0.1)); }

.node-icon-inner {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 20, 0.9);
}

.node-icon-text {
  font-size: 32px;
}

.node-name {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  font-family: 'Orbitron', sans-serif;
}

.node-id {
  margin: 0 0 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'Orbitron', monospace;
}

.node-type-tag {
  background: rgba(99, 102, 241, 0.15) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
  color: #818cf8 !important;
}

.node-type-tag.app {
  background: rgba(139, 92, 246, 0.15) !important;
  border-color: rgba(139, 92, 246, 0.3) !important;
  color: #a78bfa !important;
}

.node-type-tag.db {
  background: rgba(59, 130, 246, 0.15) !important;
  border-color: rgba(59, 130, 246, 0.3) !important;
  color: #60a5fa !important;
}

.cyber-divider {
  border-color: rgba(255, 255, 255, 0.08) !important;
  margin: 20px 0 !important;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
  font-family: 'Orbitron', sans-serif;
}

.services-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.services-header .section-title {
  margin-bottom: 0;
}

.add-service-btn {
  background: rgba(99, 102, 241, 0.15) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
  color: #818cf8 !important;
  font-size: 12px !important;
}

.section-line {
  width: 20px;
  height: 2px;
  background: linear-gradient(90deg, #6366f1, transparent);
}

.service-card {
  background: rgba(20, 20, 35, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.service-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.1);
}

.service-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.service-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.service-name {
  font-weight: 600;
  color: #fff;
  font-size: 14px;
}

.service-status {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.service-status.running {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.service-status.stopped {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.service-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.meta-label {
  color: rgba(255, 255, 255, 0.4);
}

.meta-value {
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Orbitron', monospace;
  font-size: 11px;
}

.node-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  height: 44px;
  border-radius: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.2));
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.action-btn.danger {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.action-btn.danger:hover {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.2));
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

:deep(.el-drawer) {
  background: linear-gradient(180deg, #0a0a14 0%, #0d0d1a 100%) !important;
}

:deep(.el-drawer__header) {
  margin: 0;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-family: 'Orbitron', sans-serif;
}

:deep(.el-drawer__body) {
  padding: 0 24px;
}

:deep(.el-empty__description) {
  color: rgba(255, 255, 255, 0.4);
}

:deep(.el-dialog) {
  background: linear-gradient(180deg, #0f1729 0%, #131b2e 100%) !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  border-radius: 16px !important;
}

:deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

:deep(.el-dialog__title) {
  color: #fff;
  font-family: 'Orbitron', sans-serif;
}

:deep(.el-dialog__body) {
  padding: 24px;
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.el-input__wrapper) {
  background: rgba(0, 0, 0, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: none !important;
}

:deep(.el-input__inner) {
  color: #fff;
}

:deep(.el-select .el-input__wrapper) {
  background: rgba(0, 0, 0, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

:deep(.el-select-dropdown) {
  background: rgba(10, 10, 20, 0.98) !important;
  border: 1px solid rgba(0, 245, 255, 0.2) !important;
}

:deep(.el-select-dropdown__item) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-select-dropdown__item.hover),
:deep(.el-select-dropdown__item:hover) {
  background: rgba(0, 245, 255, 0.1);
}

:deep(.el-button) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-button:hover) {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: #818cf8;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #6366f1, #818cf8) !important;
  border-color: #6366f1 !important;
  color: #fff !important;
  font-weight: 600;
}

:deep(.el-scrollbar__bar) {
  background: rgba(0, 245, 255, 0.1);
}

:deep(.el-scrollbar__thumb) {
  background: rgba(0, 245, 255, 0.3);
}
</style>
