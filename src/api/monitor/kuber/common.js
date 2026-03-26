import request from '@/utils/request'

// 获取命名空间下拉列表
export function getNamespaces() {
  return request({
    url: '/monitor/kubernetes/namespaces',
    method: 'get'
  })
}

// 获取节点下拉列表
export function getNodes() {
  return request({
    url: '/monitor/kubernetes/nodes',
    method: 'get'
  })
}