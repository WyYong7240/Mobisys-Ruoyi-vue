import request from '@/utils/request'

// 查询【请填写功能名称】列表
export function listMaster(query) {
  return request({
    url: '/device/master/list',
    method: 'get',
    params: query
  })
}

// 查询【请填写功能名称】详细
export function getMaster(physicalId) {
  return request({
    url: '/device/master/' + physicalId,
    method: 'get'
  })
}

// 新增【请填写功能名称】
export function addMaster(data) {
  return request({
    url: '/device/master',
    method: 'post',
    data: data
  })
}

// 修改【请填写功能名称】
export function updateMaster(data) {
  return request({
    url: '/device/master',
    method: 'put',
    data: data
  })
}

// 删除【请填写功能名称】
export function delMaster(physicalId) {
  return request({
    url: '/device/master/' + physicalId,
    method: 'delete'
  })
}



// 查询设备管理树状图
export function listDeviceManagerTree() {
  return request({
    url: '/device/manager/tree',
    method: 'get'
  })
}

// 根据 deviceId 获取物理机列表
export function getListByDeviceId(deviceId) {
  return request({
    url: '/device/master/getListByDeviceId',
    method: 'get',
    params: { deviceId }
  })
}
