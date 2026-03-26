<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 左侧树状图 -->
      <el-col :span="4">
        <div class="tree-container">
          <el-input
            v-model="treeSearch"
            placeholder="搜索设备"
            clearable
            prefix-icon="el-icon-search"
            style="margin-bottom: 15px"
          />
          <el-tree
            :data="deviceTree"
            :props="treeProps"
            :filter-node-method="filterNode"
            node-key="deviceId"
            ref="deviceTreeRef"
            highlight-current
            default-expand-all
            @node-click="handleNodeClick"
          />
        </div>
      </el-col>

      <!-- 右侧内容 -->
      <el-col :span="20">
        <!-- 搜索栏 -->
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="88px">
          <el-form-item label="应用名称" prop="appName">
            <el-input
              v-model="queryParams.appName"
              placeholder="请输入应用名称"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item label="应用分类" prop="category">
            <el-input
              v-model="queryParams.category"
              placeholder="请输入应用分类"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item label="负责人" prop="leader">
            <el-input
              v-model="queryParams.leader"
              placeholder="请输入负责人"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item label="应用状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
              <el-option label="正常" :value="0" />
              <el-option label="禁用" :value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <!-- 操作按钮 -->
        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="primary" plain icon="el-icon-plus" size="mini"
              @click="handleAdd" v-hasPermi="['device:jars:add']">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="el-icon-edit" size="mini"
              :disabled="single" @click="handleUpdate" v-hasPermi="['device:jars:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="el-icon-delete" size="mini"
              :disabled="multiple" @click="handleDelete" v-hasPermi="['device:jars:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="el-icon-download" size="mini"
              @click="handleExport" v-hasPermi="['device:jars:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>

        <!-- 数据表格 -->
        <el-table v-loading="loading" :data="jarsList" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="应用ID" align="center" prop="jarsId" width="80" />
          <el-table-column label="所属设备" align="center" prop="deviceId">
            <template #default="scope">
              {{ getDeviceName(scope.row.deviceId) }}
            </template>
          </el-table-column>
          <el-table-column label="应用名称" align="center" prop="appName" min-width="140" show-overflow-tooltip />
          <el-table-column label="中文名称" align="center" prop="appNameCn" min-width="120" show-overflow-tooltip />
          <el-table-column label="应用分类" align="center" prop="category" width="100">
            <template #default="scope">
              <el-tag type="info" size="small">{{ scope.row.category || 'default' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" align="center" prop="status" width="80">
            <template #default="scope">
              <el-tag :type="scope.row.status === 0 ? 'success' : 'danger'" size="small">
                {{ scope.row.status === 0 ? '正常' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="IP地址" align="center" prop="ipAddress" width="130" />
          <el-table-column label="端口" align="center" prop="port" width="70" />
          <el-table-column label="Metrics端口" align="center" prop="metricsPort" width="100" />
          <el-table-column label="Java版本" align="center" prop="javaVersion" width="90" />
          <el-table-column label="负责人" align="center" prop="leader" width="90" />
          <el-table-column label="创建时间" align="center" prop="createTime" width="160" />
          <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
            <template #default="scope">
              <el-button size="mini" type="text" icon="el-icon-edit"
                @click="handleUpdate(scope.row)" v-hasPermi="['device:jars:edit']">修改</el-button>
              <el-button size="mini" type="text" icon="el-icon-delete"
                @click="handleDelete(scope.row)" v-hasPermi="['device:jars:remove']">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination
          v-show="total > 0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="getList"
        />

        <!-- 新增/修改对话框 -->
        <el-dialog :title="title" v-model="open" width="600px" append-to-body>
          <el-form ref="jarsRef" :model="form" :rules="rules" label-width="110px">
            <el-row>
              <el-col :span="12">
                <el-form-item label="所属设备" prop="deviceId">
                  <el-select v-model="form.deviceId" placeholder="请选择具体机器" style="width: 100%" clearable filterable @change="handleDeviceSelect">
                    <el-option-group
                      v-for="group in deviceGroupOptions"
                      :key="group.label"
                      :label="group.label"
                    >
                      <el-option
                        v-for="item in group.options"
                        :key="item.physicalId"
                        :label="item.physicalName"
                        :value="item.physicalId"
                      />
                    </el-option-group>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="应用状态" prop="status">
                  <el-radio-group v-model="form.status">
                    <el-radio :label="0">正常</el-radio>
                    <el-radio :label="1">禁用</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="应用名称" prop="appName">
                  <el-input v-model="form.appName" placeholder="请输入应用名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="应用分类" prop="category">
                  <el-input v-model="form.category" placeholder="如: web, scheduler" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="中文名称" prop="appNameCn">
                  <el-input v-model="form.appNameCn" placeholder="请输入应用中文名称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="IP地址" prop="ipAddress">
                  <el-input v-model="form.ipAddress" placeholder="请输入部署主机IP" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="监听端口" prop="port">
                  <el-input v-model="form.port" placeholder="请输入应用端口" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="Metrics端口" prop="metricsPort">
                  <el-input v-model="form.metricsPort" placeholder="Prometheus抓取端口" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Metrics路径" prop="metricsPath">
                  <el-input v-model="form.metricsPath" placeholder="/actuator/prometheus" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="Java版本" prop="javaVersion">
                  <el-select v-model="form.javaVersion" placeholder="请选择Java版本" style="width:100%">
                    <el-option label="Java 8"  value="1.8" />
                    <el-option label="Java 11" value="11" />
                    <el-option label="Java 17" value="17" />
                    <el-option label="Java 21" value="21" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="负责人" prop="leader">
                  <el-input v-model="form.leader" placeholder="请输入负责人" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="部署路径" prop="deployPath">
              <el-input v-model="form.deployPath" placeholder="如: /opt/apps/order-service.jar" />
            </el-form-item>
            <el-form-item label="JVM参数" prop="jvmArgs">
              <el-input v-model="form.jvmArgs" placeholder="如: -Xms512m -Xmx1g" />
            </el-form-item>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button type="primary" @click="submitForm">确 定</el-button>
            <el-button @click="cancel">取 消</el-button>
          </template>
        </el-dialog>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { listJars, getJars, delJars, addJars, updateJars } from "@/api/device/jars"
import { listDeviceManagerTree, getListByDeviceId } from "@/api/device/master"

export default {
  name: "Jars",
  data() {
    return {
      loading: true,
      ids: [],
      single: true,
      multiple: true,
      showSearch: true,
      total: 0,
      jarsList: [],
      title: "",
      open: false,
      deviceTree: [],
      deviceOptions: [],       // 扁平列表，用于表格回显 { physicalId, label: '刀片服务器 / node1' }
      deviceGroupOptions: [],  // 分组选项，用于表单选择 [{ label: '刀片服务器', options: [{physicalId, physicalName}] }]
      treeSearch: '',
      treeProps: {
        children: 'children',
        label: 'deviceName'
      },
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        appName: null,
        category: null,
        leader: null,
        status: null,
        deviceId: null
      },
      form: {},
      rules: {
        appName: [
          { required: true, message: "应用名称不能为空", trigger: "blur" }
        ],
        ipAddress: [
          { required: true, message: "IP地址不能为空", trigger: "blur" }
        ],
        port: [
          { required: true, message: "监听端口不能为空", trigger: "blur" }
        ],
        status: [
          { required: true, message: "应用状态不能为空", trigger: "change" }
        ]
      }
    }
  },
  created() {
    this.getList()
    this.getDeviceTree()
  },
  watch: {
    treeSearch(val) {
      this.$refs.deviceTreeRef.filter(val)
    }
  },
  methods: {
    getList() {
      this.loading = true
      listJars(this.queryParams).then(response => {
        this.jarsList = response.rows
        this.total = response.total
        this.loading = false
      })
    },

    getDeviceTree() {
      listDeviceManagerTree().then(response => {
        const fullTree = this.buildTree(response.data, 0)
        this.deviceTree = fullTree
        // 获取所有类别节点（第二层，parentId != 0）
        const categoryNodes = []
        fullTree.forEach(root => {
          if (root.children && root.children.length > 0) {
            root.children.forEach(cat => categoryNodes.push(cat))
          } else {
            categoryNodes.push(root)
          }
        })
        // 并发查询每个类别下的物理机
        const promises = categoryNodes.map(cat =>
          getListByDeviceId(cat.deviceId).then(res => ({
            categoryId: cat.deviceId,
            categoryName: cat.deviceName,
            machines: (res.data || res.rows || [])
          }))
        )
        Promise.all(promises).then(results => {
          this.deviceOptions = []
          this.deviceGroupOptions = []
          results.forEach(({ categoryName, machines }) => {
            if (machines && machines.length > 0) {
              const group = {
                label: categoryName,
                options: machines.map(m => {
                  // 存 physicalId 到 device_id 字段
                  this.deviceOptions.push({
                    deviceId: m.physicalId,
                    deviceName: categoryName + ' / ' + m.physicalName
                  })
                  return { physicalId: m.physicalId, physicalName: m.physicalName, ipAddress: m.ipAddress }
                })
              }
              this.deviceGroupOptions.push(group)
            }
          })
        })
      }).catch(() => {})
    },

    buildTree(data, parentId) {
      const result = []
      for (const item of data) {
        if (item.parentId === parentId) {
          const children = this.buildTree(data, item.deviceId)
          if (children.length > 0) item.children = children
          result.push(item)
        }
      }
      return result
    },

    getDeviceName(deviceId) {
      const d = this.deviceOptions.find(i => i.deviceId === deviceId)
      return d ? d.deviceName : (deviceId || '-')
    },

    filterNode(value, data) {
      if (!value) return true
      return data.deviceName.indexOf(value) !== -1
    },

    handleNodeClick(data) {
      if (!data || !data.deviceId) return
      if (data.parentId === 0) {
        this.queryParams.deviceId = null
      } else {
        this.queryParams.deviceId = data.deviceId
      }
      this.queryParams.pageNum = 1
      this.getList()
    },

    cancel() {
      this.open = false
      this.reset()
    },

    reset() {
      this.form = {
        jarsId: null,
        deviceId: null,   // 直接存 physicalId
        appName: null,
        appNameCn: null,
        category: 'default',
        status: 0,
        ipAddress: null,
        port: null,
        metricsPort: null,
        metricsPath: '/actuator/prometheus',
        jvmArgs: null,
        deployPath: null,
        javaVersion: null,
        leader: null,
        remark: null
      }
      this.resetForm("jarsRef")
    },

    handleDeviceSelect(physicalId) {
      // 选择设备时自动填充 IP 地址
      for (const group of this.deviceGroupOptions) {
        const found = group.options.find(m => m.physicalId === physicalId)
        if (found && found.ipAddress) {
          this.form.ipAddress = found.ipAddress
          break
        }
      }
    },

    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },

    resetQuery() {
      this.resetForm("queryForm")
      this.queryParams.deviceId = null
      this.handleQuery()
    },

    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.jarsId)
      this.single = selection.length !== 1
      this.multiple = !selection.length
    },

    handleAdd() {
      this.reset()
      this.open = true
      this.title = "添加JAR应用"
    },

    handleUpdate(row) {
      this.reset()
      const _jarsId = row.jarsId || this.ids[0]
      getJars(_jarsId).then(response => {
        this.form = response.data
        this.open = true
        this.title = "修改JAR应用"
      })
    },

    submitForm() {
      this.$refs["jarsRef"].validate(valid => {
        if (valid) {
          if (this.form.jarsId != null) {
            updateJars(this.form).then(() => {
              this.$modal.msgSuccess("修改成功")
              this.open = false
              this.getList()
            })
          } else {
            addJars(this.form).then(() => {
              this.$modal.msgSuccess("新增成功")
              this.open = false
              this.getList()
            })
          }
        }
      })
    },

    handleDelete(row) {
      const _jarsIds = row.jarsId || this.ids
      this.$modal.confirm('是否确认删除JAR应用编号为"' + _jarsIds + '"的数据项？').then(() => {
        return delJars(_jarsIds)
      }).then(() => {
        this.getList()
        this.$modal.msgSuccess("删除成功")
      }).catch(() => {})
    },

    handleExport() {
      this.download('device/jars/export', {
        ...this.queryParams
      }, `jars_${new Date().getTime()}.xlsx`)
    }
  }
}
</script>

<style scoped>
.tree-container {
  background: #fff;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  min-height: calc(100vh - 180px);
}
</style>