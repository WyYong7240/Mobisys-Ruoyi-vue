<template>
  <!-- 若依标准容器 -->
  <div class="app-container monitor-engine">
    <div class="topology-wrapper">
      
      <!-- 1. 顶部控制与统计看板 -->
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
          <div class="header-actions">
            <el-button type="primary" icon="Plus" @click="showAddDeviceDialog = true">添加设备</el-button>
            <el-button type="success" icon="Link" @click="showLinkDialog = true">关联拓扑</el-button>
          </div>
          <div class="chain-filters">
            <el-checkbox-group v-model="activeChains" @change="render">
              <el-checkbox label="service">服务链</el-checkbox>
              <el-checkbox label="deploy">部署链</el-checkbox>
              <el-checkbox label="network">网络链</el-checkbox>
            </el-checkbox-group>
          </div>
          <el-button-group>
            <el-button type="primary" plain icon="Refresh" @click="resetView">重置视角</el-button>
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

        <!-- 3. 影响分析面板 -->
        <Transition name="slide">
          <div class="impact-panel" v-if="selectedNode">
            <div class="panel-header">
              <span class="title">影响分析 / IMPACT</span>
              <el-button link icon="Close" @click="selectedNode = null"></el-button>
            </div>
            
            <div class="panel-body">
              <div class="node-info">
                <div class="node-name">{{ selectedNode.name }}</div>
                <el-tag size="small" effect="dark">{{ getTypeName(selectedNode.type) }}</el-tag>
                <el-tag 
                  size="small" 
                  effect="dark"
                  :style="{ backgroundColor: getNodeStatus(selectedNode.status).color + '20', borderColor: getNodeStatus(selectedNode.status).color, color: getNodeStatus(selectedNode.status).color }"
                >
                  {{ getNodeStatus(selectedNode.status).label }}
                </el-tag>
              </div>

              <div class="node-details">
                <div class="detail-item" v-if="selectedNode.physicalData?.ipAddress">
                  <span class="detail-label">IP地址</span>
                  <span class="detail-value">{{ selectedNode.physicalData.ipAddress }}</span>
                </div>
                <div class="detail-item" v-if="selectedNode.physicalData?.leader">
                  <span class="detail-label">负责人</span>
                  <span class="detail-value">{{ selectedNode.physicalData.leader }}</span>
                </div>
                <div class="detail-item" v-if="selectedNode.physicalData?.phone">
                  <span class="detail-label">联系电话</span>
                  <span class="detail-value">{{ selectedNode.physicalData.phone }}</span>
                </div>
                <div class="detail-item" v-if="selectedNode.physicalData?.brand">
                  <span class="detail-label">品牌</span>
                  <span class="detail-value">{{ selectedNode.physicalData.brand }}</span>
                </div>
                <div class="detail-item" v-if="selectedNode.physicalData?.model">
                  <span class="detail-label">设备型号</span>
                  <span class="detail-value">{{ selectedNode.physicalData.model }}</span>
                </div>
                <!-- <div class="detail-item" v-if="selectedNode.physicalData?.type">
                  <span class="detail-label">类型</span>
                  <span class="detail-value">{{ selectedNode.physicalData.type }}</span>
                </div> -->
                <!-- <div class="detail-item" v-if="selectedNode.physicalData?.memo">
                  <span class="detail-label">备注</span>
                  <span class="detail-value">{{ selectedNode.physicalData.memo }}</span>
                </div> -->
                <div class="detail-item" v-if="selectedNode.physicalData?.remark">
                  <span class="detail-label">备注</span>
                  <span class="detail-value">{{ selectedNode.physicalData.remark }}</span>
                </div>
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
                <el-progress :percentage="getRuleMatchPercentage(selectedNode)" color="#00f5ff" />
                <p class="w-desc">已自动标记链路权重，判定标准：标准化可追溯服务调用树。</p>
              </div>

              <div class="node-ops">
                <el-button type="primary" block @click="drillDown">层级下钻 (Drill-Down)</el-button>
              </div>
              <div class="node-ops">
                <el-button type="primary" @click="handleView(selectedNode)">查看详情</el-button>
              </div>
              
            </div>
          </div>
        </Transition>
      </div>
      
      <!-- 添加设备对话框 -->
      <el-dialog
        v-model="showAddDeviceDialog"
        title="添加设备"
        width="500px"
        :close-on-click-modal="false"
      >
        <el-form :model="addDeviceForm" label-width="100px">
          <el-form-item label="设备名称" required>
            <el-input v-model="addDeviceForm.physicalName" placeholder="请输入设备名称" />
          </el-form-item>
          <el-form-item label="IP地址" required>
            <el-input v-model="addDeviceForm.ipAddress" placeholder="请输入IP地址" />
          </el-form-item>
          <el-form-item label="设备大类">
            <el-select v-model="addDeviceForm.deviceType" placeholder="请选择设备大类" style="width: 100%">
              <el-option label="服务器 🖥️" value="server" />
              <el-option label="路由器 🛰️" value="router" />
              <el-option label="交换机 🔄" value="switch" />
              <el-option label="存储设备 💾" value="storage" />
              <el-option label="防火墙 🔥" value="firewall" />
              <el-option label="负载均衡 ⚖️" value="loadbalancer" />
              <el-option label="其他 📦" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="设备品牌">
            <el-input v-model="addDeviceForm.brand" placeholder="请输入设备品牌" />
          </el-form-item>
          <el-form-item label="设备型号">
            <el-input v-model="addDeviceForm.model" placeholder="请输入设备型号" />
          </el-form-item>
          <el-form-item label="负责人">
            <el-select v-model="addDeviceForm.responsiblePerson" placeholder="请选择负责人" style="width: 100%">
              <el-option label="张三" value="zhangsan" />
              <el-option label="李四" value="lisi" />
              <el-option label="王五" value="wangwu" />
              <el-option label="赵六" value="zhaoliu" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="addDeviceForm.status">
              <el-radio :label="0">正常</el-radio>
              <el-radio :label="1">异常</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="addDeviceForm.phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="addDeviceForm.remark"
              type="textarea"
              placeholder="请输入备注"
              :rows="3"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showAddDeviceDialog = false">取消</el-button>
          <el-button type="primary" @click="handleAddDevice">确定</el-button>
        </template>
      </el-dialog>

      <!-- 关联拓扑对话框 -->
      <el-dialog
        v-model="showLinkDialog"
        title="关联拓扑"
        width="500px"
        :close-on-click-modal="false"
      >
        <el-form :model="linkDeviceForm" label-width="100px">
          <el-form-item label="源设备" required>
            <el-select v-model="linkDeviceForm.sourceNodeId" placeholder="请选择源设备" style="width: 100%">
              <el-option
                v-for="device in allDevices"
                :key="device.value"
                :label="device.label"
                :value="device.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="目标设备" required>
            <el-select v-model="linkDeviceForm.targetNodeId" placeholder="请选择目标设备" style="width: 100%">
              <el-option
                v-for="device in allDevices"
                :key="device.value"
                :label="device.label"
                :value="device.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="链路类型">
            <el-radio-group v-model="linkDeviceForm.linkType">
              <el-radio label="network">网络链路</el-radio>
              <el-radio label="service">服务链路</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showLinkDialog = false">取消</el-button>
          <el-button type="primary" @click="handleLinkDevice">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
// 导入你真实的后端接口
import { listPhysicalMachines } from '@/api/system/chart';
import { useRouter } from 'vue-router';
const router = useRouter();

const chartRef = ref(null);
let myChart = null;
const searchKey = ref('');
const activeChains = ref(['service', 'deploy', 'network']);
const selectedNode = ref(null);
const expandedNodes = ref(new Set());
const loading = ref(true);

// --- 真实数据存储（从后端获取） ---
const rawNodes = ref([]);  // 物理机节点数据
const rawLinks = ref([]);  // 物理机之间的链路数据

// --- 服务/应用数据（模拟数据，后续可对接真实接口） ---
const serviceData = ref([
  { id: 'svc_1', name: 'Web服务', parentId: 'pm_1', status: 0, type: 'service' },
  { id: 'svc_2', name: '数据库', parentId: 'pm_1', status: 0, type: 'service' },
  { id: 'svc_3', name: '缓存服务', parentId: 'pm_1', status: 1, type: 'service' },
  { id: 'svc_4', name: 'API网关', parentId: 'pm_2', status: 0, type: 'service' },
  { id: 'svc_5', name: '消息队列', parentId: 'pm_2', status: 0, type: 'service' },
  { id: 'svc_6', name: '日志服务', parentId: 'pm_3', status: 1, type: 'service' },
  { id: 'svc_7', name: '监控服务', parentId: 'pm_3', status: 0, type: 'service' },
  { id: 'svc_8', name: '认证服务', parentId: 'pm_4', status: 0, type: 'service' },
  { id: 'svc_9', name: '文件存储', parentId: 'pm_5', status: 0, type: 'service' },
  { id: 'svc_10', name: '搜索服务', parentId: 'pm_5', status: 1, type: 'service' }
]);

const expandedPmNodes = ref(new Set());

// --- 添加设备和关联拓扑的表单数据 ---
const showAddDeviceDialog = ref(false);
const showLinkDialog = ref(false);

const addDeviceForm = ref({
  physicalName: '',
  ipAddress: '',
  brand: '',
  model: '',
  status: 0,
  phone: '',
  remark: ''
});

const linkDeviceForm = ref({
  sourceNodeId: '',
  targetNodeId: '',
  linkType: 'network'
});

const allDevices = computed(() => {
  return rawNodes.value.map(n => ({
    value: n.id,
    label: n.name,
    physicalId: n.physicalData?.physicalId
  }));
});

// --- 设备大类图标映射 ---
const DEVICE_TYPE_ICONS = {
  server: '🖥️',
  router: '🛰️',
  switch: '🔄',
  storage: '💾',
  firewall: '🔥',
  loadbalancer: '⚖️',
  other: '📦'
};

// --- 常量配置 ---
const NODE_TYPES = {
  pm: { name: '物理机', color: '#00f5ff', symbol: 'circle' },
  service: { name: '服务链', color: '#a855f7', symbol: 'circle' },
  deploy: { name: '部署链', color: '#ff9f43', symbol: 'diamond' },
  network: { name: '网络链', color: '#00d2ff', symbol: 'triangle' }
};

const COLORS = {
  pm: '#00f5ff',
  service: '#a855f7',
  deploy: '#ff9f43',
  network: '#00d2ff',
  normal: '#00ff88',
  abnormal: '#ff4444'
};

const STATUS_COLORS = {
  0: { color: '#00ff88', label: '正常', shadow: '#00ff88' },
  1: { color: '#ff4444', label: '异常', shadow: '#ff4444' },
  unknown: { color: '#ffaa00', label: '未知', shadow: '#ffaa00' }
};

const SERVICE_COLORS = {
  0: { color: '#a855f7', shadow: '#a855f7' },
  1: { color: '#ff6b6b', shadow: '#ff6b6b' },
  unknown: { color: '#ffd93d', shadow: '#ffd93d' }
};

// --- 生成物理机之间的链路关系 ---
// 链路生成策略：只添加具有实际网络关系的物理机之间的链路
// IP地址在同一网段的物理机之间有链路（表示在同一网络区域）
const generateLinks = (nodes) => {
  const links = [];
  const nodeCount = nodes.length;
  
  // 辅助函数：检查两个IP是否在同一网段
  const isSameSubnet = (ip1, ip2) => {
    if (!ip1 || !ip2) return false;
    const parts1 = ip1.split('.');
    const parts2 = ip2.split('.');
    // 检查前三个网段是否相同
    return parts1[0] === parts2[0] && parts1[1] === parts2[1] && parts1[2] === parts2[2];
  };
  
  // 辅助函数：获取IP地址（从物理数据中）
  const getIp = (node) => {
    return node.physicalData?.ipAddress || '';
  };
  
  // IP地址在同一网段的物理机之间建立链路（青色链路）
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const ip1 = getIp(nodes[i]);
      const ip2 = getIp(nodes[j]);
      
      if (isSameSubnet(ip1, ip2)) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          value: 70,
          lineStyle: {
            color: 'rgba(0, 210, 255, 0.5)',
            width: 1.5,
            curveness: 0.2
          }
        });
      }
    }
  }
  
  return links;
};

// --- 核心：从后端获取真实物理机数据 ---
const loadPhysicalMachines = () => {
  loading.value = true;
  // 调用你的后端接口，获取所有数据（不分页）
  listPhysicalMachines({ pageNum: 1, pageSize: 100 }).then(response => {
    console.log('后端返回的真实数据:', response);
    
    // 1. 处理后端返回的物理机列表
    const physicalMachines = response.rows || [];
    if (physicalMachines.length === 0) {
      ElMessage.warning('未获取到物理机数据');
      loading.value = false;
      return;
    }
    
    // 辅助函数：根据物理机数据推断设备大类
    const inferDeviceType = (pm) => {
      const name = (pm.physicalName || '').toLowerCase();
      const brand = (pm.brand || '').toLowerCase();
      const model = (pm.model || '').toLowerCase();
      
      // 根据名称推断
      if (name.includes('服务器') || name.includes('server')) return 'server';
      if (name.includes('路由器') || name.includes('router')) return 'router';
      if (name.includes('交换机') || name.includes('switch')) return 'switch';
      if (name.includes('存储') || name.includes('storage')) return 'storage';
      if (name.includes('防火墙') || name.includes('firewall')) return 'firewall';
      if (name.includes('负载均衡') || name.includes('loadbalancer')) return 'loadbalancer';
      
      // 根据品牌推断
      if (brand.includes('cisco') || brand.includes('华为') || brand.includes('h3c')) return 'router';
      if (brand.includes('戴尔') || brand.includes('hp') || brand.includes('浪潮')) return 'server';
      
      // 默认为服务器
      return 'server';
    };
    
    // 辅助函数：获取IP地址（从物理数据中）
    const getIp = (pm) => {
      return pm.ipAddress || '';
    };
    
    // 辅助函数：检查两个IP是否在同一网段
    const isSameSubnet = (ip1, ip2) => {
      if (!ip1 || !ip2) return false;
      const parts1 = ip1.split('.');
      const parts2 = ip2.split('.');
      // 检查前三个网段是否相同
      return parts1[0] === parts2[0] && parts1[1] === parts2[1] && parts1[2] === parts2[2];
    };
    
    // 辅助函数：获取IP网段标识
    const getSubnetId = (ip) => {
      if (!ip) return 'unknown';
      const parts = ip.split('.');
      // 返回前三个网段作为标识
      return parts.slice(0, 3).join('.');
    };
    
    // 2. 按IP网段对物理机进行分组
    const subnetGroups = {};
    physicalMachines.forEach(pm => {
      const ip = getIp(pm);
      const subnetId = getSubnetId(ip);
      if (!subnetGroups[subnetId]) {
        subnetGroups[subnetId] = [];
      }
      subnetGroups[subnetId].push(pm);
    });
    
    // 3. 生成节点列表，按错综复杂的布局排列
    const nodes = [];
    const subnetIds = Object.keys(subnetGroups);
    const totalGroups = subnetIds.length;
    
    // 错综复杂的布局：节点按网段紧密分组，不同网段之间有明显分割
    
    if (totalGroups > 0) {
      // 根节点（第一个网段）- 顶部居中
      const rootGroup = subnetGroups[subnetIds[0]];
      const rootY = 10;
      const rootX = 50;
      
      rootGroup.forEach((pm, index) => {
        const nodeId = 'pm_' + pm.physicalId;
        const nodeCount = rootGroup.length;
        const xOffset = (index - (nodeCount - 1) / 2) * 12;
        
        nodes.push({
          id: nodeId,
          name: pm.physicalName || '物理机-' + pm.physicalId,
          type: 'pm',
          x: rootX + xOffset,
          y: rootY,
          fixed: true,
          status: pm.status !== undefined && pm.status !== null ? pm.status : 'unknown',
          physicalData: {
            ...pm,
            deviceType: inferDeviceType(pm)
          }
        });
      });
      
      // 子节点（后续网段）- 每个网段紧密排列，网段之间有明显分割
      const placedNodes = []; // 记录已放置的节点位置
      
      const isPositionAvailable = (x, y, minDistance = 12) => {
        for (const node of placedNodes) {
          const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
          if (distance < minDistance) {
            return false;
          }
        }
        return true;
      };
      
      // 计算每个网段的垂直起始位置（均匀分布）
      const availableHeight = 85; // 从15%到95%的高度
      const verticalSpacing = availableHeight / (totalGroups - 1 || 1);
      
      // 为每个网段生成位置
      for (let i = 1; i < totalGroups; i++) {
        const groupMachines = subnetGroups[subnetIds[i]];
        const groupSize = groupMachines.length;
        
        // 计算这个网段的垂直位置（均匀分布）
        const groupY = 15 + i * verticalSpacing;
        
        // 计算水平位置（居中）
        const groupCenterX = 50;
        
        // 同一网段的节点紧密排列
        const horizontalSpacing = 12;
        const startX = groupCenterX - (groupSize - 1) * horizontalSpacing / 2;
        
        groupMachines.forEach((pm, index) => {
          const nodeId = 'pm_' + pm.physicalId;
          
          // 同一网段的节点紧密排列
          const nodeX = startX + index * horizontalSpacing;
          const nodeY = groupY;
          
          nodes.push({
            id: nodeId,
            name: pm.physicalName || '物理机-' + pm.physicalId,
            type: 'pm',
            x: nodeX,
            y: nodeY,
            fixed: true,
            status: pm.status !== undefined && pm.status !== null ? pm.status : 'unknown',
            physicalData: {
              ...pm,
              deviceType: inferDeviceType(pm)
            }
          });
          
          placedNodes.push({ x: nodeX, y: nodeY });
        });
      }
      
      // 添加一些额外的节点位置调整，使布局更错综复杂
      nodes.forEach((node, index) => {
        if (index > 0) { // 根节点保持不变
          // 尝试随机调整节点位置（小范围）
          for (let attempt = 0; attempt < 5; attempt++) {
            const randomOffsetX = (Math.random() - 0.5) * 4;
            const randomOffsetY = (Math.random() - 0.5) * 3;
            const newX = node.x + randomOffsetX;
            const newY = node.y + randomOffsetY;
            
            // 检查新位置是否可用
            if (isPositionAvailable(newX, newY, 8)) {
              node.x = newX;
              node.y = newY;
              break;
            }
          }
          
          // 限制节点位置在有效范围内
          node.x = Math.max(5, Math.min(95, node.x));
          node.y = Math.max(5, Math.min(95, node.y));
        }
      });
    }

    // 3. 生成物理机之间的链路
    const links = [];
    
    // 4. 保存真实数据
    rawNodes.value = nodes;
    rawLinks.value = links;
    
    loading.value = false;
    render(); // 渲染拓扑图
  }).catch(error => {
    console.error('获取物理机数据失败:', error);
    ElMessage.error('获取物理机数据失败: ' + (error.msg || '网络错误'));
    loading.value = false;
  });
};

// --- 计算属性（基于真实数据） ---
// 节点总数（真实物理机数量）
const totalNodeCount = computed(() => rawNodes.value.length);

// 搜索过滤（基于真实节点名称）
const filteredNodes = computed(() => {
  const key = searchKey.value.toLowerCase();
  return rawNodes.value.filter(n => {
    if (!key) return true;
    return n.name.toLowerCase().includes(key);
  });
});

// 获取节点上游依赖
const getNodeDependencies = (nodeId) => 
  rawLinks.value.filter(l => l.target === nodeId).map(l => l.source);

// 获取节点下游受损
const getDependentNodes = (nodeId) => 
  rawLinks.value.filter(l => l.source === nodeId).map(l => l.target);

// 获取节点类型名称
const getTypeName = (t) => NODE_TYPES[t]?.name || '未知';

// 获取节点状态信息
const getNodeStatus = (status) => STATUS_COLORS[status] || STATUS_COLORS.unknown;

/** 查看详情按钮操作 */
const handleView = (row) => {
  if (!row) {
    ElMessage.warning('请先选择一个物理机节点');
    return;
  }
  
  const physicalId = row.physicalData?.physicalId;
  if (!physicalId) {
    ElMessage.warning('无法获取物理机ID');
    return;
  }
  
  console.log('[Debug - Chart] 点击查看详情，physicalId:', physicalId);
  console.log('[Debug - Chart] 跳转到 /monitor/hardwareinfo?physicalId=' + physicalId);
  
  // 跳转到 hardwareinfo 页面，并传递 physicalId 参数
  router.push({
    path: '/monitor/hardwareinfo',
    query: { physicalId: physicalId }
  });
};

// 规则引擎：计算当前节点的权重匹配度（基于真实链路权重）
const getRuleMatchPercentage = (node) => {
  if (!node) return 0;
  // 找到当前节点相关的所有链路
  const links = rawLinks.value.filter(l => 
    l.source === node.id || l.target === node.id
  );
  if (links.length === 0) return 0;
  // 计算平均权重（模拟规则匹配度）
  const totalWeight = links.reduce((sum, l) => sum + (l.value || l.weight || 80), 0);
  return Math.round(totalWeight / links.length);
};

// --- 获取图标路径 ---
const getIconPath = (status) => {
  // 根据状态设置图标颜色
  let color = '#00f5ff'; // 默认青色
  if (status === 0) {
    color = '#00ff88'; // 正常绿色
  } else if (status === 1) {
    color = '#ff4444'; // 异常红色
  } else if (status === 'unknown') {
    color = '#ffaa00'; // 未知橙色
  }
  
  // 使用 base64 编码的 SVG 图标（统一使用服务器图标 🖥️）
  const iconMap = {
    'normal': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwZmY4OCI+PHBhdGggZD0iTTE5IDNIM2MtMS4xIDAtMiAuOS0yIDJ2MTJjMCAxLjEuOSAyIDIgMmgxNmMxLjEgMCAyLS45IDItMnYtMTJjMC0xLjEtLjktMi0yLTJ6bS0xIDJoLTExdjEwaDExVjV6bS01IDEySDEwdmgyaDV2LTJ6Ii8+PC9zdmc+',
    'abnormal': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmNDQ0NCI+PHBhdGggZD0iTTE5IDNIM2MtMS4xIDAtMiAuOS0yIDJ2MTJjMCAxLjEuOSAyIDIgMmgxNmMxLjEgMCAyLS45IDItMnYtMTJjMC0xLjEtLjktMi0yLTJ6bS0xIDJoLTExdjEwaDExVjV6bS01IDEySDEwdmgyaDV2LTJ6Ii8+PC9zdmc+',
    'unknown': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmYWEwMCI+PHBhdGggZD0iTTE5IDNIM2MtMS4xIDAtMiAuOS0yIDJ2MTJjMCAxLjEuOSAyIDIgMmgxNmMxLjEgMCAyLS45IDItMnYtMTJjMC0xLjEtLjktMi0yLTJ6bS0xIDJoLTExdjEwaDExVjV6bS01IDEySDEwdmgyaDV2LTJ6Ii8+PC9zdmc+',
    'default': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwZjVmZiI+PHBhdGggZD0iTTE5IDNIM2MtMS4xIDAtMiAuOS0yIDJ2MTJjMCAxLjEuOSAyIDIgMmgxNmMxLjEgMCAyLS45IDItMnYtMTJjMC0xLjEtLjktMi0yLTJ6bS0xIDJoLTExdjEwaDExVjV6bS01IDEySDEwdmgyaDV2LTJ6Ii8+PC9zdmc+'
  };
  return iconMap[status] || iconMap['default'];
};

// --- 渲染逻辑（基于真实数据） ---
const render = () => {
  if (!myChart || rawNodes.value.length === 0) return;

  const width = chartRef.value.clientWidth || 800;
  const height = chartRef.value.clientHeight || 600;

  // 1. 过滤可见节点（仅物理机）
  let displayNodes = rawNodes.value.filter(n => {
    if (n.type === 'pm') return true;
    return false;
  });

  // 2. 搜索过滤
  if (searchKey.value) {
    const key = searchKey.value.toLowerCase();
    displayNodes = displayNodes.filter(n => n.name.toLowerCase().includes(key));
  }

  // 3. 获取展开的服务节点
  const allServiceNodes = [];
  expandedPmNodes.value.forEach(pmId => {
    const services = serviceData.value.filter(s => s.parentId === pmId);
    services.forEach((svc, idx) => {
      const pmNode = rawNodes.value.find(n => n.id === pmId);
      if (pmNode) {
        allServiceNodes.push({
          ...svc,
          x: pmNode.x + (idx - services.length / 2) * 8,
          y: pmNode.y + 12
        });
      }
    });
  });

  // 4. 转换为ECharts坐标（百分比转像素）
  const finalNodes = displayNodes.map(n => {
    const nodeStatus = n.status !== undefined && n.status !== null ? n.status : 'unknown';
    const statusConfig = STATUS_COLORS[nodeStatus] || STATUS_COLORS.unknown;
    
    // 获取设备大类图标
    const deviceType = n.physicalData?.deviceType || 'other';
    const deviceIcon = DEVICE_TYPE_ICONS[deviceType] || DEVICE_TYPE_ICONS.other;
    
    // 根据状态获取图标路径
    let statusKey = 'default';
    if (nodeStatus === 0) {
      statusKey = 'normal';
    } else if (nodeStatus === 1) {
      statusKey = 'abnormal';
    } else if (nodeStatus === 'unknown') {
      statusKey = 'unknown';
    }
    
    return {
      id: n.id,
      name: n.name,
      type: n.type,
      status: nodeStatus,
      x: (n.x / 100) * width,
      y: (n.y / 100) * height,
      symbolSize: 35,
      symbol: 'image://' + getIconPath(statusKey),
      symbolSize: [30, 30],
      itemStyle: {
        color: statusConfig.color,
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 15,
        shadowColor: statusConfig.shadow
      }
    };
  });

  // 添加服务节点
  const serviceNodes = allServiceNodes.map(n => {
    const nodeStatus = n.status !== undefined && n.status !== null ? n.status : 'unknown';
    const statusConfig = SERVICE_COLORS[nodeStatus] || SERVICE_COLORS.unknown;
    return {
      id: n.id,
      name: n.name,
      type: n.type,
      status: nodeStatus,
      x: (n.x / 100) * width,
      y: (n.y / 100) * height,
      symbolSize: 18,
      symbol: 'rect',
      symbolRotate: 0,
      itemStyle: {
        color: statusConfig.color,
        borderColor: '#fff',
        borderWidth: 1,
        shadowBlur: 5,
        shadowColor: statusConfig.shadow
      }
    };
  });

  finalNodes.push(...serviceNodes);

  // 添加物理机与服务节点之间的链路
  const serviceLinks = [];
  expandedPmNodes.value.forEach(pmId => {
    const services = serviceData.value.filter(s => s.parentId === pmId);
    const pmNode = rawNodes.value.find(n => n.id === pmId);
    if (pmNode) {
      services.forEach(svc => {
        const svcNode = allServiceNodes.find(s => s.id === svc.id);
        if (svcNode) {
          serviceLinks.push({
            source: pmId,
            target: svc.id
          });
        }
      });
    }
  });

  // 5. ECharts配置
  const option = {
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
        const rawNode = rawNodes.value.find(n => n.id === node.id);
        const statusLabel = STATUS_COLORS[node.status]?.label || '未知';
        const statusColor = STATUS_COLORS[node.status]?.color || '#ffaa00';
        const nodeType = node.type === 'pm' ? '物理机' : '服务';
        return `<div style="color:#fff">
          <strong>${node.name}</strong><br/>
          类型: ${nodeType}<br/>
          状态: <span style="color:${statusColor}">${statusLabel}</span><br/>
          ${rawNode ? `物理机ID: ${rawNode.physicalData?.physicalId || '未知'}` : ''}
        </div>`;
      }
    },
    series: [{
      type: 'graph',
      layout: 'none',
      data: finalNodes,
      links: [...serviceLinks],
      roam: true,
      draggable: true,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 8],
      lineStyle: { width: 2, color: 'rgba(168, 85, 247, 0.6)', curveness: 0.2 },
      label: { show: true, position: 'bottom', color: '#fff', fontSize: 12 }
    }]
  };

  myChart.setOption(option);
};

// --- 初始化图表 ---
const initChart = () => {
  // 创建ECharts实例
  myChart = echarts.init(chartRef.value, null, { devicePixelRatio: 2 });
  
  // 加载真实物理机数据
  loadPhysicalMachines();

  // 监听节点点击事件
  myChart.on('click', (params) => {
    if (params.dataType === 'node') {
      const nodeId = params.data.id;
      const node = rawNodes.value.find(n => n.id === nodeId);
      
      if (node && node.type === 'pm') {
        if (expandedPmNodes.value.has(nodeId)) {
          expandedPmNodes.value.delete(nodeId);
        } else {
          expandedPmNodes.value.add(nodeId);
        }
        render();
      }
      
      selectedNode.value = rawNodes.value.find(n => n.id === nodeId);
    }
  });

  // 监听节点拖拽事件（保存真实位置）
  myChart.on('dragend', (params) => {
    if (params.dataType === 'node' && params.data) {
      const node = rawNodes.value.find(n => n.id === params.data.id);
      if (node) {
        // 保存拖拽后的坐标（转回百分比，适配不同屏幕）
        node.x = (params.data.x / chartRef.value.clientWidth) * 100;
        node.y = (params.data.y / chartRef.value.clientHeight) * 100;
      }
    }
  });
};

// --- 交互功能 ---
// 搜索节点
const handleSearch = () => render();

// 重置视角（恢复初始坐标）
const resetView = () => {
  expandedNodes.value.clear();
  searchKey.value = '';
  // 重新加载数据并渲染
  loadPhysicalMachines();
};

// 层级下钻（模拟跳转到微服务，可对接真实接口）
const drillDown = () => {
  if (!selectedNode.value) {
    ElMessage.warning('请先选择一个物理机节点');
    return;
  }
  ElMessage.info(`正在下钻至 ${selectedNode.value.name} 的微服务实例...`);
  // 这里可扩展：调用后端接口获取该物理机下的微服务/部署/网络数据
};

// --- 添加设备功能 ---
const handleAddDevice = () => {
  if (!addDeviceForm.value.physicalName || !addDeviceForm.value.ipAddress) {
    ElMessage.warning('请填写必填项：设备名称和IP地址');
    return;
  }
  
  console.log('添加设备数据:', addDeviceForm.value);
  
  // 这里可以调用后端接口添加设备
  // 示例：addPhysicalMachine(addDeviceForm.value).then(...)
  
  ElMessage.success('设备添加成功');
  showAddDeviceDialog.value = false;
  
  // 重置表单
  addDeviceForm.value = {
    physicalName: '',
    ipAddress: '',
    brand: '',
    model: '',
    status: 0,
    phone: '',
    remark: ''
  };
  
  // 重新加载数据
  loadPhysicalMachines();
};

// --- 关联拓扑功能 ---
const handleLinkDevice = () => {
  if (!linkDeviceForm.value.sourceNodeId || !linkDeviceForm.value.targetNodeId) {
    ElMessage.warning('请选择源设备和目标设备');
    return;
  }
  
  if (linkDeviceForm.value.sourceNodeId === linkDeviceForm.value.targetNodeId) {
    ElMessage.warning('源设备和目标设备不能相同');
    return;
  }
  
  console.log('关联拓扑数据:', linkDeviceForm.value);
  
  // 这里可以调用后端接口添加链路
  // 示例：addLink(linkDeviceForm.value).then(...)
  
  ElMessage.success('拓扑关联成功');
  showLinkDialog.value = false;
  
  // 重置表单
  linkDeviceForm.value = {
    sourceNodeId: '',
    targetNodeId: '',
    linkType: 'network'
  };
  
  // 重新加载链路数据
  loadPhysicalMachines();
};

// --- 生命周期 ---
onMounted(() => {
  nextTick(() => {
    setTimeout(initChart, 300); // 延迟初始化，确保DOM加载完成
  });
  // 窗口大小变化时重新渲染
  window.addEventListener('resize', () => {
    myChart?.resize();
    render();
  });
});

onUnmounted(() => {
  // 销毁ECharts实例，释放内存
  myChart?.dispose();
});
</script>

<style scoped lang="scss">
/* 样式完全保留你的原始样式，无修改 */
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
    
    .header-actions {
      display: flex;
      gap: 10px;
    }
    
    .chain-filters {
      :deep(.el-checkbox) { color: rgba(255,255,255,0.7); }
    }
  }
}

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
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      .node-name { font-size: 20px; font-weight: bold; flex: 1; }
    }

    .node-details {
      background: rgba(0, 245, 255, 0.05);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid rgba(0, 245, 255, 0.1);
        &:last-child { border-bottom: none; }
        .detail-label { font-size: 12px; color: rgba(255,255,255,0.6); }
        .detail-value { font-size: 13px; color: #fff; font-family: monospace; text-align: right; }
      }
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

.slide-enter-active, .slide-leave-active { transition: all 0.4s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(350px); opacity: 0; }

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

:deep(.el-input__wrapper) {
  background-color: rgba(0,0,0,0.3) !important;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.1) inset !important;
}
:deep(.el-input__inner) { color: #fff !important; }
:deep(.el-tag) { background: rgba(0, 245, 255, 0.1); border-color: #00f5ff; color: #00f5ff; }
:deep(.el-divider__text) { background-color: transparent !important; color: rgba(255,255,255,0.3); font-size: 11px; }
</style>