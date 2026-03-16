// src/api/monitor/deviceMonitor.js
import { ref, computed } from 'vue'
import { queryPrometheus } from '@/api/monitor/prometheuse'
import { getServer } from '@/api/monitor/server'
import { listDeviceManagerTree, getListByDeviceId } from '@/api/device/master'

// ==========================================
// 第一部分：左侧设备选择与树状图状态
// ==========================================
export const treeSearch = ref('')
export const deviceTree = ref([])
export const deviceTreeRef = ref(null)
export const treeProps = { children: 'children', label: 'deviceName' }

export const activeDeviceId = ref('')
export const currentNodeDeviceId = ref(null)

export const currentDevice = computed(() => {
  if (!activeDeviceId.value && !currentNodeDeviceId.value) return null
  const selectedNode = findNodeInTree(deviceTree.value, currentNodeDeviceId.value || activeDeviceId.value)
  if (selectedNode) {
    return {
      id: selectedNode.deviceId,
      name: selectedNode.physicalName || selectedNode.deviceName,
      deviceNo: selectedNode.deviceId2 || selectedNode.deviceNo || '-',
      type: selectedNode.deviceType || '设备',
      status: selectedNode.status, 
      brand: selectedNode.brand || '-',
      model: selectedNode.model || '-',
      macAddress: selectedNode.macAddress || '-',
      ipAddress: selectedNode.ipAddress || '-',
      leader: selectedNode.leader || '-',
      username: selectedNode.username || '-',
      isK8s: selectedNode.isK8s || selectedNode.isk8s || '-',
      remark: selectedNode.remark || '-',
      createTime: selectedNode.createTime || '-'
    }
  }
  return null
})

const findNodeInTree = (tree, deviceId) => {
  if (!tree || !deviceId) return null
  for (const node of tree) {
    if (node.deviceId === deviceId) return node
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, deviceId)
      if (found) return found
    }
  }
  return null
}

export const expandParentNodes = (node) => {
  if (!node || !node.parentId) return
  const findParent = (nodes, parentId) => {
    for (const n of nodes) {
      if (n.deviceId === parentId) {
        const realNode = deviceTreeRef.value?.getNode(n.deviceId)
        if (realNode) realNode.expanded = true
        findParent(deviceTree.value, n.parentId)
        return
      }
      if (n.children && n.children.length > 0) findParent(n.children, parentId)
    }
  }
  findParent(deviceTree.value, node.parentId)
}

export const getDeviceTree = () => {
  console.log('[Debug - Tree] 开始获取设备树状图数据...')
  listDeviceManagerTree().then(response => {
    const fullTree = buildTree(response.data, 0)
    // 过滤：只保留物理机设备根节点
    if (fullTree && fullTree.length > 0) {
      const physicalNode = fullTree.find(node => node.deviceName === '物理机设备')
      deviceTree.value = physicalNode ? [physicalNode] : []
    }
    console.log('[Debug - Tree] 设备树构建完成:', deviceTree.value)
    addPhysicalMastersToTree()
  }).catch(error => { console.error('[Debug - Tree] 获取树状图数据失败:', error) })
}

const buildTree = (data, parentId) => {
  const result = []
  for (const item of data) {
    if (item.parentId === parentId) {
      const children = buildTree(data, item.deviceId)
      if (children.length > 0) item.children = children
      result.push(item)
    }
  }
  return result
}

const addPhysicalMastersToTree = () => {
  if (!deviceTree.value || deviceTree.value.length === 0) return
  deviceTree.value.forEach(rootNode => {
    if (rootNode.children && rootNode.children.length > 0) {
      rootNode.children.forEach(child => { getPhysicalMastersForDevice(child) })
    }
  })
}

const getPhysicalMastersForDevice = (deviceNode) => {
  if (!deviceNode.deviceId) return
  getListByDeviceId(deviceNode.deviceId).then(response => {
    if (response.rows && response.rows.length > 0) {
      deviceNode.children = response.rows.map(physical => ({
        // 【核心修复 1】：拼接一个前缀，彻底解决和父级目录的 ID 冲突！
        deviceId: 'physical_' + physical.physicalId, 
        
        parentId: deviceNode.deviceId,
        deviceName: physical.physicalName, physicalName: physical.physicalName,
        physicalId: physical.physicalId, deviceId2: physical.deviceId,
        brand: physical.brand, model: physical.model, status: physical.status,
        macAddress: physical.macAddress, ipAddress: physical.ipAddress,
        leader: physical.leader, username: physical.username,
        isK8s: physical.isk8s, createTime: physical.createTime, deviceType: '物理机', children: []
      }))
    } else { deviceNode.children = [] }
  }).catch(error => { console.error('[Debug - Tree] 获取物理机子列表失败:', error); deviceNode.children = [] })
}

export const selectNodeByPhysicalId = (physicalId) => {
  if (!deviceTree.value || deviceTree.value.length === 0) return
  
  // 【核心修复 2】：查找时也加上 'physical_' 前缀
  const targetNode = findNodeInTree(deviceTree.value, 'physical_' + physicalId) 
  
  if (targetNode) {
    console.log('[Debug - Tree] 路由参数匹配到节点:', targetNode)
    expandParentNodes(targetNode)
    if (deviceTreeRef.value) {
      deviceTreeRef.value.setCurrentKey(targetNode.deviceId)
      currentNodeDeviceId.value = targetNode.deviceId
      activeDeviceId.value = targetNode.parentId || targetNode.deviceId
    }
  }
}

// ==========================================
// 第二部分：节点硬件监控状态与加载方法
// ==========================================
export const hasHardwareData = ref(true)
export const currentLoadedHardwareDevice = ref('')
export const realtimeStatus = ref('未知')
export const serverInfo = ref({}) 
export const hardwareDetail = ref({ cpu: { model: '-', vendor: '-', arch: '-', cores: 0, threads: 0, freq: '-' }, memory: { slots: [], totalSlots: 0 } });
export const metrics = ref({ cpuUsage: 0, cpuFree: 100, memTotalGb: 0, memUsage: 0, memUsedGb: 0, memFreeGb: 0 })

export const grafanaBaseUrl = "http://192.168.31.34:32556/d-solo/bc847f0f-175a-47d4-8808-958da9b029f3/node-resources-board"
export const panelList = ref([
  {id: 1, name: "CPU利用率", desc: "反映节点整体计算资源的紧张程度。"},
  {id: 2, name: "内存利用率", desc: "反映节点物理内存的使用比例。"},
  {id: 3, name: "网络接收速率", desc: "节点网卡每秒接收的数据量（入站流量）。"},
  {id: 4, name: "网络发送速率", desc: "节点网卡每秒发送的数据量（出站流量）。"},
  {id: 5, name: "磁盘利用率", desc: "存储空间的使用比例。"}
])

export const getGrafanaUrl = (panelId) => {
  if (!currentDevice.value) return ''
  const params = new URLSearchParams({ orgId: 1, theme: 'light', panelId: panelId, 'var-instance': currentDevice.value.name, refresh: '5s' })
  return `${grafanaBaseUrl}?${params.toString()}`
}

export async function loadHardwareData(proxy, deviceName, isSilent = false) {
  if (!deviceName) return;
  
  if (currentLoadedHardwareDevice.value !== deviceName) {
    console.log(`[Debug - Hardware] 检测到设备切换: ${currentLoadedHardwareDevice.value} -> ${deviceName}，清理硬件面板旧数据`)
    hardwareDetail.value = { cpu: { model: '-', vendor: '-', arch: '-', cores: 0, threads: 0, freq: '-' }, memory: { slots: [], totalSlots: 0 } };
    metrics.value = { cpuUsage: 0, cpuFree: 100, memTotalGb: 0, memUsage: 0, memUsedGb: 0, memFreeGb: 0 };
    hasHardwareData.value = true;
    realtimeStatus.value = '获取中...';
    currentLoadedHardwareDevice.value = deviceName;
  }

  let isHardwareFound = false;
  const checkData = (res) => res?.data?.result && res.data.result.length > 0;

  if (!isSilent && proxy) proxy.$modal.loading("正在同步硬件监控数据...")

  try {
    const infoRes = await getServer()
    serverInfo.value = infoRes.data || {}
    
    console.log(`[Debug - Hardware] 正在向 Prometheus 请求设备 [${deviceName}] 的硬件指标...`)
    const queries = {
      cpuInfo: `hardware_cpu_model_info{instance="${deviceName}"}`, cpuCores: `hardware_cpu_cores_total{instance="${deviceName}"}`,
      cpuThreads: `hardware_cpu_threads_total{instance="${deviceName}"}`, cpuFreq: `hardware_cpu_frequency_hertz{instance="${deviceName}"}`,
      memSlots: `hardware_memory_slot_info{instance="${deviceName}"}`, memTotalSlots: `hardware_memory_slots_total{instance="${deviceName}"}`,
      upStatus: `up{instance=~"${deviceName}(:.*)?"}`
    };
    const [cpuInfoRes, cpuCoresRes, cpuThreadsRes, cpuFreqRes, memSlotsRes, memTotalSlotsRes, upStatus] = await Promise.all([
      queryPrometheus(queries.cpuInfo), queryPrometheus(queries.cpuCores), queryPrometheus(queries.cpuThreads),
      queryPrometheus(queries.cpuFreq), queryPrometheus(queries.memSlots), queryPrometheus(queries.memTotalSlots),
      queryPrometheus(queries.upStatus)
    ]);
    const [cpuRes, memRes, memTotalRes] = await Promise.all([
      queryPrometheus(`100 - (avg by(instance) (rate(node_cpu_seconds_total{instance="${deviceName}", mode="idle"}[5m])) * 100)`),
      queryPrometheus(`(1 - (node_memory_MemAvailable_bytes{instance="${deviceName}"} / node_memory_MemTotal_bytes{instance="${deviceName}"})) * 100`),
      queryPrometheus(`node_memory_MemTotal_bytes{instance="${deviceName}"}`)
    ])

    if (checkData(upStatus)) {
        realtimeStatus.value = upStatus.data.result[0].value[1] === "1" ? '在线' : '离线';
    } else {
        realtimeStatus.value = '离线'
    }

    if (checkData(cpuInfoRes) || checkData(cpuRes)) {
      isHardwareFound = true;
    } else {
      console.warn(`[Debug - Hardware] 未查到设备 [${deviceName}] 的硬件指标数据`)
    }

    const cpuMetric = cpuInfoRes.data?.result?.[0]?.metric || {};
    hardwareDetail.value.cpu = {
      model: cpuMetric.model || '-', vendor: cpuMetric.vendor || '-', arch: cpuMetric.architecture || '-',
      cores: cpuCoresRes.data?.result?.[0]?.value?.[1] || 0, threads: cpuThreadsRes.data?.result?.[0]?.value?.[1] || 0,
      freq: cpuFreqRes.data?.result?.[0]?.value?.[1] ? (parseFloat(cpuFreqRes.data?.result?.[0]?.value?.[1]) / 1e9).toFixed(2) + ' GHz' : '-'
    };
    hardwareDetail.value.memory.slots = (memSlotsRes.data?.result || []).map(item => ({
      slot: item.metric.slot, size: (parseFloat(item.metric.size_bytes) / (1024 ** 3)).toFixed(0) + ' GB',
      type: item.metric.type, speed: item.metric.speed_mhz + ' MHz', manufacturer: item.metric.manufacturer
    }));
    hardwareDetail.value.memory.totalSlots = memTotalSlotsRes.data?.result?.[0]?.value?.[1] || 0;

    const rawCpuUsage = parseFloat(cpuRes.data?.result?.[0]?.value?.[1] || 0)
    const rawMemUsage = parseFloat(memRes.data?.result?.[0]?.value?.[1] || 0)
    const rawMemTotalBytes = parseFloat(memTotalRes.data?.result?.[0]?.value?.[1] || 0)
    const memTotalGb = rawMemTotalBytes / (1024 ** 3)
    metrics.value = {
      cpuUsage: rawCpuUsage.toFixed(2), cpuFree: (100 - rawCpuUsage).toFixed(2), memTotalGb: memTotalGb.toFixed(2), memUsage: rawMemUsage.toFixed(2),
      memUsedGb: (memTotalGb * (rawMemUsage / 100)).toFixed(2), memFreeGb: (memTotalGb - (memTotalGb * (rawMemUsage / 100))).toFixed(2)
    }
  } catch (error) { 
    console.error("[Debug - Hardware] 硬件数据获取异常:", error) 
  } finally {
    if (currentLoadedHardwareDevice.value === deviceName) hasHardwareData.value = isHardwareFound;
    if (!isSilent && proxy) proxy.$modal.closeLoading()
  }
}

// ==========================================
// 第三部分：节点操作系统信息状态与加载方法
// ==========================================
export const hasOsData = ref(true)
export const currentLoadedOsDevice = ref('')
export const activeOsTab = ref('sysinfo')
export const osDetail = ref({ osName: '-', osVersion: '-', kernelVersion: '-', processes: [], userGroups: [], installedApps: [] })

export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function loadOsData(proxy, deviceName, isSilent = false) {
  if (!deviceName) return;

  if (currentLoadedOsDevice.value !== deviceName) {
    console.log(`[Debug - OS] 检测到设备切换: ${currentLoadedOsDevice.value} -> ${deviceName}，清理OS面板旧数据`)
    osDetail.value = { osName: '-', osVersion: '-', kernelVersion: '-', processes: [], userGroups: [], installedApps: [] };
    hasOsData.value = true;
    currentLoadedOsDevice.value = deviceName;
  }

  let isOsFound = false;
  const checkData = (res) => res?.data?.result && res.data.result.length > 0;

  try {
    console.log(`[Debug - OS] 正在向 Prometheus 请求设备 [${deviceName}] 的操作系统与进程指标...`)
    const osInfoRes = await queryPrometheus(`node_os_info{instance="${deviceName}"}`);
    const unameRes = await queryPrometheus(`node_uname_info{instance="${deviceName}"}`);
    osDetail.value.osName = osInfoRes.data?.result?.[0]?.metric?.name || 'Linux';
    osDetail.value.osVersion = osInfoRes.data?.result?.[0]?.metric?.version || '-';
    osDetail.value.kernelVersion = unameRes.data?.result?.[0]?.metric?.release || '-';

    const [procMem, procCpu, procRead, procWrite] = await Promise.all([
      queryPrometheus(`topk(15, namedprocess_namegroup_memory_bytes{instance="${deviceName}", memtype="resident"})`),
      queryPrometheus(`rate(namedprocess_namegroup_cpu_seconds_total{instance="${deviceName}"}[5m])`),
      queryPrometheus(`rate(namedprocess_namegroup_read_bytes_total{instance="${deviceName}"}[5m])`),
      queryPrometheus(`rate(namedprocess_namegroup_write_bytes_total{instance="${deviceName}"}[5m])`)
    ]);

    if (checkData(osInfoRes) || checkData(procMem)) {
       isOsFound = true;
    } else {
       console.warn(`[Debug - OS] 未查到设备 [${deviceName}] 的OS或进程指标数据`)
    }

    const processList = [];
    if (procMem.data?.result) {
      procMem.data.result.forEach(memItem => {
        const groupname = memItem.metric.groupname;
        const cpuItem = procCpu.data?.result?.find(c => c.metric.groupname === groupname);
        const readItem = procRead.data?.result?.find(r => r.metric.groupname === groupname);
        const writeItem = procWrite.data?.result?.find(w => w.metric.groupname === groupname);
        processList.push({
          name: groupname, pid: '-', state: 'Running', cpu: cpuItem ? (parseFloat(cpuItem.value[1]) * 100).toFixed(2) : '0.00',
          memory: formatBytes(memItem.value[1]), diskRead: readItem ? formatBytes(readItem.value[1]) + '/s' : '0 B/s', diskWrite: writeItem ? formatBytes(writeItem.value[1]) + '/s' : '0 B/s',
        });
      });
    }
    osDetail.value.processes = processList.sort((a, b) => parseFloat(b.cpu) - parseFloat(a.cpu));

    const userGroupsRes = await queryPrometheus(`os_user_group_info{instance="${deviceName}"}`);
    const appsRes = await queryPrometheus(`os_installed_app_info{instance="${deviceName}"}`);
    if (userGroupsRes.data?.result?.length > 0) {
      osDetail.value.userGroups = userGroupsRes.data.result.map(item => ({ groupName: item.metric.group || 'unknown', users: item.metric.users ? item.metric.users.split(',') : ['root'] }));
    } else { osDetail.value.userGroups = [{ groupName: 'root', users: ['root'] }, { groupName: 'docker', users: ['root', 'deploy'] }]; }
    if (appsRes.data?.result?.length > 0) {
      osDetail.value.installedApps = appsRes.data.result.map(item => ({ name: item.metric.app_name || '-', version: item.metric.version || '-', arch: item.metric.arch || 'amd64' }));
    } else { osDetail.value.installedApps = [{ name: 'nginx', version: '1.24.0', arch: 'amd64' }, { name: 'mysql-server', version: '8.0.32', arch: 'amd64' }]; }
  } catch (error) { 
    console.error("[Debug - OS] OS/进程数据获取异常:", error) 
  } finally {
    if (currentLoadedOsDevice.value === deviceName) hasOsData.value = isOsFound;
  }
}