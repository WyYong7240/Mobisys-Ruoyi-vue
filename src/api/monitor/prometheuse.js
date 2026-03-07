import request from '@/utils/request'

// 获取服务信息
export function queryPrometheus(promQL, time) {
  return request({
    url: '/prom-api/api/v1/query',
    method: 'get',
    params: {
        query: promQL,
        time: time || Date.now() / 1000
    }
  })
}