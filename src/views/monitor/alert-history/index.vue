<template>
  <div class="app-container">
    <div class="page-header">
      <span class="page-title">历史告警</span>
      <div>
        <el-button size="small" @click="fetchList">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small">
        <el-form-item label="告警名称">
          <el-input v-model="queryParams.query" placeholder="搜索告警名称" clearable style="width:200px" @keyup.enter="fetchList" />
        </el-form-item>
        <el-form-item label="告警级别">
          <el-select v-model="queryParams.severity" placeholder="全部级别" clearable style="width:120px">
            <el-option label="P1（紧急）" :value="1" />
            <el-option label="P2（严重）" :value="2" />
            <el-option label="P3（警告）" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width:280px"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="stats-card">
      <el-row :gutter="10">
        <el-col :span="8" class="stat-item"><div class="stat-label">历史告警总数</div><div class="stat-value text-blue">{{ total }}</div></el-col>
        <el-col :span="8" class="stat-item"><div class="stat-label">P1 紧急</div><div class="stat-value text-red">{{ p1Count }}</div></el-col>
        <el-col :span="8" class="stat-item"><div class="stat-label">P2 严重</div><div class="stat-value text-orange">{{ p2Count }}</div></el-col>
      </el-row>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" border stripe size="small" style="width:100%">
        <el-table-column label="告警名称" prop="rule_name" min-width="180" show-overflow-tooltip />
        <el-table-column label="级别" width="90" align="center">
          <template #default="{row}">
            <el-tag :type="severityType(row.severity)" size="small">{{ severityLabel(row.severity) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发时间" width="160" align="center">
          <template #default="{row}">{{ formatTime(row.trigger_time) }}</template>
        </el-table-column>
        <el-table-column label="恢复时间" width="160" align="center">
          <template #default="{row}">{{ formatTime(row.recover_time) }}</template>
        </el-table-column>
        <el-table-column label="持续时长" width="100" align="center">
          <template #default="{row}">{{ getDuration(row.trigger_time, row.recover_time) }}</template>
        </el-table-column>
        <el-table-column label="标签" min-width="200" show-overflow-tooltip>
          <template #default="{row}">
            <el-tag v-for="(v, k) in row.tags" :key="k" size="small" style="margin-right:4px">{{ k }}={{ v }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top:12px;text-align:right"
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-size="queryParams.limit"
        :current-page="queryParams.p + 1"
        :page-sizes="[10, 20, 50]"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script>
import { listHistoryAlerts } from '@/api/monitor/n9e'

export default {
  name: 'AlertHistory',
  data() {
    return {
      loading: false,
      tableData: [],
      total: 0,
      dateRange: [],
      queryParams: { p: 0, limit: 20, query: '', severity: '', stime: null, etime: null }
    }
  },
  computed: {
    p1Count() { return this.tableData.filter(r => r.severity === 1).length },
    p2Count() { return this.tableData.filter(r => r.severity === 2).length }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.loading = true
      try {
        const params = { p: this.queryParams.p, limit: this.queryParams.limit }
        if (this.queryParams.query) params.query = this.queryParams.query
        if (this.queryParams.severity !== '') params.severity = this.queryParams.severity
        if (this.queryParams.stime) params.stime = this.queryParams.stime
        if (this.queryParams.etime) params.etime = this.queryParams.etime
        const res = await listHistoryAlerts(params)
        // 结构: {code:200, data: {dat:{list:[...], total:N}}}
        const dat = (res.code === 200 && res.data) ? res.data : {}
        this.tableData = dat.list || (Array.isArray(dat) ? dat : [])
        this.total = dat.total || this.tableData.length
      } catch (e) {
        this.$message.error('加载失败')
        console.error(e)
      } finally {
        this.loading = false
      }
    },
    handleDateChange() {
      if (this.dateRange && this.dateRange.length === 2) {
        this.queryParams.stime = Math.floor(this.dateRange[0].getTime() / 1000)
        this.queryParams.etime = Math.floor(this.dateRange[1].getTime() / 1000)
      } else {
        this.queryParams.stime = null
        this.queryParams.etime = null
      }
      this.queryParams.p = 0
      this.fetchList()
    },
    resetQuery() {
      this.queryParams = { p: 0, limit: 20, query: '', severity: '', stime: null, etime: null }
      this.dateRange = []
      this.fetchList()
    },
    handleSizeChange(size) { this.queryParams.limit = size; this.queryParams.p = 0; this.fetchList() },
    handlePageChange(page) { this.queryParams.p = page - 1; this.fetchList() },
    severityLabel(s) { return { 1: 'P1 紧急', 2: 'P2 严重', 3: 'P3 警告' }[s] || s },
    severityType(s) { return { 1: 'danger', 2: 'warning', 3: 'primary' }[s] || 'info' },
    formatTime(ts) {
      if (!ts) return '-'
      const d = new Date(ts * 1000)
      return d.toLocaleString('zh-CN', { hour12: false })
    },
    getDuration(startTime, endTime) {
      if (!startTime || !endTime) return '-'
      const seconds = endTime - startTime
      if (seconds < 60) return seconds + 's'
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm'
      if (seconds < 86400) return Math.floor(seconds / 3600) + 'h'
      return Math.floor(seconds / 86400) + 'd'
    }
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.page-title { font-size: 18px; font-weight: 700; color: #303133; }
.filter-card { margin-bottom: 10px; background-color: #fcfcfc; }
.stats-card { margin-bottom: 15px; border-top: 3px solid #409eff; }
.stat-item { text-align: center; border-right: 1px solid #f0f0f0; min-height: 50px; }
.stat-item:last-child { border-right: none; }
.stat-label { font-size: 11px; color: #999; font-weight: bold; margin-bottom: 5px; white-space: nowrap; }
.stat-value { font-size: 16px; font-weight: bold; }
.text-blue { color: #409eff; }
.text-red { color: #f56c6c; }
.text-orange { color: #e6a23c; }
</style>
