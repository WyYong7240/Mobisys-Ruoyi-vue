import request from '@/utils/request'
// ================= Service 相关 API =================

// 查询 Service 列表
export function listServices(query) {
  return request({
    url: '/monitor/kubernetes/services',
    method: 'get',
    params: query
  })
}

// 获取 Service 详情
export function getServiceDetail(namespace, serviceName) {
  return request({
    url: '/monitor/kubernetes/services/detail',
    method: 'get',
    params: { namespace, serviceName }
  })
}

// ---------------- 3. Service 监控 ----------------
// 【注意】：请替换为你 Grafana 中 Service Dashboard 的真实 UID
const svcDashUid = "your-service-dashboard-uid/servicemetrics"

export const svcPanelList = [
  { id: 1, name: '服务请求 QPS (Requests)', desc: 'Service 每秒处理的请求数' },
  { id: 2, name: '服务响应时延 (Latency)', desc: 'Service 处理请求的平均 P99/P95 时延' },
  { id: 3, name: '服务流量 (Rx/Tx)', desc: 'Service 网络出入流量速率' }
]

export const getServiceGrafanaUrl = (panelId, serviceName) => {
  if (!serviceName) return ''
  // K8s 标准模板中，Service 的变量通常是 var-service
  const params = new URLSearchParams({ orgId: 1, theme: 'light', refresh: '5s', panelId: panelId, 'var-service': serviceName })
  return `${grafanaHost}/d-solo/${svcDashUid}?${params.toString()}`
}