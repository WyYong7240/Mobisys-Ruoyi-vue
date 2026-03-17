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
          <h3>资产遥测与链路权重</h3>
          <button @click="drawer.show = false">✕</button>
        </div>
        
        <div class="drawer-body">
          <div class="node-hero">
            <div class="node-icon" :style="{ color: Theme[drawer.node.type].color, borderColor: Theme[drawer.node.type].color }">
              {{ Theme[drawer.node.type].label[0] }}
            </div>
            <div class="node-title">
              <h2>{{ drawer.node.name }}</h2>
              <span class="status-tag">● 健康在线</span>
            </div>
          </div>

          <div class="info-card">
            <h4>基础配置档案 (Metadata)</h4>
            <div class="kv"><span class="k">节点 ID:</span> <span class="v">{{ drawer.node.id }}</span></div>
            <div class="kv"><span class="k">资产层级:</span> <span class="v" :style="{color: Theme[drawer.node.type].color}">{{ Theme[drawer.node.type].label }}</span></div>
          </div>

          <!-- 链路及权重清单 -->
          <div class="info-card">
            <h4>全维度关联关系清单 (Links & Weights)</h4>
            <ul class="relation-list">
              <li v-for="link in getNodeLinks(drawer.node.id)" :key="link.id">
                <div class="rel-top">
                  <span class="rel-type" :style="{ backgroundColor: Theme.link[link.type] + '22', color: Theme.link[link.type] }">
                    {{ getLinkTypeName(link.type) }}
                  </span>
                  <span class="rel-weight" :class="link.weight < 60 ? 'text-danger' : 'text-success'">
                    权重 W:{{ link.weight }}
                  </span>
                </div>
                <div class="rel-bottom">
                  <span class="dir">{{ link.source === drawer.node.id ? '发往 ➔' : '来自 ⇦' }}</span>
                  <span class="target">{{ getNodeName(link.source === drawer.node.id ? link.target : link.source) }}</span>
                </div>
              </li>
              <li v-if="getNodeLinks(drawer.node.id).length === 0" class="empty">暂无任何关联链路配置</li>
            </ul>
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
  PM: 'path://M4,2H20A2,2,0,0,1,22,4V8A2,2,0,0,1,20,10H4A2,2,0,0,1,2,8V4A2,2,0,0,1,4,2ZM4,14H20A2,2,0,0,1,22,16V20A2,2,0,0,1,20,22H4A2,2,0,0,1,2,20V16A2,2,0,0,1,4,14Z',
  APP: 'path://M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6H19c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04Z',
  DB: 'path://M12,2C6.48,2,2,4.02,2,6.5V17.5C2,19.98,6.48,22,12,22S22,19.98,22,17.5V6.5C22,4.02,17.52,2,12,2ZM12,5.5C16.42,5.5,20,6.62,20,8S16.42,10.5,12,10.5S4,9.38,4,8S7.58,5.5,12,5.5ZM12,19.5C7.58,19.5,4,18.38,4,17V12.78C5.61,13.85,8.61,14.5,12,14.5S18.39,13.85,20,12.78V17C20,18.38,16.42,19.5,12,19.5Z'
}
const Theme = {
  pm: { color: '#00E5FF', icon: SVG.PM, label: '物理服务器', size: 60 },
  app: { color: '#B088FF', icon: SVG.APP, label: '微服务/应用', size: 45 },
  db: { color: '#FFAC33', icon: SVG.DB, label: '数据存储集群', size: 45 },
  link: { network: '#00E5FF', deploy: '#0A84FF', service: '#B088FF' }
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

const getNodeName = (id) => globalNodes.value.find(n => n.id === id)?.name || id
const getNodeLinks = (id) => globalLinks.value.filter(l => l.source === id || l.target === id)
const getLinkTypeName = (type) => ({ network: '网络链', deploy: '部署链', service: '服务链' }[type] || '未知')
const getDegree = (id) => getNodeLinks(id).length

// ================= 【核心】：静态坐标初始化算法 =================
const initStaticPositions = () => {
  // 1. 初始化物理机坐标 (构建 3排 x 4列 的矩阵矩阵)
  const gridX =[200, 450, 700, 950]
  const gridY = [200, 450, 700]
  
  let pmIndex = 0
  globalNodes.value.forEach(node => {
    if (node.type === 'pm' && (node.x === undefined || node.y === undefined)) {
      node.x = gridX[pmIndex % 4]
      node.y = gridY[Math.floor(pmIndex / 4) % 3]
      pmIndex++
    }
  })

  // 2. 初始化应用/数据库坐标 (围绕其宿主机呈圆形分布)
  globalNodes.value.forEach(pm => {
    if (pm.type !== 'pm') return
    const childrenLinks = globalLinks.value.filter(l => l.source === pm.id && l.type === 'deploy')
    const childrenIds = childrenLinks.map(l => l.target)
    const childNodes = globalNodes.value.filter(n => childrenIds.includes(n.id))
    
    const angleStep = (Math.PI * 2) / (childNodes.length || 1)
    childNodes.forEach((child, idx) => {
      if (child.x === undefined || child.y === undefined) {
        const radius = 130 // 卫星节点距离物理机的半径
        child.x = pm.x + Math.cos(idx * angleStep) * radius
        child.y = pm.y + Math.sin(idx * angleStep) * radius
      }
    })
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
      itemStyle: { color: Theme[n.type].color, shadowBlur: 20, shadowColor: Theme[n.type].color, borderColor: 'rgba(255,255,255,0.8)', borderWidth: 1 },
      label: {
        show: true, position: 'bottom', distance: 10,
        formatter: (p) => {
          let mark = ''
          if (canExpand && !isExpanded) mark = '{plus|[+]} '
          else if (isExpanded) mark = '{minus|[-]} '
          return `${mark}{text|${p.data.name}}`
        },
        rich: { plus: { color: '#00E5FF', fontWeight: 'bold' }, minus: { color: '#8b949e' }, text: { color: '#e0e6ed', fontSize: 13 } }
      }
    }
  })

  const chartLinksData = visibleLinks.map(l => ({
    ...l,
    lineStyle: { width: l.weight < 60 ? 4 : 2, color: l.weight < 60 ? '#FF0844' : Theme.link[l.type], curveness: 0.15, type: l.type === 'deploy' ? 'dashed' : 'solid' }
  }))

  const option = {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series:[{
      type: 'graph',
      layout: 'none', // <--- 【核心】: 关闭物理引擎，变为绝对坐标静态定位
      roam: true,     // 允许整体画布缩放和平移
      draggable: true,// 允许鼠标拖拽单个节点
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 8],
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
  position: relative; width: 100%; height: 100vh;
  background: radial-gradient(circle at center, #0B1426 0%, #03060C 100%);
  color: #e0e6ed; font-family: 'Helvetica Neue', Helvetica, sans-serif; overflow: hidden;
}

.space-bg {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.1;
  background-image: linear-gradient(rgba(0, 229, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 1) 1px, transparent 1px);
  background-size: 60px 60px;
}

.canvas-container { position: absolute; top: 110px; left: 0; right: 0; bottom: 0; z-index: 1; }

/* ================= 顶部监控控制台 ================= */
.top-header {
  position: absolute; top: 0; left: 0; width: 100%; height: 110px;
  background: rgba(11, 20, 38, 0.85); backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(0, 229, 255, 0.15); box-shadow: 0 5px 30px rgba(0,0,0,0.5);
  display: flex; justify-content: space-between; align-items: center; padding: 0 30px; z-index: 10;
}

.brand { display: flex; align-items: center; gap: 16px; }
.logo { width: 44px; height: 44px; background: rgba(0, 229, 255, 0.1); border: 1px solid #00E5FF; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #00E5FF; font-size: 26px; box-shadow: 0 0 15px rgba(0, 229, 255, 0.3); }
.title h1 { margin: 0 0 4px 0; font-size: 22px; color: #fff; letter-spacing: 2px; }
.title p { margin: 0; font-size: 12px; color: #00E5FF; font-family: monospace; }

/* 核心监控仪表面板 */
.stats-board { display: flex; gap: 20px; }
.stat-card { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); padding: 12px 24px; border-radius: 8px; text-align: center; width: 130px; border-top: 3px solid; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
.stat-card.pm { border-top-color: #00E5FF; }
.stat-card.app { border-top-color: #B088FF; }
.stat-card.db { border-top-color: #FFAC33; }
.stat-card .val { font-size: 28px; font-weight: bold; color: #fff; font-family: monospace; }
.stat-card .label { font-size: 12px; color: #8F9EAB; margin-top: 4px; }

/* CRUD 操作栏 */
.toolbar { display: flex; align-items: center; gap: 15px; }
.search-box { display: flex; border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 4px; overflow: hidden; }
.search-box input { background: rgba(0,0,0,0.4); border: none; padding: 8px 12px; color: #fff; outline: none; width: 180px; }
.search-box button { background: rgba(0, 229, 255, 0.1); border: none; color: #00E5FF; padding: 0 15px; cursor: pointer; }

.btn-cyan { background: rgba(0, 229, 255, 0.1); border: 1px solid #00E5FF; color: #00E5FF; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: 0.3s; }
.btn-cyan:hover { background: #00E5FF; color: #000; box-shadow: 0 0 15px rgba(0, 229, 255, 0.5); }
.btn-blue { background: rgba(10, 132, 255, 0.1); border: 1px solid #0A84FF; color: #0A84FF; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: 0.3s; }
.btn-blue:hover { background: #0A84FF; color: #fff; }
.btn-ghost { background: transparent; border: 1px solid #3b4252; color: #8F9EAB; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.btn-ghost:hover { background: rgba(255,255,255,0.05); color: #fff; }

/* ================= 鼠标右键上下文菜单 ================= */
.context-menu {
  position: fixed; background: rgba(13, 20, 33, 0.95); backdrop-filter: blur(10px);
  border: 1px solid #30363d; border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.8);
  width: 220px; z-index: 100;
}
.menu-header { padding: 10px 15px; font-size: 12px; color: #8F9EAB; background: #080d16; border-bottom: 1px solid #30363d; }
.menu-item { padding: 12px 15px; font-size: 13px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 10px; color: #c9d1d9; }
.menu-item:hover { background: rgba(255,255,255,0.05); padding-left: 20px; }
.text-danger { color: #FF0844; }
.text-danger:hover { background: rgba(255, 8, 68, 0.1); color: #FF0844; border-left: 2px solid #FF0844; }

/* ================= 右侧属性与权重抽屉面板 ================= */
.detail-drawer {
  position: absolute; top: 110px; right: 0; bottom: 0; width: 420px;
  background: rgba(11, 20, 38, 0.95); backdrop-filter: blur(20px);
  border-left: 1px solid rgba(0, 229, 255, 0.2); box-shadow: -15px 0 40px rgba(0,0,0,0.7);
  display: flex; flex-direction: column; z-index: 50;
}
.drawer-head { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
.drawer-head h3 { margin: 0; font-size: 16px; color: #fff; }
.drawer-head button { background: none; border: none; color: #8F9EAB; font-size: 20px; cursor: pointer; }

.drawer-body { padding: 20px; overflow-y: auto; }
.node-hero { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
.node-icon { width: 50px; height: 50px; border: 2px solid; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; background: rgba(255,255,255,0.05); }
.node-title h2 { margin: 0 0 6px 0; font-size: 18px; color: #fff; }
.status-tag { background: rgba(50, 215, 75, 0.1); border: 1px solid #32D74B; color: #32D74B; padding: 2px 8px; border-radius: 4px; font-size: 12px; }

.info-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 20px; }
.info-card h4 { margin: 0 0 15px 0; font-size: 14px; color: #c9d1d9; border-left: 3px solid #00E5FF; padding-left: 8px; }
.kv { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 5px; }
.kv .k { color: #8F9EAB; }
.kv .v { color: #fff; font-family: monospace; font-size: 14px; }

/* 权重与关系列表 */
.relation-list { list-style: none; padding: 0; margin: 0; }
.relation-list li { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 12px; margin-bottom: 10px; border-radius: 6px; }
.relation-list .empty { background: transparent; border: none; color: #8F9EAB; font-style: italic; font-size: 13px; text-align: center; }
.rel-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.rel-type { padding: 2px 8px; font-size: 12px; border-radius: 4px; }
.rel-weight { font-weight: bold; font-size: 13px; }
.text-success { color: #32D74B; }
.text-danger { color: #FF0844; }
.rel-bottom { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.rel-bottom .dir { color: #8F9EAB; }
.rel-bottom .target { color: #fff; font-weight: bold; }

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
</style>