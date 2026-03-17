<template>
  <div class="app-container">
    <div class="page-header">
      <span class="page-title">活跃告警</span>
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
        <el-form-item>
          <el-button type="primary" @click="fetchList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="stats-card">
      <el-row :gutter="10">
        <el-col :span="8" class="stat-item"><div class="stat-label">活跃告警总数</div><div class="stat-value text-red">{{ total }}</div></el-col>
        <el-col :span="8" class="stat-item"><div class="stat-label">P1 紧急</div><div class="stat-value text-red">{{ p1Count }}</div></el-col>
        <el-col :span="8" class="stat-item"><div class="stat-label">P2 严重</div><div class="stat-value text-orange">{{ p2Count }}</div></el-col>
      </el-row>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" border stripe size="small" style="width:100%">
        <el-table-column type="selection" width="40" />
        <el-table-column label="告警名称" prop="rule_name" min-width="180" show-overflow-tooltip />
        <el-table-column label="级别" width="90" align="center">
          <template #default="{row}">
            <el-tag :type="severityType(row.severity)" size="small">{{ severityLabel(row.severity) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发时间" width="160" align="center">
          <template #default="{row}">{{ formatTime(row.trigger_time) }}</template>
        </el-table-column>
        <el-table-column label="持续时长" width="100" align="center">
          <template #default="{row}">{{ getDuration(row.trigger_time) }}</template>
        </el-table-column>
        <el-table-column label="当前值" min-width="150" show-overflow-tooltip>
          <template #default="{row}"><code style="font-size:11px">{{ row.value || '-' }}</code></template>
        </el-table-column>
        <el-table-column label="标签" min-width="200" show-overflow-tooltip>
          <template #default="{row}">
            <el-tag v-for="(v, k) in row.tags" :key="k" size="small" style="margin-right:4px">{{ k }}={{ v }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{row}">
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
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
import { listActiveAlerts, deleteActiveAlerts } from '@/api/monitor/n9e'

export default {
  name: 'AlertActive',
  data() {
    return {
      loading: false,
      tableData: [],
      total: 0,
      queryParams: { p: 0, limit: 20, query: '', severity: '' }
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
        const res = await listActiveAlerts(params)
        // 结构: {code:200, data: {list:[...], total:N}}
        const dat = (res.code === 200 && res.data) ? res.data : {}
        this.tableData = dat.list || []
        this.total = dat.total || this.tableData.length
      } catch (e) {
        this.$message.error('加载失败')
        console.error(e)
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.queryParams = { p: 1, limit: 20, query: '', severity: '' }
      this.fetchList()
    },
    handleSizeChange(size) { this.queryParams.limit = size; this.queryParams.p = 0; this.fetchList() },
    handlePageChange(page) { this.queryParams.p = page - 1; this.fetchList() },
    handleDelete(row) {
      this.$confirm(`确定要删除该告警吗？`, '提示', {
        confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
      }).then(async () => {
        try {
          await deleteActiveAlerts([row.id])
          this.$message.success('已删除')
          this.fetchList()
        } catch (e) { this.$message.error('删除失败') }
      }).catch(() => {})
    },
    severityLabel(s) { return { 1: 'P1 紧急', 2: 'P2 严重', 3: 'P3 警告' }[s] || s },
    severityType(s) { return { 1: 'danger', 2: 'warning', 3: 'primary' }[s] || 'info' },
    formatTime(ts) {
      if (!ts) return '-'
      const d = new Date(ts * 1000)
      return d.toLocaleString('zh-CN', { hour12: false })
    },
    getDuration(triggerTime) {
      if (!triggerTime) return '-'
      const now = Math.floor(Date.now() / 1000)
      const seconds = now - triggerTime
      if (seconds < 60) return seconds + 's'
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm'
      return Math.floor(seconds / 3600) + 'h'
    }
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.page-title { font-size: 18px; font-weight: 700; color: #303133; }
.filter-card { margin-bottom: 10px; background-color: #fcfcfc; }
.stats-card { margin-bottom: 15px; border-top: 3px solid #f56c6c; }
.stat-item { text-align: center; border-right: 1px solid #f0f0f0; min-height: 50px; }
.stat-item:last-child { border-right: none; }
.stat-label { font-size: 11px; color: #999; font-weight: bold; margin-bottom: 5px; white-space: nowrap; }
.stat-value { font-size: 16px; font-weight: bold; }
.text-red { color: #f56c6c; }
.text-orange { color: #e6a23c; }
</style>
