<template>
  <div class="app-container">
    <div class="page-header">
      <span class="page-title">通知规则关联配置</span>
      <div>
        <el-button @click="$router.back()">返回</el-button>
      </div>
    </div>

    <!-- 创建通知规则 -->
    <el-card shadow="never" style="margin-bottom: 12px;">
      <template #header>
        <div style="font-weight: 700;">创建通知规则</div>
      </template>

      <el-form ref="channelFormRef" :model="channelForm" :rules="channelRules" label-width="130px" size="small">
        <el-form-item label="通知规则名称" prop="name">
          <el-input v-model="channelForm.name" placeholder="例如：飞书-运维群、邮件-值班组" />
        </el-form-item>

        <el-form-item label="通知渠道" prop="channel_id">
          <el-select
            v-model="selectedChannelId"
            placeholder="请选择通知渠道"
            style="width:100%"
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

        <el-form-item
          v-for="p in customParams"
          :key="p.key"
          :label="p.cname || p.key"
        >
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
          <el-switch v-model="channelForm.disabled" :active-value="0" :inactive-value="1" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="savingChannel" @click="saveChannel">
            {{ editingRuleId ? '更新通知规则' : '创建通知规则' }}
          </el-button>
          <el-button v-if="editingRuleId" @click="resetEditor">取消编辑</el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <el-table :data="channelOptions" size="small" border>
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="渠道标识" prop="ident" width="180" />
        <el-table-column label="渠道名称" prop="name" min-width="180" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.enable ? 'success' : 'info'">
              {{ row.enable ? '可用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>


    <el-card shadow="never">
      <template #header>
        <div style="font-weight:700;">通知规则列表</div>
      </template>
      <el-table :data="notifyRuleList" size="small" border>
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="名称" prop="name" min-width="180" />
        <el-table-column label="启用" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enable ? 'success' : 'info'" size="small">
              {{ row.enable ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="渠道" min-width="160">
          <template #default="{ row }">
            {{ row.notify_configs?.[0]?.channel_id || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.update_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="editRule(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 第二步：关联告警规则 -->
    <el-card shadow="never">
      <template #header>
        <div style="font-weight: 700;">第二步：关联告警规则</div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px" size="small">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入通知规则名称" />
        </el-form-item>

        <el-form-item label="关联告警规则" prop="rule_ids">
          <el-select v-model="form.rule_ids" multiple filterable style="width:100%" placeholder="请选择告警规则">
            <el-option v-for="r in ruleOptions" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="通知规则" prop="notify_rule_ids">
          <el-select v-model="form.notify_rule_ids" multiple filterable style="width:100%" placeholder="请选择已有通知规则">
            <el-option
              v-for="n in notifyRuleOptions"
              :key="n.id"
              :label="n.name"
              :value="n.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="事件级别" prop="severities">
          <el-checkbox-group v-model="form.severities">
            <el-checkbox :value="1">P1</el-checkbox>
            <el-checkbox :value="2">P2</el-checkbox>
            <el-checkbox :value="3">P3</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="恢复通知">
          <el-switch v-model="form.notify_recovered" :active-value="1" :inactive-value="0" />
        </el-form-item>

        <el-form-item label="重复通知(秒)">
          <el-input-number v-model="form.notify_repeat_step" :min="0" :step="60" />
        </el-form-item>

        <el-form-item label="标签过滤">
          <div v-for="(t, i) in form.tags" :key="i" style="display:flex; margin-bottom:6px;">
            <el-input v-model="form.tags[i]" placeholder='格式: key=value 或 key=~".*"' style="margin-right:8px" />
            <el-button @click="removeTag(i)">删除</el-button>
          </div>
          <el-button @click="addTag">添加标签</el-button>
        </el-form-item>

        <el-form-item label="是否启用">
          <el-switch v-model="form.disabled" :active-value="0" :inactive-value="1" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">保存通知规则</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import {
  getAlertRuleOptions,
  listNotifyRules,
  createNotifyRule,
  updateNotifyRule,
  listSimplifiedNotifyChannelConfigs
} from '@/api/monitor/n9e'

export default {
  name: 'NotificationRuleAdd',
  data() {
    return {
      submitting: false,
      savingChannel: false,
      ruleOptions: [],
      channelOptions: [],
      notifyRuleList: [],
      channelCatalog: [],
      selectedChannelId: null,
      selectedChannel: null,
      channelParams: {},
      contactValue: '',
      editingRuleId: null,

      // 第二步：通知规则
      form: {
        name: '',
        rule_ids: [],
        notify_rule_ids: [], // 原来 channel_ids
        severities: [1, 2, 3],
        notify_recovered: 1,
        notify_repeat_step: 0,
        tags: [],
        disabled: 0
      },
      rules: {
        name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
        rule_ids: [{ required: true, type: 'array', min: 1, message: '请至少选择一个告警规则', trigger: 'change' }],
        notify_rule_ids: [{ required: true, type: 'array', min: 1, message: '请至少选择一个通知渠道', trigger: 'change' }],
        severities: [{ required: true, type: 'array', min: 1, message: '请至少选择一个级别', trigger: 'change' }]
      },

      // 第一步：渠道配置
      channelForm: {
        name: ''
      },
      channelRules: {
        name: [{ required: true, message: '请输入通知规则名称', trigger: 'blur' }]
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
    notifyRuleOptions() {
      return Array.isArray(this.notifyRuleList) ? this.notifyRuleList : []
    }
  },
  created() {
    this.loadRuleOptions()
    this.loadChannelOptions()
    this.loadNotifyRules()
    this.loadChannelCatalog()
  },
  methods: {
    channelTypeLabel(type) {
      const map = { dingtalk: '钉钉', feishu: '飞书', email: '邮件', sms: '短信' }
      return map[type] || type || '-'
    },

    async loadRuleOptions() {
      try {
        const res = await getAlertRuleOptions({ p: 0, limit: 200 })
        this.ruleOptions = Array.isArray(res.data) ? res.data : []
      } catch (e) {
        this.$message.error('加载告警规则失败')
      }
    },

    async loadChannelOptions() {
      try {
        const res = await listSimplifiedNotifyChannelConfigs()
        const payload = typeof res === 'string' ? JSON.parse(res) : res
        const list = Array.isArray(payload?.dat) ? payload.dat : []
        this.channelOptions = list
          .filter(i => i.enable) // 只显示可用
          .map(i => ({
            id: i.id,
            ident: i.ident,
            name: i.name,
            enable: !!i.enable
        }))
      } catch (e) {
        this.$message.error('加载通知渠道失败')
      }
    },

    async loadNotifyRules() {
      try {
        const res = await listNotifyRules({ p: 1, limit: 200 })
        const payload = typeof res === 'string' ? JSON.parse(res) : res
        const dat = payload?.dat ?? payload?.data?.dat ?? payload?.data ?? []
        const list = Array.isArray(dat) ? dat : (dat?.list || [])
        this.notifyRuleList = list
      } catch (e) {
        this.$message.error('加载通知规则失败')
      }
    },

    async loadChannelCatalog() {
      const res = await listSimplifiedNotifyChannelConfigs()
      const payload = typeof res === 'string' ? JSON.parse(res) : res
      const list = Array.isArray(payload?.dat) ? payload.dat : []
      // 只给用户选 enable=true 的渠道
      this.channelCatalog = list.filter(i => i.enable)
    },

    onChannelChange(channelId) {
      this.selectedChannel = this.channelCatalog.find(i => i.id === channelId) || null
      this.channelParams = {}
      ;(this.selectedChannel?.param_config?.custom?.params || []).forEach(p => {
        this.channelParams[p.key] = ''
      })
      this.contactValue = '' // 邮箱/手机号输入
    },

    saveChannel() {
      this.$refs.channelFormRef.validate(async valid => {
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

        this.savingChannel = true
        try {
          const payload = {
            name: this.channelForm.name,
            enable: true,
            notify_configs: [
              {
                channel_id: this.selectedChannelId,
                template_id: 0,
                params,
                severities: [1, 2, 3],
                time_ranges: [],
                label_keys: null,
                attributes: null
              }
            ]
          }
          if (this.editingRuleId) {
            payload.id = this.editingRuleId
            await updateNotifyRule([payload])   // 你这个后端是数组
            this.$message.success('通知规则已更新')
          } else {
            await createNotifyRule([payload])
            this.$message.success('通知规则已创建')
          }
          await this.loadNotifyRules()
          this.resetEditor()
        } catch (e) {
          this.$message.error('创建失败：' + (e?.response?.data?.msg || e.message || '未知错误'))
        } finally {
          this.savingChannel = false
        }
      })
    },

    addTag() {
      this.form.tags.push('')
    },
    removeTag(i) {
      this.form.tags.splice(i, 1)
    },

    formatTime(ts) {
      if (!ts) return '-'
      const d = new Date(ts * 1000)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    resetEditor() {
      this.editingRuleId = null
      this.channelForm.name = ''
      this.selectedChannelId = null
      this.selectedChannel = null
      this.channelParams = {}
      this.contactValue = ''
    },
    editRule(row) {
      this.editingRuleId = row.id
      this.channelForm.name = row.name || ''
      const cfg = row.notify_configs?.[0] || {}
      this.selectedChannelId = cfg.channel_id || null
      this.onChannelChange(this.selectedChannelId)
      const params = cfg.params || {}
      Object.keys(this.channelParams).forEach(k => {
        this.channelParams[k] = params[k] ?? ''
      })
      if (this.contactKey) {
        const v = params[this.contactKey]
        this.contactValue = Array.isArray(v) ? v.join(',') : (v || '')
      }
    },

  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.page-title { font-size: 18px; font-weight: 700; color: #303133; }
</style>