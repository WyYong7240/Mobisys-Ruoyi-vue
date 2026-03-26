<template>
  <!-- 若依标准容器 -->
  <div class="app-container monitor-engine">
    <div class="topology-wrapper">
      
      <!-- 1. 顶部控制与统计看板 (实现文档第8条: 快速查询展示) -->
      <div class="topology-header">
        <div class="header-left">
          <div class="stats-box">
            <div class="stat-item">
              <span class="label">节点总数</span>
              <span class="value">{{ totalNodeCount }}</span>
            </div>
            <div class="stat-item">
              <span class="label">告警单元</span>
              <span class="value warning">0</span>
            </div>
          </div>
          <el-input
            v-model="searchKey"
            placeholder="搜索服务或节点..."
            prefix-icon="Search"
            class="search-input"
            clearable
            @input="handleSearch"
          />
        </div>

        <div class="header-right">
          <div class="chain-filters">
            <el-checkbox-group v-model="activeChains" @change="render">
              <el-checkbox label="service">服务链</el-checkbox>
              <el-checkbox label="deploy">部署链</el-checkbox>
              <el-checkbox label="network">网络链</el-checkbox>
            </el-checkbox-group>
          </div>
          <el-button-group>
            <el-button type="primary" plain icon="Refresh" @click="resetView">重置视角</el-button>
            <el-button type="primary" icon="Plus" @click="mockAddNode">接入节点</el-button>
          </el-button-group>
        </div>
      </div>

      <div class="topology-main">
        <!-- 2. 画布区域 -->
        <div class="canvas-container">
          <div class="cyber-overlay">
            <div class="grid"></div>
            <div class="scanline"></div>
          </div>
          <!-- Loading 状态 -->
          <div class="loading-overlay" v-if="loading">
            <el-loading text="正在加载数据..." spinner="el-icon-loading" background-color="rgba(0,0,0,0.8)">
              <div class="loading-text">正在渲染拓扑图...</div>
            </el-loading>
          </div>
          <!-- 空状态 -->
          <div class="empty-state" v-else-if="filteredNodes.length === 0 && searchKey">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">未找到匹配的节点</div>
            <div class="empty-subtext">请尝试修改搜索关键词</div>
          </div>
          <!-- 画布挂载点 -->
          <div ref="chartRef" class="echarts-dom"></div>
        </div>

        <!-- 3. 影响分析面板 (实现文档第8条: 影响分析功能) -->
        <Transition name="slide">
          <div class="impact-panel" v-if="selectedNode">
            <div class="panel-header">
              <span class="title">影响分析 / IMPACT</span>
              <el-button link icon="Close" @click="selectedNode = null"></el-button>
            </div>
            
            <div class="panel-body">
              <div class="node-info">
                <div class="node-name">{{ selectedNode.name }}</div>
                <div class="node-id">UID: {{ selectedNode.id }}</div>
                <el-tag size="small" effect="dark">{{ getTypeName(selectedNode.type) }}</el-tag>
              </div>

              <el-divider>链路解析与规则引擎</el-divider>
              
              <div class="impact-stats">
                <div class="i-item">
                  <label>上游依赖</label>
                  <p>{{ getNodeDependencies(selectedNode.id).length }} 节点</p>
                </div>
                <div class="i-item">
                  <label>下游受损</label>
                  <p class="red">{{ getDependentNodes(selectedNode.id).length }} 节点</p>
                </div>
              </div>

              <div class="weight-rule">
                <div class="w-label">关联规则权重匹配 (Rule Match)</div>
                <el-progress :percentage="88" color="#00f5ff" />
                <p class="w-desc">已自动标记链路权重，判定标准：标准化可追溯服务调用树。</p>
              </div>

              <div class="node-ops">
                <el-button type="primary" block @click="drillDown">层级下钻 (Drill-Down)</el-button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';

const chartRef = ref(null);
let myChart = null;
const searchKey = ref('');
const activeChains = ref(['service', 'deploy', 'network']);
const selectedNode = ref(null);
const expandedNodes = ref(new Set());
const loading = ref(true); // 仅在初次加载时展示

// --- 常量配置 ---
const NODE_TYPES = {
  pm: { name: '物理机', color: '#00f5ff', symbol: 'rect' },
  service: { name: '服务链', color: '#a855f7', symbol: 'circle' },
  deploy: { name: '部署链', color: '#ff9f43', symbol: 'diamond' },
  network: { name: '网络链', color: '#00d2ff', symbol: 'triangle' }
};

const COLORS = {
  pm: '#00f5ff',
  service: '#a855f7',
  deploy: '#ff9f43',
  network: '#00d2ff'
};

// --- 模拟数据 (x, y 仅为初始百分比) ---
const rawNodes = ref([
  { id: 'p1', name: '核心物理机-A', type: 'pm', x: 20, y: 50 },
  { id: 'p2', name: '计算物理机-B', type: 'pm', x: 50, y: 30 },
  { id: 'p3', name: '存储物理机-C', type: 'pm', x: 80, y: 50 },
  
  // 隐藏的子链路节点
  { id: 's1', name: 'Order-Service', type: 'service', parent: 'p1' },
  { id: 's2', name: 'Payment-Service', type: 'service', parent: 'p1' },
  { id: 'd1', name: 'Docker-App-01', type: 'deploy', parent: 'p2' },
  { id: 'n1', name: 'VLAN-Net-X', type: 'network', parent: 'p3' },
]);

const rawLinks = [
  { source: 'p1', target: 's1', type: 'service' },
  { source: 'p1', target: 's2', type: 'service' },
  { source: 'p2', target: 'd1', type: 'deploy' },
  { source: 'p3', target: 'n1', type: 'network' },
  { source: 's1', target: 'p2', type: 'service' }
];

// --- 计算属性 ---
const totalNodeCount = computed(() => rawNodes.value.length);

const filteredNodes = computed(() => {
  const key = searchKey.value.toLowerCase();
  return rawNodes.value.filter(n => {
    if (!key) return true;
    return n.name.toLowerCase().includes(key);
  });
});

const getNodeDependencies = (nodeId) => rawLinks.filter(l => l.target === nodeId).map(l => l.source);
const getDependentNodes = (nodeId) => rawLinks.filter(l => l.source === nodeId).map(l => l.target);
const getTypeName = (t) => NODE_TYPES[t]?.name || '未知';

// --- 核心突破：直接从 ECharts 底层引擎获取拖拽后的最新物理坐标 ---
const syncPositionsFromEcharts = () => {
  if (!myChart) return;
  try {
    const seriesModel = myChart.getModel().getSeriesByIndex(0);
    if (!seriesModel) return;
    const data = seriesModel.getData();
    
    // 遍历当前图表上已经渲染的节点，抓取真实坐标
    data.each((dataIndex) => {
      const rawItem = data.getRawDataItem(dataIndex);
      const layout = data.getItemLayout(dataIndex); // 隐藏API：获取节点当前的 [x, y] 逻辑坐标
      if (rawItem && layout && !isNaN(layout[0])) {
        const node = rawNodes.value.find(n => n.id === rawItem.id);
        if (node) {
          node.absX = layout[0];
          node.absY = layout[1];
          node._init = true; // 标记此节点已被赋予绝对坐标，不可再被重置
        }
      }
    });
  } catch (e) {
    console.warn("坐标同步失败", e);
  }
};

// --- 差分更新图表（绝对静默，不重绘整个组件） ---
const updateGraph = () => {
  if (!myChart) return;

  // 1. 在变动画布前，先从图表内部“抓取”所有拖拽后的真实位置存入 rawNodes
  syncPositionsFromEcharts();

  const width = chartRef.value.clientWidth || 800;
  const height = chartRef.value.clientHeight || 600;

  // 2. 过滤需要展示的节点
  let displayNodes = rawNodes.value.filter(n => {
    if (n.type === 'pm') return true;
    if (!activeChains.value.includes(n.type)) return false;
    if (!expandedNodes.value.has(n.parent)) return false;
    return true;
  });

  if (searchKey.value) {
    const key = searchKey.value.toLowerCase();
    displayNodes = displayNodes.filter(n => n.name.toLowerCase().includes(key));
  }

  // 3. 将节点分配为 ECharts 需要的格式
  const finalNodes = displayNodes.map(n => {
    // 【核心】如果节点还没有计算过绝对坐标，则进行计算分配
    if (!n._init) {
      if (n.type === 'pm') {
        // 物理机初始位置
        n.absX = (n.x / 100) * width;
        n.absY = (n.y / 100) * height;
      } else {
        // 子节点在首次展开时，随机散布在父节点周围
        const parent = rawNodes.value.find(p => p.id === n.parent);
        if (parent && parent._init) {
          n.absX = parent.absX + (Math.random() - 0.5) * 120;
          n.absY = parent.absY + 80;
        } else {
          n.absX = width / 2;
          n.absY = height / 2;
        }
      }
      n._init = true;
    }

    return {
      id: n.id,
      name: n.name,
      type: n.type,
      x: n.absX,  // 强制使用计算过或拖拽后的绝对坐标
      y: n.absY,
      symbolSize: n.type === 'pm' ? 60 : 45,
      symbol: NODE_TYPES[n.type]?.symbol || 'circle',
      itemStyle: {
        color: COLORS[n.type],
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 15,
        shadowColor: COLORS[n.type]
      }
    };
  });

  const nodeIds = new Set(finalNodes.map(n => n.id));
  const finalLinks = rawLinks.filter(l => 
    nodeIds.has(l.source) && 
    nodeIds.has(l.target) && 
    activeChains.value.includes(l.type)
  );

  // 4. 【核心】只传入需要更新的 series 数据
  // 此时 ECharts 会利用默认的 Merge 机制，自动对节点进行差分过渡动画，绝不会重置视角的平移和缩放
  myChart.setOption({
    series: [{
      data: finalNodes,
      links: finalLinks
    }]
  });
};

// --- 初始化与交互 ---
const initChart = () => {
  myChart = echarts.init(chartRef.value, null, { devicePixelRatio: 2 });
  
  // 仅在初始化时设定一次全局样式（ToolTip、漫游、全局设定等）
  myChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      show: true,
      trigger: 'item',
      backgroundColor: 'rgba(10,25,50,0.8)',
      borderColor: '#00f5ff',
      textStyle: { color: '#fff' },
      formatter: (params) => {
        if (params.dataType !== 'node') return '';
        const node = params.data;
        return `<div style="color:#fff">
          <strong>${node.name}</strong><br/>
          类型: ${getTypeName(node.type)}<br/>
          ID: ${node.id}
        </div>`;
      }
    },
    series: [{
      type: 'graph',
      layout: 'none',
      roam: true,
      draggable: true,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 10],
      label: { show: true, position: 'bottom', color: '#fff', fontSize: 12 },
      lineStyle: { width: 3, color: 'rgba(255,255,255,0.3)', curveness: 0.15 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 5, color: '#00f5ff' } },
      data: [],
      links: []
    }]
  });

  // 开始填充数据并渲染
  updateGraph();
  loading.value = false; // 移除全局首次加载遮罩

  // 监听点击事件，只处理展开/收缩，局部无刷新
  myChart.on('click', (params) => {
    if (params.dataType === 'node') {
      const nodeData = params.data;
      // 显示右侧影响分析面板
      selectedNode.value = rawNodes.value.find(n => n.id === nodeData.id);

      // 处理物理机的子节点展开收缩
      if (nodeData.type === 'pm') {
        if (expandedNodes.value.has(nodeData.id)) {
          expandedNodes.value.delete(nodeData.id);
        } else {
          expandedNodes.value.add(nodeData.id);
        }
        // 调用局部更新函数，此时你的位置将纹丝不动，只会以动画形式长出/收回新节点
        updateGraph(); 
      }
    }
  });
};

const handleSearch = () => updateGraph();

const resetView = () => {
  expandedNodes.value.clear();
  searchKey.value = '';
  // 强制还原物理机的初始百分比位置，并重置视图缩放
  rawNodes.value.forEach(n => n._init = false); 
  myChart.dispatchAction({ type: 'restore' });
  updateGraph();
};

const mockAddNode = () => ElMessage.success('正在接入新的物理资源...');
const drillDown = () => ElMessage.info('正在下钻至具体微服务实例...');

onMounted(() => {
  nextTick(() => {
    setTimeout(initChart, 300);
  });
  window.addEventListener('resize', () => {
    myChart?.resize();
    updateGraph();
  });
});

onUnmounted(() => {
  myChart?.dispose();
});
</script>

<style scoped lang="scss">
/* 适配若依标准布局 */
.monitor-engine.app-container {
  padding: 0;
  background-color: #02060f;
  height: calc(100vh - 84px);
  overflow: hidden;
  color: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topology-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 顶部控制面板 */
.topology-header {
  height: 80px;
  padding: 0 30px;
  background: rgba(10, 25, 50, 0.9);
  border-bottom: 1px solid rgba(0, 245, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;

  .header-left {
    display: flex;
    align-items: center;
    gap: 30px;

    .stats-box {
      display: flex;
      gap: 20px;
      .stat-item {
        display: flex;
        flex-direction: column;
        .label { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
        .value { font-family: 'Orbitron', sans-serif; font-size: 22px; font-weight: bold; color: #00f5ff; }
        .warning { color: #f56c6c; }
      }
    }
    .search-input { width: 240px; }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 25px;
    
    .chain-filters {
      :deep(.el-checkbox) { color: rgba(255,255,255,0.7); }
    }
  }
}

/* 画布主区 */
.topology-main {
  flex: 1;
  position: relative;
  display: flex;

  .canvas-container {
    flex: 1;
    position: relative;
    
    .cyber-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      .grid {
        width: 100%; height: 100%;
        background-image: 
          linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px);
        background-size: 50px 50px;
      }
      .scanline {
        position: absolute;
        top: 0; left: 0; width: 100%; height: 4px;
        background: linear-gradient(to bottom, transparent, rgba(0, 245, 255, 0.2), transparent);
        animation: scanning 10s linear infinite;
      }
    }

    .echarts-dom {
      width: 100%;
      height: 100%;
      z-index: 5;
    }
  }
}

/* 影响分析侧边面板 (文档第8条) */
.impact-panel {
  position: absolute;
  right: 20px;
  top: 20px;
  bottom: 20px;
  width: 320px;
  background: rgba(8, 15, 30, 0.95);
  border: 1px solid rgba(0, 245, 255, 0.4);
  border-radius: 12px;
  backdrop-filter: blur(20px);
  z-index: 200;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 30px rgba(0,0,0,0.5);

  .panel-header {
    padding: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex; justify-content: space-between; align-items: center;
    .title { font-weight: bold; font-size: 14px; color: #00f5ff; }
  }

  .panel-body {
    padding: 25px;
    
    .node-info {
      margin-bottom: 25px;
      .node-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
      .node-id { font-size: 11px; opacity: 0.4; margin-bottom: 12px; font-family: monospace; }
    }

    .impact-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      .i-item {
        label { font-size: 12px; opacity: 0.5; display: block; margin-bottom: 8px; }
        p { font-size: 18px; font-weight: bold; margin: 0; }
        .red { color: #f56c6c; }
      }
    }

    .weight-rule {
      .w-label { font-size: 12px; margin-bottom: 12px; color: #ff9f43; }
      .w-desc { font-size: 11px; opacity: 0.5; line-height: 1.6; margin-top: 15px; }
    }

    .node-ops {
      margin-top: 40px;
      .el-button { width: 100%; height: 45px; border-radius: 8px; font-weight: bold; }
    }
  }
}

@keyframes scanning {
  0% { transform: translateY(0); }
  100% { transform: translateY(800px); }
}

/* 过渡 */
.slide-enter-active, .slide-leave-active { transition: all 0.4s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(350px); opacity: 0; }

/* Loading 状态 */
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  
  :deep(.el-loading-spinner) {
    .path { stroke: #00f5ff !important; }
    .circle { stroke: #00f5ff !important; }
  }
  
  .loading-text {
    margin-top: 15px;
    font-size: 12px;
    color: rgba(255,255,255,0.7);
  }
}

/* 空状态 */
.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 8;
  
  .empty-icon {
    font-size: 60px;
    opacity: 0.3;
    margin-bottom: 20px;
  }
  
  .empty-text {
    font-size: 16px;
    color: rgba(255,255,255,0.6);
    margin-bottom: 8px;
  }
  
  .empty-subtext {
    font-size: 12px;
    color: rgba(255,255,255,0.4);
  }
}

/* 若依 ElementPlus 样式微调 */
:deep(.el-input__wrapper) {
  background-color: rgba(0,0,0,0.3) !important;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.1) inset !important;
}
:deep(.el-input__inner) { color: #fff !important; }
:deep(.el-tag) { background: rgba(0, 245, 255, 0.1); border-color: #00f5ff; color: #00f5ff; }
:deep(.el-divider__text) { background-color: transparent !important; color: rgba(255,255,255,0.3); font-size: 11px; }
</style>