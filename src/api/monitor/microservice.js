import request from '@/utils/request'

/**
 * 查询微服务命名空间列表（用户手动维护的属于微服务的 namespace）
 */
export function listMicroserviceNamespaces() {
  return request({
    url: '/monitor/panel/ns/list',
    method: 'get'
  })
}

/**
 * 保存微服务命名空间列表
 * @param {string[]} namespaces
 */
export function saveMicroserviceNamespaces(namespaces) {
  return request({
    url: '/monitor/panel/ns/save',
    method: 'post',
    data: { namespaces }
  })
}

/**
 * 查询面板配置列表（按 namespace + service + pod 过滤）
 * @param {Object} query - { namespace, service, pod }
 */
export function listPanelConfig(query) {
  return request({
    url: '/monitor/panel/list',
    method: 'get',
    params: query
  })
}

/**
 * 根据主键查询面板配置
 */
export function getPanelConfig(id) {
  return request({
    url: '/monitor/panel/' + id,
    method: 'get'
  })
}

/**
 * 保存面板配置（upsert：后端自动判断新增或更新）
 * @param {Object} data - MicroservicePanelConfig 对象
 */
export function savePanelConfig(data) {
  return request({
    url: '/monitor/panel/save',
    method: 'post',
    data: data
  })
}

/**
 * 新增面板配置
 */
export function addPanelConfig(data) {
  return request({
    url: '/monitor/panel',
    method: 'post',
    data: data
  })
}

/**
 * 修改面板配置
 */
export function updatePanelConfig(data) {
  return request({
    url: '/monitor/panel',
    method: 'put',
    data: data
  })
}



/**
 * 删除面板配置（支持批量，ids 用逗号分隔）
 */
export function delPanelConfig(ids) {
  return request({
    url: '/monitor/panel/' + ids,
    method: 'delete'
  })
}

// 获取微服务 Service 列表
export function listMicroserviceServices(namespace) {
  return request({
    url: '/monitor/panel/microservice/services',
    method: 'get',
    params: { namespace }
  });
}

// 保存微服务 Service 列表
export function saveMicroserviceServices(namespace, services) {
  return request({
    url: '/monitor/panel/microservice/services',
    method: 'post',
    data: { namespace, services }
  });
}