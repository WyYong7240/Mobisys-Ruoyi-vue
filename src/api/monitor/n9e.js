import request from '@/utils/request'

const BASE = '/monitor/n9e'

// ===== 配置 =====
export function getN9eConfig() {
  return request({ url: `${BASE}/config`, method: 'get' })
}
export function updateN9eConfig(data) {
  return request({ url: `${BASE}/config`, method: 'post', data })
}

// ===== 告警规则 =====
export function listAlertRules(params) {
  return request({ url: `${BASE}/alert-rules`, method: 'get', params })
}
export function createAlertRule(data) {
  return request({ url: `${BASE}/alert-rules`, method: 'post', data })
}
export function updateAlertRule(data) {
  return request({ url: `${BASE}/alert-rules`, method: 'put', data })
}
export function deleteAlertRules(ids) {
  return request({ url: `${BASE}/alert-rules`, method: 'delete', data: { ids } })
}
export function updateAlertRuleStatus(ids, disabled) {
  return request({ url: `${BASE}/alert-rules/status`, method: 'put', data: { ids, disabled } })
}

// ===== 活跃告警 =====
export function listActiveAlerts(params) {
  return request({ url: `${BASE}/alert-cur-events`, method: 'get', params })
}
export function deleteActiveAlerts(ids) {
  return request({ url: `${BASE}/alert-cur-events`, method: 'delete', data: { ids } })
}

// ===== 历史告警 =====
export function listHistoryAlerts(params) {
  return request({ url: `${BASE}/alert-his-events`, method: 'get', params })
}

// ===== 告警屏蔽 =====
export function listSilences(params) {
  return request({ url: `${BASE}/alert-mutes`, method: 'get', params })
}
export function createSilence(data) {
  return request({ url: `${BASE}/alert-mutes`, method: 'post', data })
}
export function deleteSilences(ids) {
  return request({ url: `${BASE}/alert-mutes`, method: 'delete', data: { ids } })
}

// ===== 告警订阅 =====
export function listSubscribes(params) {
  return request({ url: `${BASE}/alert-subscribes`, method: 'get', params })
}
export function createSubscribe(data) {
    return request({ url: `${BASE}/alert-subscribes`, method: 'post', data })
  }
  export function updateSubscribe(data) {
    return request({ url: `${BASE}/alert-subscribes`, method: 'put', data })
  }
  export function deleteSubscribes(ids) {
    return request({ url: `${BASE}/alert-subscribes`, method: 'delete', data: { ids } })
  }
  export function listDatasources() {
    return request({ url: `${BASE}/datasources`, method: 'get' })
  }
  
  // ===== 通知渠道 =====
  export function listNotifyChannels() {
    return request({ url: `${BASE}/notify-channels`, method: 'get' })
  }
  export function listNotifyTpls() {
    return request({ url: `${BASE}/notify-tpls`, method: 'get' })
  }
  export function updateNotifyTpl(data) {
    return request({ url: `${BASE}/notify-tpls`, method: 'put', data })
  }