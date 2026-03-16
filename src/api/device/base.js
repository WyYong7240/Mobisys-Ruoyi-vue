import request from '@/utils/request'

// 查询物理机基础信息列表
export function listBase(query) {
  return request({
    url: '/system/base/list',
    method: 'get',
    params: query
  })
}

// 查询物理机基础信息详细
export function getBase(machineId) {
  return request({
    url: '/system/base/' + machineId,
    method: 'get'
  })
}

// 新增物理机基础信息
export function addBase(data) {
  return request({
    url: '/system/base',
    method: 'post',
    data: data
  })
}

// 修改物理机基础信息
export function updateBase(data) {
  return request({
    url: '/system/base',
    method: 'put',
    data: data
  })
}

// 删除物理机基础信息
export function delBase(machineIds) {
  return request({
    url: '/system/base/' + machineIds,
    method: 'delete'
  })
}

// 查询机房树结构（可带参数筛选）
export function roomTreeSelect(query) {
  return request({
    url: '/system/room/treeselect',
    method: 'get',
    params: query
  })
}

// 变更物理机状态（新增）
export function changeMachineStatus(machineId, status) {
  return request({
    url: '/system/base/changeStatus',
    method: 'put',
    data: {
      machineId: machineId,
      status: status
    }
  })
}

// 导出物理机基础信息（新增）
export function exportBase(query) {
  return request({
    url: '/system/base/export',
    method: 'get',
    params: query,
    responseType: 'blob' // 导出文件需要指定响应类型
  })
}