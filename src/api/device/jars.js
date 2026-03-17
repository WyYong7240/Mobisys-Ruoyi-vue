import request from '@/utils/request'

// 查询JAR应用列表
export function listJars(query) {
  return request({
    url: '/device/jars/list',
    method: 'get',
    params: query
  })
}

// 查询JAR应用详细
export function getJars(jarsId) {
  return request({
    url: '/device/jars/' + jarsId,
    method: 'get'
  })
}

// 新增JAR应用
export function addJars(data) {
  return request({
    url: '/device/jars',
    method: 'post',
    data: data
  })
}

// 修改JAR应用
export function updateJars(data) {
  return request({
    url: '/device/jars',
    method: 'put',
    data: data
  })
}

// 删除JAR应用
export function delJars(jarsId) {
  return request({
    url: '/device/jars/' + jarsId,
    method: 'delete'
  })
}