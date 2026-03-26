import request from '@/utils/request'

// 查询物理机列表
export function listPhysicalMachines(query) {
  return request({
    url: '/device/master/list',
    method: 'get',
    params: query
  })
}

// 保存节点位置
export function saveNodePosition(physicalId, nodeX, nodeY) {
  return request({
    url: '/device/master/update',
    method: 'put',
    data: {
      physicalId: physicalId,
      nodeX: nodeX,
      nodeY: nodeY
    }
  })
}
