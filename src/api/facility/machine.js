import request from '@/utils/request'

// 查询机房设施管理列表
export function listMachine(query) {
  return request({
    url: '/facility/machine/list',
    method: 'get',
    params: query
  })
}

// 查询机房设施管理详细
export function getMachine(id) {
  return request({
    url: '/facility/machine/' + id,
    method: 'get'
  })
}

// 新增机房设施管理
export function addMachine(data) {
  return request({
    url: '/facility/machine',
    method: 'post',
    data: data
  })
}

// 修改机房设施管理
export function updateMachine(data) {
  return request({
    url: '/facility/machine',
    method: 'put',
    data: data
  })
}

// 删除机房设施管理
export function delMachine(id) {
  return request({
    url: '/facility/machine/' + id,
    method: 'delete'
  })
}
