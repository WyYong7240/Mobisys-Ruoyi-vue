import request from '@/utils/request'

/**
 * 查询 Pod 面板配置列表
 * @param {Object} query - { namespace, pod }
 */
export function listPodPanelConfig(query) {
  return request({
    url: '/monitor/panel/list',
    method: 'get',
    params: { ...query, service: '__pod__' }
  })
}

/**
 * 保存 Pod 面板配置（upsert）
 */
export function savePodPanelConfig(data) {
  return request({
    url: '/monitor/panel/save',
    method: 'post',
    data: { ...data, service: '__pod__' }
  })
}

/**
 * 删除 Pod 面板配置
 */
export function delPodPanelConfig(ids) {
  return request({
    url: '/monitor/panel/' + ids,
    method: 'delete'
  })
}
