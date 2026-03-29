import request from '@/utils/request'
// ================= Deployment 相关 API =================

// 查询 Deployment 列表
export function listDeployments(query) {
  return request({
    url: '/monitor/kubernetes/deployments',
    method: 'get',
    params: query
  })
}

// 获取 Deployment 详情
export function getDeploymentDetail(namespace, deploymentName) {
  return request({
    url: '/monitor/kubernetes/deployments/detail',
    method: 'get',
    params: { namespace, deploymentName }
  })
}

// 【注意】：请替换为你 Grafana 中 Deployment Dashboard 的真实 UID
const grafanaBaseUrl = "http://192.168.31.34:32556/d-solo/e7315e58-5e2d-4e68-9c8c-782c029f304b/deploymentresources"

export const deployPanelList = [
  { id: 1, name: '负载 CPU 总使用量', desc: 'Deployment 下所有 Pod 的 CPU 使用量总和' },
  { id: 2, name: '负载内存总使用量', desc: 'Deployment 下所有 Pod 的内存使用量总和' },
  { id: 3, name: '网络接收流量速率', desc: 'Deployment 网络流入流量速率' },
  { id: 4, name: '网络发送流量速率', desc: 'Deployment 网络流出流量速率' }
]

export const getDeploymentGrafanaUrl = (panelId, deploymentName, namespace) => {
  console.log(`[Debug - Kubernetes] 获取GrafanaPanelID:${panelId}, deployName:${deploymentName}, namespace:${namespace}`)
  if (!deploymentName || !namespace) return ''
  // K8s 标准模板中，Deployment 的变量通常是 var-deployment
  const params = new URLSearchParams({ orgId: 1, theme: 'light', refresh: '5s', panelId: panelId, 'var-deployment': deploymentName, 'var-namespace': namespace })
  return `${grafanaBaseUrl}?${params.toString()}`
}