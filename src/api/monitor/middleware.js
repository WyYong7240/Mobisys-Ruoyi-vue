import request from '@/utils/request'

// 查询中间件管理列表
export function listMiddleware(query) {
  return request({
    url: '/device/middware/list',
    method: 'get',
    params: query
  })
}

// 查询中间件管理详细
export function getMiddleware(middlewareId) {
  return request({
    url: '/device/middware/' + middlewareId,
    method: 'get'
  })
}

// 新增中间件管理
export function addMiddleware(data) {
  return request({
    url: '/device/middware',
    method: 'post',
    data: data
  })
}

// 修改中间件管理
export function updateMiddleware(data) {
  return request({
    url: '/device/middware',
    method: 'put',
    data: data
  })
}

// 删除中间件管理
export function delMiddleware(middlewareId) {
  return request({
    url: '/device/middware/' + middlewareId,
    method: 'delete'
  })
}
