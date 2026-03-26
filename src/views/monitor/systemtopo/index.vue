<template>
  <div class="topology-container">
    <div class="toolbar">
      <button @click="fetchData('machine')">机器视角</button>
      <button @click="resetView">重置视图</button>
      <span v-if="loading"> 加载中...</span>
    </div>
    <div id="mountNode" ref="mountNode"></div>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue';
import G6 from '@antv/g6';
import axios from 'axios';

const mountNode = ref(null);
const loading = ref(false);
let graph = null;

// --- 1. 配置 DeepFlow API 地址 ---
const DEEPFLOW_URL = 'http://192.168.31.34:30417/v1/query';

// --- 2. 转换数据格式：将 DeepFlow 响应转为 G6 格式 ---
const transformData = (deepflowData) => {
  const nodes = new Map();
  const edges = [];

  // 假设返回的 values 是 [[client, server, byte], ...]
  deepflowData.values.forEach(item => {
    const [source, target, value] = item;
    
    if (!nodes.has(source)) nodes.set(source, { id: source, label: source, style: { fill: '#C6E5FF' } });
    if (!nodes.has(target)) nodes.set(target, { id: target, label: target, style: { fill: '#ffccc7' } });

    edges.push({
      source,
      target,
      label: `${(value / 1024).toFixed(2)} KB/s`, // 连线显示流量
      style: { stroke: '#e2e2e2', lineWidth: Math.log(value + 1) || 1 }
    });
  });

  return { nodes: Array.from(nodes.values()), edges };
};

// --- 3. 从 DeepFlow 获取数据 ---
const fetchData = async (level = 'machine', filterHost = '') => {
  loading.value = true;
  
  // 构建 SQL：这里演示机器到机器的聚合
  let sql = `SELECT chost_0, chost_1, byte FROM flow_metrics.network_map WHERE time >= now() - 1m GROUP BY chost_0, chost_1`;
  
  // 如果是下钻模式，SQL 变为查看该机器下的所有实例
  if (level === 'detail') {
    sql = `SELECT auto_instance_0, auto_instance_1, byte FROM flow_metrics.network_map 
           WHERE (chost_0 = '${filterHost}' OR chost_1 = '${filterHost}') AND time >= now() - 1m 
           GROUP BY auto_instance_0, auto_instance_1`;
  }

  try {
    const response = await axios.post(DEEPFLOW_URL, {
      query: sql,
      db: 'flow_metrics'
    });
    
    const g6Data = transformData(response.data.result);
    graph.data(g6Data);
    graph.render();
  } catch (error) {
    console.error("DeepFlow API Error:", error);
  } finally {
    loading.value = false;
  }
};

// --- 4. 初始化 G6 图表 ---
const initGraph = () => {
  graph = new G6.Graph({
    container: 'mountNode',
    width: mountNode.value.offsetWidth,
    height: 800,
    modes: {
      default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
    },
    layout: {
      type: 'force', // 使用力导向布局，自动分布节点
      preventOverlap: true,
      linkDistance: 200,
    },
    defaultNode: {
      size: 60,
      labelCfg: { position: 'bottom', style: { fill: '#333' } },
    },
    defaultEdge: {
      style: { endArrow: true, opacity: 0.6 },
    },
  });

  // --- 5. 绑定点击下钻事件 ---
  graph.on('node:click', (evt) => {
    const nodeItem = evt.item;
    const model = nodeItem.getModel();
    console.log('点击了节点:', model.id);
    
    // 触发下钻查询：展示该机器内部的进程/Pod 拓扑
    fetchData('detail', model.id);
  });
};

onMounted(() => {
  nextTick(() => {
    initGraph();
    fetchData('machine');
  });
});

const resetView = () => fetchData('machine');
</script>

<style scoped>
.topology-container {
  width: 100%;
  height: 100vh;
  background-color: #f8f9fa;
}
.toolbar {
  padding: 10px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}
#mountNode {
  width: 100%;
  height: calc(100% - 50px);
}
</style>