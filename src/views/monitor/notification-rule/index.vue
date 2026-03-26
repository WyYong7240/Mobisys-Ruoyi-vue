<template>
  <div class="app-container">
    <div class="page-header">
      <span class="page-title">通知规则</span>
      <div>
        <el-button type="primary" @click="openCreateDialog">新建规则</el-button>
        <el-button @click="loadNotifyRules">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never" style="margin-bottom: 12px;">
      <el-table v-loading="loading" :data="notifyRuleList" size="small" border>
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="规则名称" prop="name" min-width="180" />
        <el-table-column label="渠道" min-width="180">
          <template #default="{ row }">
            {{ channelNameById(row.notify_configs?.[0]?.channel_id) }}
          </template>
        </el-table-column>
        <el-table-column label="通知模板" min-width="200">
          <template #default="{ row }">
            {{ templateNameById(row.notify_configs?.[0]?.template_id) }}
          </template>
        </el-table-column>
        <el-table-column label="启用" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enable ? 'success' : 'info'" size="small">
              {{ row.enable ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170" align="center">
          <template #default="{ row }">
            {{ formatTime(row.update_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>


    <el-dialog
      v-model="dialogVisible"
      :title="editingRuleId ? '编辑通知规则' : '新建通知规则'"
      width="640px"
      @close="resetDialog"
    >
      <el-form ref="dialogFormRef" :model="channelForm" :rules="channelRules" label-width="130px" size="small">
        <el-form-item label="通知规则名称" prop="name">
          <el-input v-model="channelForm.name" placeholder="例如：飞书-运维群告警" />
        </el-form-item>

        <el-form-item label="通知渠道">
          <el-select
            v-model="selectedChannelId"
            placeholder="请选择通知渠道"
            style="width: 100%"
            @change="onChannelChange"
          >
            <el-option
              v-for="c in channelCatalog"
              :key="c.id"
              :label="`${c.name}（${c.ident}）`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="通知模板" prop="template_id">
          <el-select
            v-model="channelForm.template_id"
            placeholder="请选择通知模板"
            style="width: 100%"
          >
            <el-option
              v-for="t in filteredTplOptions"
              :key="t.id"
              :label="`${t.name}（ID:${t.id}）`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-for="p in customParams" :key="p.key" :label="p.cname || p.key">
          <el-input
            v-model="channelParams[p.key]"
            :placeholder="`请输入 ${p.cname || p.key}`"
          />
        </el-form-item>

        <el-form-item v-if="contactKey" :label="contactKey === 'email' ? '邮箱' : '手机号'">
          <el-input
            v-model="contactValue"
            :placeholder="contactKey === 'email' ? '多个邮箱逗号分隔' : '多个手机号逗号分隔'"
          />
        </el-form-item>

        <el-form-item label="是否启用">
          <el-switch v-model="channelForm.enable" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitDialog">
          {{ editingRuleId ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>


  </div>
</template>

<script>
import {
  listNotifyRules,
  createNotifyRule,
  updateNotifyRule,
  listSimplifiedNotifyChannelConfigs,
  listMessageTemplates,
  getAlertRuleOptions,
  listSubscribes,
  createSubscribe,
  updateSubscribe,
  deleteSubscribes
} from '@/api/monitor/n9e'

export default {
  name: 'NotificationRule',
  data() {
    return {
      loading: false,
      saving: false,
      dialogVisible: false,
      editingRuleId: null,
      notifyRuleList: [],
      notifyTplOptions: [],
      channelCatalog: [],
      selectedChannelId: null,
      selectedChannel: null,
      channelParams: {},
      contactValue: '',
      channelForm: {
        name: '',
        enable: true,
        template_id: null
      },
      channelRules: {
        name: [{ required: true, message: '请输入通知规则名称', trigger: 'blur' }],
        template_id: [{ required: true, message: '请选择通知模板', trigger: 'change' }]
      },
      subscribeLoading: false,
      subscribeDialogVisible: false,
      editingSubscribeId: null,
      subscribeList: [],
      alertRuleOptions: [],
      subscribeForm: {
        name: '',
        rule_ids: [],
        notify_rule_ids: [],
        severities: [1, 2, 3],
        disabled: 0
      },
      subscribeRules: {
        name: [{ required: true, message: '请输入关联名称', trigger: 'blur' }],
        rule_ids: [{ required: true, type: 'array', min: 1, message: '请至少选择一个告警规则', trigger: 'change' }],
        notify_rule_ids: [{ required: true, type: 'array', min: 1, message: '请至少选择一个通知规则', trigger: 'change' }]
      }

    }
  },
  computed: {
    customParams() {
      return this.selectedChannel?.param_config?.custom?.params || []
    },
    contactKey() {
      return this.selectedChannel?.param_config?.user_info?.contact_key || ''
    },
    filteredTplOptions() {
      return this.notifyTplOptions
    }
  },
  created() {
    this.initPage()
  },
  methods: {
    async initPage() {
      await Promise.all([
        this.loadChannelCatalog(),
        this.loadNotifyRules()
      ])
      if (this.selectedChannelId) {
        await this.loadNotifyTplOptions(this.selectedChannelId)
      }
    },

    normalizeRes(res) {
      return typeof res === 'string' ? JSON.parse(res) : res
    },

    async loadNotifyRules() {
      this.loading = true
      try {
        const res = await listNotifyRules({ p: 1, limit: 500 })
        const payload = this.normalizeRes(res)
        this.notifyRuleList = Array.isArray(payload?.dat) ? payload.dat : []
      } catch (e) {
        this.$message.error('加载通知规则失败')
      } finally {
        this.loading = false
      }
    },

    async loadNotifyTplOptions(channelId) {
      if (!channelId) {
        this.notifyTplOptions = []
        return
      }
      try {
        const res = await listMessageTemplates({ notify_channel_ids: channelId, p: 1, limit: 500 })
        const payload = this.normalizeRes(res)
        const dat = payload?.dat ?? payload?.data?.dat ?? payload?.data ?? []
        const list = Array.isArray(dat) ? dat : (dat?.list || [])
        this.notifyTplOptions = list
      } catch (e) {
        this.notifyTplOptions = []
        this.$message.error('加载通知模板失败')
      }
    },

    async loadChannelCatalog() {
      try {
        const res = await listSimplifiedNotifyChannelConfigs()
        const payload = this.normalizeRes(res)
        const list = Array.isArray(payload?.dat) ? payload.dat : []
        this.channelCatalog = list.filter(i => i.enable)
      } catch (e) {
        this.$message.error('加载通知渠道失败')
      }
    },

    channelNameById(id) {
      if (!id) return '-'
      const hit = this.channelCatalog.find(c => c.id === id)
      return hit ? `${hit.name}（${hit.ident}）` : String(id)
    },

    templateNameById(id) {
      if (!id) return '-'
      const hit = this.notifyTplOptions.find(t => Number(t.id) === Number(id))
      return hit ? `${hit.name}（ID:${hit.id}）` : `ID:${id}`
    },

    formatTime(ts) {
      if (!ts) return '-'
      const d = new Date(ts * 1000)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },

    async openCreateDialog() {
      this.editingRuleId = null
      this.resetDialog()
      this.dialogVisible = true
      if (this.selectedChannelId) {
        await this.loadNotifyTplOptions(this.selectedChannelId)
      }
    },

    async openEditDialog(row) {
      this.editingRuleId = row.id
      this.dialogVisible = true

      this.channelForm.name = row.name || ''
      this.channelForm.enable = row.enable !== false

      const cfg = row.notify_configs?.[0] || {}
      this.selectedChannelId = cfg.channel_id || null
      await this.onChannelChange(this.selectedChannelId)
      this.channelForm.template_id = cfg.template_id ?? null

      const params = cfg.params || {}
      Object.keys(this.channelParams).forEach(k => {
        this.channelParams[k] = params[k] ?? ''
      })

      if (this.contactKey) {
        const v = params[this.contactKey]
        this.contactValue = Array.isArray(v) ? v.join(',') : (v || '')
      }
    },

    resetDialog() {
      this.channelForm = { name: '', enable: true, template_id: null }
      this.selectedChannelId = null
      this.selectedChannel = null
      this.channelParams = {}
      this.contactValue = ''
      this.$nextTick(() => {
        this.$refs.dialogFormRef?.clearValidate()
      })
    },

    async onChannelChange(channelId) {
      this.selectedChannel = this.channelCatalog.find(i => i.id === channelId) || null
      this.channelParams = {}
      ;(this.selectedChannel?.param_config?.custom?.params || []).forEach(p => {
        this.channelParams[p.key] = ''
      })
      await this.loadNotifyTplOptions(channelId)
      this.contactValue = ''
    },

    async submitDialog() {
      this.$refs.dialogFormRef.validate(async valid => {
        if (!valid) return
        if (!this.selectedChannelId) {
          this.$message.warning('请选择通知渠道')
          return
        }

        const params = { ...this.channelParams }
        if (this.contactKey && this.contactValue.trim()) {
          params[this.contactKey] = this.contactValue
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        }

        const payload = {
          name: this.channelForm.name,
          enable: !!this.channelForm.enable,
          notify_configs: [
            {
              channel_id: this.selectedChannelId,
              template_id: this.channelForm.template_id,
              params,
              severities: [1, 2, 3],
              time_ranges: [],
              label_keys: null,
              attributes: null
            }
          ]
        }

        this.saving = true
        try {
          if (this.editingRuleId) {
            payload.id = this.editingRuleId
            await updateNotifyRule(this.editingRuleId, payload)
            this.$message.success('通知规则已更新')
          } else {
            await createNotifyRule([payload])
            this.$message.success('通知规则已创建')
          }
          this.dialogVisible = false
          await this.loadNotifyRules()
        } catch (e) {
          this.$message.error('保存失败：' + (e?.response?.data?.msg || e.message || '未知错误'))
        } finally {
          this.saving = false
        }
      })
    },

    async loadAlertRuleOptions() {
      const res = await getAlertRuleOptions({ p: 0, limit: 500 })
      this.alertRuleOptions = Array.isArray(res?.data) ? res.data : []
    },

    async loadSubscribes() {
      this.subscribeLoading = true
      try {
        const res = await listSubscribes({ p: 1, limit: 500 })
        const payload = typeof res === 'string' ? JSON.parse(res) : res
        const dat = payload?.dat ?? payload?.data?.dat ?? payload?.data ?? []
        this.subscribeList = Array.isArray(dat) ? dat : (dat?.list || [])
      } finally {
        this.subscribeLoading = false
      }
    },

    openCreateSubscribeDialog() {
      this.editingSubscribeId = null
      this.subscribeForm = { name: '', rule_ids: [], notify_rule_ids: [], severities: [1,2,3], disabled: 0 }
      this.subscribeDialogVisible = true
    },

    openEditSubscribeDialog(row) {
      this.editingSubscribeId = row.id
      this.subscribeForm = {
        name: row.name || '',
        rule_ids: row.rule_ids || [],
        notify_rule_ids: row.notify_rule_ids || [],
        severities: row.severities || [1,2,3],
        disabled: Number(row.disabled || 0)
      }
      this.subscribeDialogVisible = true
    },

    async submitSubscribeDialog() {
      this.$refs.subscribeFormRef.validate(async valid => {
        if (!valid) return
        const payload = { id: this.editingSubscribeId || undefined, ...this.subscribeForm }
        if (this.editingSubscribeId) {
          await updateSubscribe(payload)
          this.$message.success('关联已更新')
        } else {
          await createSubscribe(payload)
          this.$message.success('关联已创建')
        }
        this.subscribeDialogVisible = false
        await this.loadSubscribes()
      })
    },

    async deleteSubscribe(row) {
      await this.$confirm(`确认删除关联“${row.name}”吗？`, '提示', { type: 'warning' })
      await deleteSubscribes([row.id])
      this.$message.success('已删除')
      await this.loadSubscribes()
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}
</style>