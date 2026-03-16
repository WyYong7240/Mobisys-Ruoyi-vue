import request from '@/utils/request'

// 查询设备管理列表
export function listManager(query) {
  return request({
    url: '/device/manager/list',
    method: 'get',
    params: query
  })
}

// 查询设备管理详细
export function getManager(deviceId) {
  return request({
    url: '/device/manager/' + deviceId,
    method: 'get'
  })
}

// 新增设备管理
export function addManager(data) {
  return request({
    url: '/device/manager',
    method: 'post',
    data: data
  })
}

// 修改设备管理
export function updateManager(data) {
  return request({
    url: '/device/manager',
    method: 'put',
    data: data
  })
}

// 删除设备管理
export function delManager(deviceId) {
  return request({
    url: '/device/manager/' + deviceId,
    method: 'delete'
  })
}
