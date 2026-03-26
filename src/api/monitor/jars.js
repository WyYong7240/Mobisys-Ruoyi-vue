import request from '@/utils/request'

/**
 * 查询Jars应用列表（由jars应用管理模块提供，此处为预定义接口）
 * 返回格式: { code: 200, data: [{ device, category, appName, startCmd, workDir, resourceLimit, status }] }
 */
export function listJarsApps(query) {
  return request({
    url: '/device/jars/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 1000, ...query }
  })
}

/**
 * 查询Jars应用面板配置列表（按 device + category + appName 过滤）
 * @param {Object} query - { device, category, appName }
 */
export function listJarsPanelConfig(query) {
  return request({
    url: '/monitor/jars/panel/list',
    method: 'get',
    params: query
  })
}

/**
 * 根据主键查询面板配置
 */
export function getJarsPanelConfig(id) {
  return request({
    url: '/monitor/jars/panel/' + id,
    method: 'get'
  })
}

/**
 * 保存面板配置（upsert：后端自动判断新增或更新）
 * @param {Object} data - JarsPanelConfig 对象
 */
export function saveJarsPanelConfig(data) {
  return request({
    url: '/monitor/jars/panel/save',
    method: 'post',
    data: data
  })
}

/**
 * 删除面板配置（支持批量，ids 用逗号分隔）
 */
export function delJarsPanelConfig(ids) {
  return request({
    url: '/monitor/jars/panel/' + ids,
    method: 'delete'
  })
}

/**
 * 批量更新面板排序和宽度
 * @param {Array} list - [{ id, sortOrder, groupSortOrder, panelSpan }, ...]
 */
export function batchSortJarsPanels(list) {
  return request({
    url: '/monitor/jars/panel/batchSort',
    method: 'put',
    data: list
  })
}

/**
 * 调用追踪查询
 * @param {Object} query - { service, endpoint, startTime, endTime, limit }
 */
export function queryJarsTrace(query) {
  return request({
    url: '/monitor/jars/trace/query',
    method: 'get',
    params: query
  })
}

/**
 * 获取 Jaeger 配置
 */
export function getJarsTraceConfig() {
  return request({
    url: '/monitor/jars/trace/config',
    method: 'get'
  })
}

/**
 * 更新 Jaeger 配置
 */
export function updateJarsTraceConfig(data) {
  return request({
    url: '/monitor/jars/trace/config',
    method: 'post',
    data
  })
}
