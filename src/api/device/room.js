import request from '@/utils/request'

// 查询设备管理列表
export function listRoom(query) {
  return request({
    url: '/system/room/list',
    method: 'get',
    params: query
  })
}

// 查询设备管理详细
export function getRoom(roomId) {
  return request({
    url: '/system/room/' + roomId,
    method: 'get'
  })
}

// 新增设备管理
export function addRoom(data) {
  return request({
    url: '/system/room',
    method: 'post',
    data: data
  })
}

// 修改设备管理
export function updateRoom(data) {
  return request({
    url: '/system/room',
    method: 'put',
    data: data
  })
}

// 删除设备管理
export function delRoom(roomId) {
  return request({
    url: '/system/room/' + roomId,
    method: 'delete'
  })
}
