import request from '@/utils/request'

// 查询数据库管理列表
export function listDatabase(query) {
  return request({
    url: '/device/database/list',
    method: 'get',
    params: query
  })
}

// 查询数据库管理详细
export function getDatabase(databaseId) {
  return request({
    url: '/device/database/' + databaseId,
    method: 'get'
  })
}

// 新增数据库管理
export function addDatabase(data) {
  return request({
    url: '/device/database',
    method: 'post',
    data: data
  })
}

// 修改数据库管理
export function updateDatabase(data) {
  return request({
    url: '/device/database',
    method: 'put',
    data: data
  })
}

// 删除数据库管理
export function delDatabase(databaseId) {
  return request({
    url: '/device/database/' + databaseId,
    method: 'delete'
  })
}
