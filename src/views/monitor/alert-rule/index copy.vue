<template>
  <div class="app-container">
    <div class="page-header">
      <span class="page-title">告警规则</span>
      <div>
        <el-button size="small" @click="openConfigDialog">N9e 连接配置</el-button>
        <el-button size="small" type="success" @click="$router.push('/notification-rule/index')">新增通知规则</el-button>
        <el-button type="primary" size="small" @click="openAddDialog">新增规则</el-button>
        <el-button size="small" @click="fetchList">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small">
        <el-form-item label="规则名称">
          <el-input v-model="queryParams.query" placeholder="搜索规则名称" clearable style="width:200px" @keyup.enter="fetchList" />
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
        <el-col :span="6" class="stat-item"><div class="stat-label">规则总数</div><div class="stat-value text-blue">{{ total }}</div></el-col>
        <el-col :span="6" class="stat-item"><div class="stat-label">启用中</div><div class="stat-value text-green">{{ enabledCount }}</div></el-col>
        <el-col :span="6" class="stat-item"><div class="stat-label">已禁用</div><div class="stat-value text-gray">{{ disabledCount }}</div></el-col>
        <el-col :span="6" class="stat-item"><div class="stat-label">N9e 地址</div><div class="stat-value text-black" style="font-size:12px">{{ n9eBaseUrl || '-' }}</div></el-col>
      </el-row>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" border stripe size="small" style="width:100%">
        <el-table-column type="selection" width="40" />
        <el-table-column label="规则名称" prop="name" min-width="180" show-overflow-tooltip />
        <el-table-column label="级别" width="90" align="center">
          <template #default="{row}">
            <el-tag :type="severityType(row.severity)" size="small">{{ severityLabel(row.severity) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="PromQL" prop="prom_ql" min-width="220" show-overflow-tooltip>
          <template #default="{row}">
            <code style="font-size:11px;color:#476582">
              {{ (row.rule_config && row.rule_config.queries && row.rule_config.queries[0] && row.rule_config.queries[0].prom_ql) || row.prom_ql || '-' }}
            </code>
          </template>
        </el-table-column>
        <el-table-column label="持续时长" width="90" align="center">
          <template #default="{row}">{{ row.prom_for_duration }}s</template>
        </el-table-column>
        <el-table-column label="评估间隔" width="90" align="center">
          <template #default="{row}">{{ row.prom_eval_interval }}s</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{row}">
            <el-switch :model-value="row.disabled === 0" @change="toggleStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="155" align="center">
          <template #default="{row}">{{ formatTime(row.update_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="form.id ? '编辑告警规则' : '新增告警规则'" v-model="dialogVisible" width="680px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="ruleForm" label-width="110px" size="small">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="告警级别" prop="severity">
          <el-radio-group v-model="form.severity">
            <el-radio-button :label="1"><span style="color:#f56c6c">P1 紧急</span></el-radio-button>
            <el-radio-button :label="2"><span style="color:#e6a23c">P2 严重</span></el-radio-button>
            <el-radio-button :label="3"><span style="color:#409eff">P3 警告</span></el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数据源">
          <el-select v-model="form.datasource_ids" multiple placeholder="选择数据源" style="width:100%">
            <el-option v-for="ds in datasources" :key="ds.id" :label="ds.name" :value="ds.id" />
          </el-select>
          <div style="font-size:11px;color:#909399;margin-top:3px">选择该规则关联的 Prometheus 数据源</div>
        </el-form-item>
        <el-form-item label="PromQL" prop="prom_ql">
          <el-input v-model="form.prom_ql" type="textarea" :rows="3" placeholder="如：up == 0" />
          <div style="font-size:11px;color:#909399;margin-top:3px">表达式结果为非空时触发告警</div>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="持续时长(s)" prop="prom_for_duration">
              <el-input-number v-model="form.prom_for_duration" :min="0" :step="10" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="评估间隔(s)" prop="prom_eval_interval">
              <el-input-number v-model="form.prom_eval_interval" :min="10" :step="10" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="附加标签">
          <div v-for="(tag, idx) in form.append_tags" :key="idx" style="display:flex;margin-bottom:6px">
            <el-input v-model="form.append_tags[idx]" placeholder="key=value" size="small" style="flex:1;margin-right:6px" />
            <el-button size="small" circle @click="removeTag(idx)">-</el-button>
          </div>
          <el-button size="small" @click="addTag">添加标签</el-button>
          <div style="font-size:11px;color:#909399;margin-top:3px">格式：key=value</div>
        </el-form-item>
        <el-form-item label="告警注释">
          <el-input v-model="form.annotations.summary" type="textarea" :rows="2" placeholder="告警描述，支持 $labels.xxx 变量" />
        </el-form-item>
        <el-form-item label="恢复通知">
          <el-switch v-model="form.notify_recovered" :active-value="1" :inactive-value="0" active-text="开" inactive-text="关" />
          <span style="font-size:11px;color:#909399;margin-left:8px">告警恢复时是否发送通知</span>
        </el-form-item>
        <el-form-item label="重复通知(s)">
          <el-input-number v-model="form.notify_repeat_step" :min="0" :step="60" style="width:160px" />
          <span style="font-size:11px;color:#909399;margin-left:8px">重复通知间隔，0表示不重复</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- N9e 配置对话框 -->
    <el-dialog title="N9e 连接配置" v-model="configDialogVisible" width="480px">
      <el-form :model="configForm" label-width="110px" size="small">
        <el-form-item label="N9e 地址">
          <el-input v-model="configForm.baseUrl" placeholder="如：http://39.96.35.84:6005" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="configForm.username" placeholder="root" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="configForm.password" type="password" placeholder="不修改请留空" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="configSaving" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import {
  listAlertRules, createAlertRule, updateAlertRule,
  deleteAlertRules, updateAlertRuleStatus,
  getN9eConfig, updateN9eConfig,
  listDatasources  // 添加这行
} from '@/api/monitor/n9e'

export default {
  name: 'AlertRule',
  data() {
    return {
      loading: false,
      submitting: false,
      tableData: [],
      datasources: [],  // 数据源列表
      total: 0,
      queryParams: { p: 0, limit: 20, query: '', severity: '' },
      dialogVisible: false,
      form: this.defaultForm(),
      rules: {
        name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
        prom_ql: [{ required: true, message: '请输入 PromQL 表达式', trigger: 'blur' }],
        severity: [{ required: true, message: '请选择告警级别', trigger: 'change' }],
        prom_for_duration: [{ required: true, message: '请输入持续时长', trigger: 'blur' }],
        prom_eval_interval: [{ required: true, message: '请输入评估间隔', trigger: 'blur' }]
      },
      n9eBaseUrl: '',
      configDialogVisible: false,
      configForm: { baseUrl: '', username: '', password: '' },
      configSaving: false
    }
  },
  computed: {
    enabledCount() { return this.tableData.filter(r => r.disabled === 0).length },
    disabledCount() { return this.tableData.filter(r => r.disabled === 1).length }
  },
  created() {
    this.fetchConfig()
    this.fetchDatasources()  // 添加这行
    this.fetchList()
  },
  methods: {
    defaultForm() {
      return {
        id: null, name: '', severity: 2, prom_ql: '',
        prom_for_duration: 60, prom_eval_interval: 15,
        append_tags: [], annotations: { summary: '' },
        notify_recovered: 1, notify_repeat_step: 0, disabled: 0,
        datasource_ids: [1]  // 添加这行，默认选择 ID=1 的数据源
      }
    },
    async fetchList() {
      this.loading = true
      try {
        // 获取全量数据，前端过滤
        const params = { p: 0, limit: 1000 }
        const res = await listAlertRules(params)
        const dat = (res.data && res.data.dat) || res.dat || []
        let list = Array.isArray(dat) ? dat : (dat.list || [])
    
        // 前端关键字过滤
        if (this.queryParams.query) {
          const kw = this.queryParams.query.toLowerCase()
          list = list.filter(r => r.name && r.name.toLowerCase().includes(kw))
        }
        // 前端 severity 过滤
        if (this.queryParams.severity !== '') {
          list = list.filter(r => r.severity === this.queryParams.severity)
        }
    
        this.tableData = list
        this.total = list.length
      } catch (e) {
        this.$message.error('加载失败，请检查 N9e 连接配置')
        console.error(e)
      } finally {
        this.loading = false
      }
    },
    async fetchConfig() {
      try {
        const res = await getN9eConfig()
        if (res.code === 200) {
          this.n9eBaseUrl = res.data.baseUrl
          this.configForm = { baseUrl: res.data.baseUrl, username: res.data.username, password: '' }
        }
      } catch (e) { console.warn('获取N9e配置失败', e) }
    },
    async fetchDatasources() {
      try {
        const res = await listDatasources()
        if (res.code === 200 && Array.isArray(res.data)) {
          this.datasources = res.data
        } else {
          this.datasources = []
        }
      } catch (e) {
        console.warn('获取数据源失败', e)
      }
    },
    resetQuery() {
      this.queryParams = { p: 0, limit: 20, query: '', severity: '' }
      this.fetchList()
    },
    handleSizeChange(size) { this.queryParams.limit = size; this.queryParams.p = 0; this.fetchList() },
    handlePageChange(page) { this.queryParams.p = page - 1; this.fetchList() },
    openAddDialog() { this.form = this.defaultForm(); this.dialogVisible = true },
    openEditDialog(row) {
      // 从 rule_config 里提取 prom_ql
      const promQl = (row.rule_config && row.rule_config.queries && row.rule_config.queries[0] && row.rule_config.queries[0].prom_ql) || row.prom_ql || ''

      this.form = {
        ...this.defaultForm(),
        ...row,
        prom_ql: promQl,  // 覆盖为正确的值
        append_tags: Array.isArray(row.append_tags) ? [...row.append_tags] : [],
        datasource_ids: Array.isArray(row.datasource_ids) && row.datasource_ids.length > 0
          ? [...row.datasource_ids]
          : [1],
        annotations: row.annotations && typeof row.annotations === 'object' ? { ...row.annotations } : { summary: row.annotations || '' }
      }
      this.dialogVisible = true
    },
    resetForm() {
      this.form = this.defaultForm()
      this.$nextTick(() => { if (this.$refs.ruleForm) this.$refs.ruleForm.clearValidate() })
    },
    addTag() { this.form.append_tags.push('') },
    removeTag(idx) { this.form.append_tags.splice(idx, 1) },
    submitForm() {
      this.$refs.ruleForm.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const annotations = typeof this.form.annotations === 'string'
            ? { summary: this.form.annotations }
            : (this.form.annotations || {})
          // 解码 HTML 实体
          const promQl = this.decodeHtml(this.form.prom_ql)
          const payload = {
            id: this.form.id,
            name: this.form.name,
            severity: this.form.severity,
            prom_for_duration: this.form.prom_for_duration,
            prom_eval_interval: this.form.prom_eval_interval,
            append_tags: this.form.append_tags.filter(t => t.trim()),
            annotations,
            notify_recovered: this.form.notify_recovered,
            notify_repeat_step: this.form.notify_repeat_step,
            disabled: this.form.disabled,
            // N9e 必需字段
            group_id: this.form.group_id || 1,
            cate: this.form.cate || 'prometheus',
            prod: this.form.prod || 'metric',
            datasource_queries: (this.form.datasource_ids && this.form.datasource_ids.length > 0
              ? this.form.datasource_ids
              : [1]).map(id => ({ match_type: 0, op: 'in', values: [id] })),
            datasource_value: (this.form.datasource_ids && this.form.datasource_ids.length > 0)
              ? this.form.datasource_ids[0]
              : 1,
            rule_config: {
              inhibit: false,
              queries: [{
                prom_ql: promQl,
                severity: this.form.severity,
                recover_config: { judge_type: 0, recover_exp: '' },
                unit: '',
                var_enabled: false,
                var_config: { child_var_configs: null, param_val: null }
              }]
            }
          }

          if (this.form.id) {
            await updateAlertRule(payload)
            this.$message.success('规则已更新')
          } else {
            await createAlertRule([payload])
            this.$message.success('规则已创建')
          }
          this.dialogVisible = false
          this.fetchList()
        } catch (e) {
          this.$message.error('保存失败：' + (e.message || '请检查 N9e 连接'))
        } finally {
          this.submitting = false
        }
      })
    },
    async toggleStatus(row) {
      const disabled = row.disabled === 0 ? 1 : 0
      try {
        await updateAlertRuleStatus([row.id], disabled)
        row.disabled = disabled
        this.$message.success(disabled === 0 ? '已启用' : '已禁用')
      } catch (e) { this.$message.error('状态更新失败') }
    },
    handleDelete(row) {
      this.$confirm(`确定要删除规则「${row.name}」吗？`, '提示', {
        confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
      }).then(async () => {
        try {
          await deleteAlertRules([row.id])
          this.$message.success('已删除')
          this.fetchList()
        } catch (e) { this.$message.error('删除失败') }
      }).catch(() => {})
    },
    openConfigDialog() { this.fetchConfig(); this.configDialogVisible = true },
    async saveConfig() {
      this.configSaving = true
      try {
        await updateN9eConfig(this.configForm)
        this.$message.success('配置已保存，正在重新连接...')
        this.configDialogVisible = false
        this.n9eBaseUrl = this.configForm.baseUrl
        setTimeout(() => this.fetchList(), 1500)
      } catch (e) {
        this.$message.error('保存失败')
      } finally { this.configSaving = false }
    },
    severityLabel(s) { return { 1: 'P1 紧急', 2: 'P2 严重', 3: 'P3 警告' }[s] || s },
    severityType(s) { return { 1: 'danger', 2: 'warning', 3: 'primary' }[s] || 'info' },
    formatTime(ts) {
      if (!ts) return '-'
      const d = new Date(ts * 1000)
      return d.toLocaleString('zh-CN', { hour12: false })
    },
    decodeHtml(html) {
      const txt = document.createElement('textarea')
      txt.innerHTML = html
      return txt.value
    }
  }
  
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.page-title { font-size: 18px; font-weight: 700; color: #303133; }
.filter-card { margin-bottom: 10px; background-color: #fcfcfc; }
.stats-card { margin-bottom: 15px; border-top: 3px solid #e6a23c; }
.stat-item { text-align: center; border-right: 1px solid #f0f0f0; }
</style>