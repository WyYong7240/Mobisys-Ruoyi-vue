import request from '@/utils/request'

// 查询虚拟机管理列表
export function listVirtual(query) {
  return request({
    url: '/device/virtual/list',
    method: 'get',
    params: query
  })
}

// 查询虚拟机管理详细
export function getVirtual(virtualId) {
  return request({
    url: '/device/virtual/' + virtualId,
    method: 'get'
  })
}

// 新增虚拟机管理
export function addVirtual(data) {
  return request({
    url: '/device/virtual',
    method: 'post',
    data: data
  })
}

// 修改虚拟机管理
export function updateVirtual(data) {
  return request({
    url: '/device/virtual',
    method: 'put',
    data: data
  })
}

// 删除虚拟机管理
export function delVirtual(virtualId) {
  return request({
    url: '/device/virtual/' + virtualId,
    method: 'delete'
  })
}
