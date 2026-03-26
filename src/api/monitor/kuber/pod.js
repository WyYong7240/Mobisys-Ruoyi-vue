import request from '@/utils/request'

export function listPods(query) {
  return request({
    url: '/monitor/kubernetes/pods',
    method: 'get',
    params: query
  })
}

// 获取 Pod 详情 (YAML与事件)
export function getPodDetail(namespace, podName) {
  return request({
    url: '/monitor/kubernetes/pods/detail',
    method: 'get',
    params: { namespace, podName }
  })
}


// Grafana 的基础地址 (指向你专门展示 K8s 数据的那个 Dashboard)
const grafanaBaseUrl = "http://192.168.31.34:32556/d-solo/da551cdb-31f9-4a59-9538-cb0bc47d2eb8/poddynamicmetrics"

// 定义你需要展示的 Panel 列表保持不变
export const panelList = ref([
  { id: 1, name: 'CPU 使用量 (CPU Usage)', desc: 'Pod 容器 CPU 核心使用量随时间的变化曲线' },
  { id: 2, name: '内存使用量 (Memory RSS)', desc: 'Pod 容器物理内存实际使用量' },
  { id: 3, name: '网络接收流量 (Network Rx)', desc: 'Pod 网络接口接收流量速率' },
  { id: 4, name: '网络发送流量 (Network Tx)', desc: 'Pod 网络接口发送流量速率' }
])


export const getPodGrafanaUrl = (panelId, podName) => {
  console.log(`[Debug - Kubernetes] 获取GrafanaPanelID:${panelId}, podName:${podName}`)
  // 如果参数不全，直接返回空，避免 iframe 报错
  if (!podName) return ''
  const params = new URLSearchParams({
    orgId: 1,
    theme: 'light',
    panelId: panelId,
    'var-pod': podName,
    refresh: '5s'
  })
  return `${grafanaBaseUrl}?${params.toString()}`
}