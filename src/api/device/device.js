import request from '@/utils/request'

// 查询设备管理列表
export function listDevice(query) {
  return request({
    url: '/device/device/list',
    method: 'get',
    params: query
  })
}

// 查询设备管理详细
export function getDevice(deviceId) {
  return request({
    url: '/device/device/' + deviceId,
    method: 'get'
  })
}

// 新增设备管理
export function addDevice(data) {
  return request({
    url: '/device/device',
    method: 'post',
    data: data
  })
}

// 修改设备管理
export function updateDevice(data) {
  return request({
    url: '/device/device',
    method: 'put',
    data: data
  })
}

// 删除设备管理
export function delDevice(deviceId) {
  return request({
    url: '/device/device/' + deviceId,
    method: 'delete'
  })
}
