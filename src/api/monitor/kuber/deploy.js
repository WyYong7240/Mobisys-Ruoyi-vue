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