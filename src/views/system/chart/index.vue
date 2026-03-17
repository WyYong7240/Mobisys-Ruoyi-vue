<template>
  <div class="monitor-dashboard" @click="closeContextMenu">
    <!-- 极简深空网格背景 -->
    <div class="space-bg"></div>

    <!-- 顶部监控统计与控制台 -->
    <header class="top-header">
      <div class="brand">
        <div class="logo">⎈</div>
        <div class="title">
          <h1>数据中心全域监控大盘 (静态矩阵版)</h1>
          <p>Static Grid Topology & Progressive Disclosure</p>
        </div>
      </div>

      <!-- 资产数据统计仪 -->
      <div class="stats-board">
        <div class="stat-card pm">
          <div class="val">{{ pmCount }}</div>
          <div class="label">监控物理机</div>
        </div>
        <div class="stat-card app">
          <div class="val">{{ appCount }}</div>
          <div class="label">微服务/应用</div>
        </div>
        <div class="stat-card db">
          <div class="val">{{ dbCount }}</div>
          <div class="label">数据存储</div>
        </div>
        <div class="stat-card alert" :class="getAlertCount() > 0 ? 'has-alert' : ''">
          <div class="val">{{ getAlertCount() }}</div>
          <div class="label">告警节点</div>
        </div>
      </div>

      <!-- 操作工具栏 (CRUD) -->
      <div class="toolbar">
        <div class="search-box">
          <input v-model="searchKeyword" placeholder="检索节点..." @keyup.enter="searchNode" />
          <button @click="searchNode">⌕</button>
        </div>
        <button class="btn-cyan" @click="openNodeModal(null)">+ 接入物理机</button>
        <button class="btn-blue" @click="openLinkModal()">+ 构建关联链路</button>
        <button class="btn-ghost" @click="resetTopology">⟲ 收起并归位</button>
        <button class="btn-green" @click="refreshData">↻ 实时刷新</button>
        <button class="btn-purple" @click="exportData">💾 导出数据</button>
      </div>
    </header>

    <!-- 核心静态拓扑引擎 -->
    <div ref="chartRef" class="canvas-container"></div>

    <!-- 鼠标右键管理菜单 -->
    <div v-show="ctxMenu.show" class="context-menu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }">
      <div class="menu-header">节点管理 / {{ ctxMenu.node?.name }}</div>
      <div class="menu-item" @click="openNodeModal(ctxMenu.node)">
        <i class="icon">✎</i> 编辑节点属性
      </div>
      <div class="menu-item text-danger" @click="deleteNode(ctxMenu.node)">
        <i class="icon">⊗</i> 物理下线/移除节点
      </div>
    </div>

    <!-- 右侧属性与权重面板 -->
    <transition name="slide">
      <div class="detail-drawer" v-if="drawer.show && drawer.node">
        <div class="drawer-head">
          <h3>节点详情</h3>
          <button @click="drawer.show = false">✕</button>
        </div>
        
        <div class="drawer-body">
          <!-- 节头信息 -->
          <div class="node-hero">
            <div class="node-icon" :style="{ color: Theme[drawer.node.type].color, borderColor: Theme[drawer.node.type].color }">
              {{ Theme[drawer.node.type].label[0] }}
            </div>
            <div class="node-title">
              <h2>{{ drawer.node.name }}</h2>
              <span class="status-tag" :style="{ color: getStatusColor(getNodeStatus(drawer.node.id)) }">
                {{ getStatusLabel(getNodeStatus(drawer.node.id)) }}
              </span>
            </div>
          </div>

          <!-- 基础信息卡片 -->
          <div class="info-card">
            <h4>基础信息</h4>
            <div class="kv"><span class="k">节点 ID</span> <span class="v">{{ drawer.node.id }}</span></div>
            <div class="kv"><span class="k">节点类型</span> <span class="v" :style="{color: Theme[drawer.node.type].color}">{{ Theme[drawer.node.type].label }}</span></div>
          </div>

          <!-- 关联关系卡片 -->
          <div class="info-card">
            <h4>关联关系 <span class="badge">{{ getNodeLinks(drawer.node.id).length }}</span></h4>
            <div class="relation-grid">
              <div v-for="link in getNodeLinks(drawer.node.id)" :key="link.id" class="relation-item">
                <div class="rel-header">
                  <span class="rel-type" :style="{ backgroundColor: Theme.link[link.type] + '22', color: Theme.link[link.type] }">
                    {{ getLinkTypeName(link.type) }}
                  </span>
                  <span class="rel-weight" :class="link.weight < 60 ? 'text-danger' : 'text-success'">
                    {{ link.weight }}%
                  </span>
                </div>
                <div class="rel-content">
                  <div class="rel-direction">
                    <span class="icon-arrow" :class="link.source === drawer.node.id ? 'right' : 'left'">
                      {{ link.source === drawer.node.id ? '→' : '←' }}
                    </span>
                    <span class="target-name">{{ getNodeName(link.source === drawer.node.id ? link.target : link.source) }}</span>
                  </div>
                  <div class="rel-relation">{{ link.relation }}</div>
                </div>
              </div>
              <div v-if="getNodeLinks(drawer.node.id).length === 0" class="empty-rel">
                <span class="empty-icon">🔗</span>
                <p>暂无关联关系</p>
              </div>
            </div>
          </div>

          <!-- 拓扑控制 -->
          <div class="info-card">
            <h4>拓扑控制</h4>
            <div class="control-buttons">
              <button class="btn-expand" @click="toggleExpand(drawer.node.id)">
                {{ expandedNodes.has(drawer.node.id) ? '收起子节点' : '展开子节点' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- CRUD 弹窗 -->
    <div class="modal-mask" v-if="modal.show">
      <div class="modal-panel">
        <h3 class="modal-title">{{ modal.type === 'node' ? (isEditing ? '编辑监控资产' : '接入新资产') : '构建关联规则' }}</h3>
        
        <div class="form" v-if="modal.type === 'node'">
          <div class="row"><label>节点 ID</label><input v-model="formNode.id" :disabled="isEditing" /></div>
          <div class="row"><label>资产名称</label><input v-model="formNode.name" /></div>
          <div class="row">
            <label>资产层级</label>
            <select v-model="formNode.type">
              <option value="pm">物理服务器 (PM)</option>
              <option value="app">微服务/应用 (App)</option>
              <option value="db">数据存储 (DB)</option>
            </select>
          </div>
        </div>

        <div class="form" v-if="modal.type === 'link'">
          <div class="row"><label>源节点</label><select v-model="formLink.source"><option v-for="n in globalNodes" :value="n.id">{{ n.name }}</option></select></div>
          <div class="row"><label>目标节点</label><select v-model="formLink.target"><option v-for="n in globalNodes" :value="n.id">{{ n.name }}</option></select></div>
          <div class="row">
            <label>链路维度</label>
            <select v-model="formLink.type">
              <option value="network">底层网络专线 (Network)</option>
              <option value="deploy">软硬件部署关联 (Deploy)</option>
              <option value="service">服务API调用 (Service)</option>
            </select>
          </div>
          <div class="row"><label>健康度权重 (0-100)</label><input type="number" v-model="formLink.weight" /></div>
          <div class="row"><label>关系描述</label><input v-model="formLink.relation" /></div>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" @click="modal.show = false">取消</button>
          <button class="btn-cyan" @click="submitForm">确认保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref(null)
const chartInstance = shallowRef(null)

const expandedNodes = ref(new Set())
const searchKeyword = ref('')
const ctxMenu = reactive({ show: false, x: 0, y: 0, node: null })
const drawer = reactive({ show: false, node: null })

const modal = reactive({ show: false, type: 'node' })
const isEditing = ref(false)
const formNode = ref({ id: '', name: '', type: 'pm' })
const formLink = ref({ id: '', source: '', target: '', type: 'deploy', weight: 100, relation: '' })

// ================= 主题配置 =================
const SVG = {
  // 现代化的物理服务器图标 - 机架式服务器设计
  PM: 'path://M3,4H21A2,2,0,0,1,23,6V18A2,2,0,0,1,21,20H3A2,2,0,0,1,1,18V6A2,2,0,0,1,3,4ZM5,8H7V16H5V8ZM9,8H11V16H9V8ZM13,8H15V16H13V8ZM17,8H19V16H17V8ZM3,22H21V20H3V22Z',
  // 现代化的应用/微服务图标 - 云容器设计
  APP: 'path://M12,2C6.48,2,2,6.48,2,12C2,17.52,6.48,22,12,22C17.52,22,22,17.52,22,12C22,6.48,17.52,2,12,2ZM12,20C7.59,20,4,16.41,4,12C4,7.59,7.59,4,12,4C16.41,4,20,7.59,20,12C20,16.41,16.41,20,12,20ZM12,6C8.69,6,6,8.69,6,12C6,15.31,8.69,18,12,18C15.31,18,18,15.31,18,12C18,8.69,15.31,6,12,6ZM12,16C9.79,16,8,14.21,8,12C8,9.79,9.79,8,12,8C14.21,8,16,9.79,16,12C16,14.21,14.21,16,12,16Z',
  // 现代化的数据库图标 - 数据库立方体设计
  DB: 'path://M12,2L2,7V17L12,22L22,17V7L12,2ZM12,4.18L18.5,8L12,11.82L5.5,8L12,4.18ZM5.5,13L12,16.82L18.5,13V9.18L12,13L5.5,9.18V13ZM5.5,17L12,20.82L18.5,17V13.18L12,17L5.5,13.18V17Z'
}
const Theme = {
  pm: { color: '#22d3ee', icon: SVG.PM, label: '物理服务器', size: 52 },
  app: { color: '#818cf8', icon: SVG.APP, label: '微服务/应用', size: 40 },
  db: { color: '#fbbf24', icon: SVG.DB, label: '数据存储集群', size: 40 },
  link: { network: '#22d3ee', deploy: '#60a5fa', service: '#818cf8' }
}

// ================= 数据底座 =================
const globalNodes = ref([
  // 12台物理机
  { id: 'pm-a1', name: 'ZoneA-Host-01', type: 'pm' }, { id: 'pm-a2', name: 'ZoneA-Host-02', type: 'pm' },
  { id: 'pm-a3', name: 'ZoneA-Host-03', type: 'pm' }, { id: 'pm-a4', name: 'ZoneA-Host-04', type: 'pm' },
  { id: 'pm-b1', name: 'ZoneB-Host-01', type: 'pm' }, { id: 'pm-b2', name: 'ZoneB-Host-02', type: 'pm' },
  { id: 'pm-b3', name: 'ZoneB-Host-03', type: 'pm' }, { id: 'pm-b4', name: 'ZoneB-Host-04', type: 'pm' },
  { id: 'pm-c1', name: 'ZoneC-DR-01', type: 'pm' }, { id: 'pm-c2', name: 'ZoneC-DR-02', type: 'pm' },
  { id: 'pm-c3', name: 'ZoneC-DR-03', type: 'pm' }, { id: 'pm-c4', name: 'ZoneC-DR-04', type: 'pm' },
  // 上层应用与数据库
  { id: 'app-gw', name: 'Nginx-Gateway', type: 'app' }, { id: 'app-auth', name: 'Auth-Service', type: 'app' },
  { id: 'app-trade', name: 'Trade-Engine', type: 'app' }, { id: 'app-job', name: 'Cron-Job', type: 'app' },
  { id: 'db-master', name: 'MySQL-Master', type: 'db' }, { id: 'db-slave', name: 'MySQL-Slave', type: 'db' },
  { id: 'db-redis', name: 'Redis-Cluster', type: 'db' }
])

const globalLinks = ref([
  { id: 'l1', source: 'pm-a1', target: 'pm-a2', type: 'network', weight: 100, relation: '万兆内网' },
  { id: 'l2', source: 'pm-b1', target: 'pm-b2', type: 'network', weight: 100, relation: '万兆内网' },
  { id: 'l3', source: 'pm-a1', target: 'pm-c1', type: 'network', weight: 80, relation: '异地专线' },
  { id: 'l4', source: 'pm-a1', target: 'app-gw', type: 'deploy', weight: 100, relation: 'K8s 容器部署' },
  { id: 'l5', source: 'pm-a2', target: 'app-auth', type: 'deploy', weight: 100, relation: 'K8s 容器部署' },
  { id: 'l6', source: 'pm-b1', target: 'app-trade', type: 'deploy', weight: 90, relation: 'K8s 容器部署' },
  { id: 'l7', source: 'pm-c1', target: 'app-job', type: 'deploy', weight: 100, relation: '定时任务部署' },
  { id: 'l8', source: 'pm-a3', target: 'db-master', type: 'deploy', weight: 100, relation: '物理机直连' },
  { id: 'l9', source: 'pm-c2', target: 'db-slave', type: 'deploy', weight: 100, relation: '灾备库部署' },
  { id: 'l10', source: 'pm-b3', target: 'db-redis', type: 'deploy', weight: 100, relation: '缓存部署' },
  { id: 'l11', source: 'app-gw', target: 'app-auth', type: 'service', weight: 95, relation: '鉴权 API' },
  { id: 'l12', source: 'app-gw', target: 'app-trade', type: 'service', weight: 55, relation: '交易路由 (存延迟)' },
  { id: 'l13', source: 'app-trade', target: 'db-master', type: 'service', weight: 90, relation: 'JDBC 写库' },
  { id: 'l14', source: 'app-trade', target: 'db-redis', type: 'service', weight: 98, relation: '缓存查询' },
  { id: 'l15', source: 'db-master', target: 'db-slave', type: 'service', weight: 100, relation: 'Binlog 同步' }
])

// ================= 统计仪表盘 =================
const pmCount = computed(() => globalNodes.value.filter(n => n.type === 'pm').length)
const appCount = computed(() => globalNodes.value.filter(n => n.type === 'app').length)
const dbCount = computed(() => globalNodes.value.filter(n => n.type === 'db').length)

// ================= 实时刷新功能 =================
const refreshInterval = ref(null)
const isAutoRefresh = ref(false)

const toggleAutoRefresh = () => {
  if (isAutoRefresh.value) {
    clearInterval(refreshInterval.value)
    isAutoRefresh.value = false
  } else {
    refreshInterval.value = setInterval(() => {
      refreshData()
    }, 5000)
    isAutoRefresh.value = true
  }
}

const refreshData = () => {
  // 模拟数据更新
  const updatedNodes = [...globalNodes.value]
  updatedNodes.forEach(node => {
    if (Math.random() > 0.8) {
      node.status = Math.random() > 0.9 ? 'warning' : 'normal'
    }
  })
  globalNodes.value = updatedNodes
  renderEngine()
}

// ================= 数据导出功能 =================
const exportData = () => {
  const data = {
    nodes: globalNodes.value,
    links: globalLinks.value,
    exportTime: new Date().toLocaleString('zh-CN')
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `topology-data-${new Date().getTime()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const getNodeName = (id) => globalNodes.value.find(n => n.id === id)?.name || id
const getNodeLinks = (id) => globalLinks.value.filter(l => l.source === id || l.target === id)
const getLinkTypeName = (type) => ({ network: '网络链', deploy: '部署链', service: '服务链' }[type] || '未知')
const getDegree = (id) => getNodeLinks(id).length

// ================= 节点状态监控和告警 =================
const getNodeStatus = (nodeId) => {
  const node = globalNodes.value.find(n => n.id === nodeId)
  return node?.status || 'normal'
}

const getStatusColor = (status) => {
  switch (status) {
    case 'warning': return '#FFAC33'
    case 'error': return '#FF0844'
    default: return '#00E5FF'
  }
}

const getStatusLabel = (status) => {
  switch (status) {
    case 'warning': return '⚠️ 警告'
    case 'error': return '🔴 故障'
    default: return '● 健康在线'
  }
}

const getAlertCount = () => {
  return globalNodes.value.filter(n => n.status === 'warning' || n.status === 'error').length
}

// ================= 拓扑控制 =================
const toggleExpand = (nodeId) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
  renderEngine()
}

// ================= 【核心】：静态坐标初始化算法 =================
const initStaticPositions = () => {
  // 1. 初始化物理机坐标 (构建 3排 x 4列 的矩阵矩阵，增加间距)
  const gridX = [150, 450, 750, 1050]
  const gridY = [150, 450, 750, 1050]
  
  let pmIndex = 0
  globalNodes.value.forEach(node => {
    if (node.type === 'pm' && (node.x === undefined || node.y === undefined)) {
      node.x = gridX[pmIndex % 4]
      node.y = gridY[Math.floor(pmIndex / 4) % 4]
      node.status = 'normal' // 默认状态
      pmIndex++
    }
  })

  // 2. 初始化应用/数据库坐标 (围绕其宿主机呈圆形分布，增加半径)
  globalNodes.value.forEach(pm => {
    if (pm.type !== 'pm') return
    const childrenLinks = globalLinks.value.filter(l => l.source === pm.id && l.type === 'deploy')
    const childrenIds = childrenLinks.map(l => l.target)
    const childNodes = globalNodes.value.filter(n => childrenIds.includes(n.id))
    
    if (childNodes.length > 0) {
      const angleStep = (Math.PI * 2) / (childNodes.length)
      const radius = 160 // 增加卫星节点距离物理机的半径
      
      childNodes.forEach((child, idx) => {
        if (child.x === undefined || child.y === undefined) {
          child.x = pm.x + Math.cos(idx * angleStep - Math.PI / 2) * radius
          child.y = pm.y + Math.sin(idx * angleStep - Math.PI / 2) * radius
          child.status = 'normal' // 默认状态
        }
      })
    }
  })
}

// ================= 【核心】：坐标状态记忆机制 =================
// 拖拽后，ECharts 会在内部更新坐标。通过此函数读取最新坐标并保存，防止刷新后归位
const syncDraggedPositions = () => {
  if (!chartInstance.value) return
  try {
    const seriesData = chartInstance.value.getModel().getSeriesByIndex(0).getData()
    seriesData.each((idx) => {
      const nodeId = seriesData.getName(idx)
      const layout = seriesData.getItemLayout(idx)
      if (layout && layout.length >= 2) {
        const node = globalNodes.value.find(n => n.id === nodeId)
        if (node) {
          node.x = layout[0]
          node.y = layout[1]
        }
      }
    })
  } catch (e) {
    console.warn('Sync position skipped:', e)
  }
}

// ================= 渲染引擎 (无物理引擎版) =================
const renderEngine = () => {
  if (!chartInstance.value) return
  syncDraggedPositions() // 渲染前，先保存用户拖拽后的最新位置

  const visibleNodesMap = new Map()
  const visibleLinks =[]

  // 基础显示：所有物理机
  globalNodes.value.forEach(n => {
    if (n.type === 'pm') visibleNodesMap.set(n.id, n)
  })

  // 根据展开状态，显示子节点
  globalLinks.value.forEach(link => {
    const sExp = expandedNodes.value.has(link.source)
    const tExp = expandedNodes.value.has(link.target)
    if (sExp || tExp) {
      visibleLinks.push(link)
      if (!visibleNodesMap.has(link.source)) visibleNodesMap.set(link.source, globalNodes.value.find(n => n.id === link.source))
      if (!visibleNodesMap.has(link.target)) visibleNodesMap.set(link.target, globalNodes.value.find(n => n.id === link.target))
    } else if (visibleNodesMap.has(link.source) && visibleNodesMap.has(link.target)) {
      visibleLinks.push(link)
    }
  })

  const chartNodes = Array.from(visibleNodesMap.values()).map(n => {
    const canExpand = visibleLinks.filter(l => l.source === n.id || l.target === n.id).length < getDegree(n.id)
    const isExpanded = expandedNodes.value.has(n.id)

    return {
      ...n,
      // 必须传入 x, y 给 ECharts，才能实现 layout: 'none' 的完全静态
      x: n.x, y: n.y, 
      symbol: Theme[n.type].icon,
      symbolSize: Theme[n.type].size,
      itemStyle: { 
        color: Theme[n.type].color, 
        shadowBlur: 20, 
        shadowColor: Theme[n.type].color,
        borderColor: Theme[n.type].color, 
        borderWidth: 3 
      },
      label: {
        show: true, 
        position: 'bottom', 
        distance: 18,
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '600',
        formatter: (p) => {
          let mark = ''
          if (canExpand && !isExpanded) mark = '[+]'
          else if (isExpanded) mark = '[-]'
          return `${mark}\n${p.data.name}`
        },
        rich: { 
          plus: { color: '#22d3ee', fontWeight: 'bold' }, 
          minus: { color: '#94a3b8' } 
        }
      }
    }
  })

  const chartLinksData = visibleLinks.map(l => ({
    ...l,
    lineStyle: { 
      width: l.weight < 60 ? 3 : 2, 
      color: l.weight < 60 ? '#ef4444' : Theme.link[l.type], 
      curveness: 0.2,
      type: l.type === 'deploy' ? 'dashed' : 'solid',
      opacity: 0.9
    },
    smooth: true
  }))

  const option = {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series:[{
      type: 'graph',
      layout: 'none', // <--- 【核心】: 关闭物理引擎，变为绝对坐标静态定位
      roam: false,    // 禁用整体画布缩放和平移
      draggable: 'absolute', // 使用绝对拖拽模式，避免拖拽时的跳动
      data: chartNodes,
      links: chartLinksData
    }]
  }

  chartInstance.value.setOption(option, true)
}

// ================= 交互动作 =================
const handleNodeClick = (nodeData) => {
  ctxMenu.show = false
  if (expandedNodes.value.has(nodeData.id)) {
    expandedNodes.value.delete(nodeData.id)
  } else {
    expandedNodes.value.add(nodeData.id)
  }
  drawer.node = nodeData
  drawer.show = true
  renderEngine()
}

const resetTopology = () => {
  expandedNodes.value.clear()
  drawer.show = false
  renderEngine()
}

const searchNode = () => {
  if (!searchKeyword.value) return resetTopology()
  const idx = globalNodes.value.findIndex(n => n.name.includes(searchKeyword.value))
  if (idx !== -1) {
    expandedNodes.value.add(globalNodes.value[idx].id)
    renderEngine()
    // 由于是 none 布局，我们需要通过 dataIndex 找到对应的屏幕坐标聚焦
    chartInstance.value.dispatchAction({ type: 'focusNodeAdjacency', seriesIndex: 0, dataIndex: idx })
  }
}

// ================= CRUD 操作 =================
const closeContextMenu = () => ctxMenu.show = false

const openNodeModal = (node) => {
  ctxMenu.show = false
  modal.type = 'node'
  if (node) {
    isEditing.value = true
    formNode.value = JSON.parse(JSON.stringify(node))
  } else {
    isEditing.value = false
    formNode.value = { id: `pm-${Date.now().toString().slice(-4)}`, name: '', type: 'pm' }
  }
  modal.show = true
}

const openLinkModal = () => {
  modal.type = 'link'
  formLink.value = { id: `link-${Date.now()}`, source: '', target: '', type: 'network', weight: 100, relation: '' }
  modal.show = true
}

const deleteNode = (node) => {
  ctxMenu.show = false
  if (!confirm(`警告：确认下线节点 [${node.name}] 吗？`)) return
  globalNodes.value = globalNodes.value.filter(n => n.id !== node.id)
  globalLinks.value = globalLinks.value.filter(l => l.source !== node.id && l.target !== node.id)
  drawer.show = false
  renderEngine()
}

const submitForm = () => {
  if (modal.type === 'node') {
    if (!formNode.value.name || !formNode.value.id) return alert('ID 和名称不能为空')
    if (isEditing.value) {
      const idx = globalNodes.value.findIndex(n => n.id === formNode.value.id)
      globalNodes.value[idx] = { ...globalNodes.value[idx], ...formNode.value }
    } else {
      const newNode = JSON.parse(JSON.stringify(formNode.value))
      // 新增节点赋予默认中心坐标
      newNode.x = 600 + Math.random() * 100
      newNode.y = 400 + Math.random() * 100
      globalNodes.value.push(newNode)
    }
  } else {
    if (formLink.value.source === formLink.value.target) return alert('禁止自环关联')
    globalLinks.value.push(JSON.parse(JSON.stringify(formLink.value)))
    // 如果新增了边，可能需要重算未分配坐标的卫星节点
    initStaticPositions() 
  }
  modal.show = false
  renderEngine()
}

onMounted(() => {
  chartInstance.value = echarts.init(chartRef.value)
  
  chartInstance.value.on('click', (p) => { if (p.dataType === 'node') handleNodeClick(p.data) })
  chartInstance.value.on('contextmenu', (p) => {
    p.event.event.preventDefault()
    if (p.dataType === 'node') {
      ctxMenu.x = p.event.event.clientX
      ctxMenu.y = p.event.event.clientY
      ctxMenu.node = p.data
      ctxMenu.show = true
    }
  })
  
  // 禁用鼠标滚轮缩放，让滚轮只控制页面滚动
  const canvasDom = chartRef.value
  canvasDom.addEventListener('wheel', (e) => {
    // 移除 e.preventDefault()，让浏览器默认的页面滚动行为生效
  }, { passive: true })
  
  // 优化拖拽体验：记录拖拽状态
  let isDragging = false
  let dragStartPos = { x: 0, y: 0 }
  let dragNode = null
  
  chartInstance.value.on('dragstart', (params) => {
    if (params.dataType === 'node') {
      isDragging = true
      dragNode = params.data
      dragStartPos = { x: params.event.offsetX, y: params.event.offsetY }
    }
  })
  
  chartInstance.value.on('dragend', (params) => {
    if (params.dataType === 'node') {
      isDragging = false
      dragNode = null
    }
  })
  
  // 1. 初始化坐标系 -> 2. 渲染引擎
  initStaticPositions()
  renderEngine()

  window.addEventListener('resize', () => chartInstance.value?.resize())
})

onBeforeUnmount(() => chartInstance.value?.dispose())
</script>

<style scoped>
/* ================= 大盘监控基调：深蓝空间 ================= */
.monitor-dashboard {
  position: relative; width: 100%; min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
  color: #e2e8f0; font-family: 'Helvetica Neue', Helvetica, sans-serif;
}

.space-bg {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.15;
  background-image: 
    linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px);
  background-size: 100px 100px;
  animation: gridMove 60s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(100px, 100px); }
}

.canvas-container { 
  position: relative; 
  width: 100%; 
  min-height: 200vh;
  padding-top: 110px;
  z-index: 1;
}

/* ================= 顶部监控控制台 ================= */
.top-header {
  position: fixed; top: 0; left: 0; width: 100%; height: 110px;
  background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(15px);
  border-bottom: 2px solid rgba(6, 182, 212, 0.4); box-shadow: 0 5px 30px rgba(0,0,0,0.5);
  display: flex; justify-content: space-between; align-items: center; padding: 0 30px; z-index: 10;
}

.brand { display: flex; align-items: center; gap: 16px; }
.logo { 
  width: 44px; 
  height: 44px; 
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(37, 99, 235, 0.3)); 
  border: 2px solid rgba(6, 182, 212, 0.6); 
  border-radius: 8px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: #22d3ee; 
  font-size: 26px; 
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
  transition: 0.3s;
}
.logo:hover { box-shadow: 0 0 30px rgba(6, 182, 212, 0.8); }
.title h1 { margin: 0 0 4px 0; font-size: 22px; color: #fff; letter-spacing: 2px; font-weight: 700; }
.title p { margin: 0; font-size: 12px; color: #22d3ee; font-family: monospace; font-weight: 500; }

/* 核心监控仪表面板 */
.stats-board { display: flex; gap: 20px; }
.stat-card { 
  background: rgba(15, 23, 42, 0.8); 
  border: 2px solid rgba(6, 182, 212, 0.3); 
  padding: 12px 24px; 
  border-radius: 8px; 
  text-align: center; 
  width: 130px; 
  border-top: 3px solid; 
  box-shadow: 0 10px 20px rgba(0,0,0,0.4);
  transition: 0.3s;
}
.stat-card:hover { background: rgba(15, 23, 42, 0.9); transform: translateY(-2px); }
.stat-card.pm { border-top-color: #22d3ee; box-shadow: 0 10px 20px rgba(34, 211, 238, 0.15); }
.stat-card.app { border-top-color: #818cf8; box-shadow: 0 10px 20px rgba(129, 140, 248, 0.15); }
.stat-card.db { border-top-color: #fbbf24; box-shadow: 0 10px 20px rgba(251, 191, 36, 0.15); }
.stat-card.alert { border-top-color: #ef4444; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.15); }
.stat-card .val { font-size: 28px; font-weight: bold; color: #fff; font-family: monospace; }
.stat-card .label { font-size: 12px; color: #94a3b8; margin-top: 4px; font-weight: 500; }
.stat-card.has-alert .val { animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

/* CRUD 操作栏 */
.toolbar { display: flex; align-items: center; gap: 15px; }
.search-box { display: flex; border: 2px solid rgba(6, 182, 212, 0.4); border-radius: 4px; overflow: hidden; background: rgba(15, 23, 42, 0.8); }
.search-box input { background: transparent; border: none; padding: 8px 12px; color: #e2e8f0; outline: none; width: 180px; }
.search-box input::placeholder { color: #94a3b8; }
.search-box button { background: rgba(6, 182, 212, 0.2); border: none; color: #22d3ee; padding: 0 15px; cursor: pointer; transition: 0.3s; font-weight: 500; }
.search-box button:hover { background: rgba(6, 182, 212, 0.4); color: #fff; }

.btn-cyan { background: rgba(6, 182, 212, 0.2); border: 2px solid rgba(6, 182, 212, 0.6); color: #22d3ee; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: 0.3s; font-weight: 500; }
.btn-cyan:hover { background: rgba(6, 182, 212, 0.4); color: #fff; box-shadow: 0 0 15px rgba(34, 211, 238, 0.5); }
.btn-blue { background: rgba(37, 99, 235, 0.2); border: 2px solid rgba(37, 99, 235, 0.6); color: #60a5fa; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: 0.3s; font-weight: 500; }
.btn-blue:hover { background: rgba(37, 99, 235, 0.4); color: #fff; box-shadow: 0 0 15px rgba(96, 165, 250, 0.5); }
.btn-ghost { background: transparent; border: 2px solid rgba(148, 163, 184, 0.4); color: #94a3b8; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: 0.3s; font-weight: 500; }
.btn-ghost:hover { background: rgba(6, 182, 212, 0.1); color: #22d3ee; border-color: rgba(6, 182, 212, 0.5); }
.btn-green { background: rgba(5, 150, 105, 0.2); border: 2px solid rgba(5, 150, 105, 0.6); color: #34d399; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: 0.3s; font-weight: 500; }
.btn-green:hover { background: rgba(5, 150, 105, 0.4); color: #fff; box-shadow: 0 0 15px rgba(52, 211, 153, 0.5); }
.btn-purple { background: rgba(139, 92, 246, 0.2); border: 2px solid rgba(139, 92, 246, 0.6); color: #a78bfa; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: 0.3s; font-weight: 500; }
.btn-purple:hover { background: rgba(139, 92, 246, 0.4); color: #fff; box-shadow: 0 0 15px rgba(167, 139, 250, 0.5); }

/* ================= 鼠标右键上下文菜单 ================= */
.context-menu {
  position: fixed; background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(10px);
  border: 2px solid rgba(6, 182, 212, 0.4); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  width: 220px; z-index: 100;
}
.menu-header { padding: 10px 15px; font-size: 12px; color: #94a3b8; background: rgba(6, 182, 212, 0.1); border-bottom: 2px solid rgba(6, 182, 212, 0.2); font-weight: 500; }
.menu-item { padding: 12px 15px; font-size: 13px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-weight: 500; }
.menu-item:hover { background: rgba(6, 182, 212, 0.2); padding-left: 20px; color: #22d3ee; }
.text-danger { color: #ef4444; font-weight: 500; }
.text-danger:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; border-left: 2px solid #ef4444; }

/* ================= 右侧属性与权重抽屉面板 ================= */
.detail-drawer {
  position: fixed; top: 110px; right: 0; bottom: 0; width: 420px;
  background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(20px);
  border-left: 2px solid rgba(6, 182, 212, 0.4); box-shadow: -15px 0 40px rgba(0,0,0,0.7);
  display: flex; flex-direction: column; z-index: 50;
}
.drawer-head { padding: 20px; border-bottom: 2px solid rgba(6, 182, 212, 0.3); display: flex; justify-content: space-between; align-items: center; }
.drawer-head h3 { margin: 0; font-size: 16px; color: #e2e8f0; font-weight: 600; }
.drawer-head button { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; transition: 0.3s; font-weight: 400; }
.drawer-head button:hover { color: #22d3ee; }

.drawer-body { padding: 20px; overflow-y: auto; }
.node-hero { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
.node-icon { 
  width: 60px; 
  height: 60px; 
  border: 2px solid #22d3ee; 
  border-radius: 14px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 28px; 
  font-weight: bold; 
  background: rgba(6, 182, 212, 0.2);
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.4);
  animation: pulseIcon 3s ease-in-out infinite;
  color: #22d3ee;
}

@keyframes pulseIcon {
  0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.4); }
  50% { box-shadow: 0 0 30px rgba(34, 211, 238, 0.6); }
}
.node-title h2 { margin: 0 0 8px 0; font-size: 20px; color: #e2e8f0; letter-spacing: 1px; font-weight: 600; }
.status-tag { 
  background: rgba(5, 150, 105, 0.2); 
  border: 2px solid #34d399; 
  color: #34d399; 
  padding: 4px 12px; 
  border-radius: 6px; 
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
}
.status-tag.warning { 
  background: rgba(245, 158, 11, 0.2); 
  border: 2px solid #fbbf24; 
  color: #fbbf24;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
}
.status-tag.error { 
  background: rgba(239, 68, 68, 0.2); 
  border: 2px solid #ef4444; 
  color: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
}

.info-card { background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(6, 182, 212, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px; }
.info-card h4 { margin: 0 0 15px 0; font-size: 14px; color: #e2e8f0; border-left: 3px solid #22d3ee; padding-left: 8px; font-weight: 600; }
.info-card h4 .badge { background: #22d3ee; color: #0f172a; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 8px; font-weight: 700; }
.kv { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; border-bottom: 1px dashed rgba(6, 182, 212, 0.2); padding-bottom: 5px; }
.kv .k { color: #94a3b8; font-weight: 500; }
.kv .v { color: #e2e8f0; font-family: monospace; font-size: 14px; font-weight: 600; }

/* 关联关系网格布局 */
.relation-grid { display: grid; gap: 14px; }
.relation-item { 
  background: rgba(15, 23, 42, 0.6); 
  border: 2px solid rgba(6, 182, 212, 0.3); 
  border-radius: 10px; 
  padding: 16px; 
  transition: 0.3s;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}
.relation-item:hover { 
  border-color: rgba(6, 182, 212, 0.6); 
  background: rgba(15, 23, 42, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(34, 211, 238, 0.2);
}
.rel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.rel-type { padding: 2px 10px; font-size: 12px; border-radius: 4px; font-weight: 600; background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
.rel-weight { font-weight: 600; font-size: 13px; color: #e2e8f0; }
.rel-content { display: flex; flex-direction: column; gap: 6px; }
.rel-direction { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.icon-arrow { font-size: 16px; font-weight: bold; }
.icon-arrow.right { color: #22d3ee; }
.icon-arrow.left { color: #818cf8; }
.target-name { color: #e2e8f0; font-weight: 600; font-size: 14px; }
.rel-relation { color: #94a3b8; font-size: 12px; font-style: italic; }
.empty-rel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; color: #94a3b8; }
.empty-rel .empty-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.5; }
.empty-rel p { margin: 0; font-size: 13px; font-weight: 500; }

/* 拓扑控制按钮 */
.control-buttons { display: flex; justify-content: center; }
.btn-expand { background: rgba(6, 182, 212, 0.2); border: 2px solid rgba(6, 182, 212, 0.6); color: #22d3ee; padding: 8px 20px; border-radius: 4px; cursor: pointer; transition: 0.3s; font-size: 13px; font-weight: 500; }
.btn-expand:hover { background: rgba(6, 182, 212, 0.4); color: #fff; box-shadow: 0 0 15px rgba(34, 211, 238, 0.5); }

.slide-enter-active, .slide-leave-active { transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }

/* ================= 增删改查 Modal 弹窗 ================= */
.modal-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 200; }
.modal-panel { background: #0B1426; border: 1px solid #00E5FF; width: 480px; border-radius: 8px; padding: 25px; box-shadow: 0 15px 50px rgba(0,0,0,0.9); }
.modal-title { margin: 0 0 20px 0; color: #00E5FF; font-size: 18px; border-bottom: 1px solid rgba(0, 229, 255, 0.2); padding-bottom: 15px; }
.form { display: grid; gap: 15px; }
.row { display: flex; flex-direction: column; gap: 6px; }
.row label { font-size: 13px; color: #8F9EAB; }
.row input, .row select { background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; color: #fff; outline: none; transition: 0.3s; }
.row input:focus, .row select:focus { border-color: #00E5FF; }
.row input:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-actions { margin-top: 25px; display: flex; justify-content: flex-end; gap: 15px; }
.modal-actions button { min-width: 100px; }
</style>