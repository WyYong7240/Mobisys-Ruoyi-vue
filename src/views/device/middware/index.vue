<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 左侧树状图 -->
      <el-col :span="4">
        <div class="tree-container">
          <el-input v-model="treeSearch" placeholder="搜索中间件" clearable prefix-icon="el-icon-search" style="margin-bottom: 15px" />
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
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="100px">
      <el-form-item label="中间件名称" prop="middlewareName">
        <el-input
          v-model="queryParams.middlewareName"
          placeholder="请输入中间件名称"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="负责人" prop="leader">
        <el-input
          v-model="queryParams.leader"
          placeholder="请输入负责人"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="登陆账号" prop="username">
        <el-input
          v-model="queryParams.username"
          placeholder="请输入登陆账号"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['device:middware:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['device:middware:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['device:middware:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['device:middware:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

        <el-table v-loading="loading" :data="middwareList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="中间件名称" align="center" prop="middlewareName" />
      <el-table-column label="中间件类型" align="center" prop="deviceId">
          <template #default="scope">
            {{ getDeviceName(scope.row.deviceId) }}
          </template>
        </el-table-column>
      <el-table-column label="中间件版本号" align="center" prop="middlewareVersion" />
      <el-table-column label="部署方式" align="center" prop="deployType" />
      <el-table-column label="环境类型" align="center" prop="envType" />
      <el-table-column label="部署ip" align="center" prop="ipAddress" />
      <el-table-column label="端口" align="center" prop="port" />
      <el-table-column label="负责人" align="center" prop="leader" />
      <el-table-column label="中间价状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : scope.row.status === 1 ? 'warning' : 'info'">
            {{ scope.row.status === 0 ? '正常' : scope.row.status === 1 ? '维护中' : '未启用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="监控状态" align="center" prop="monitorStatus">
        <template #default="scope">
          <el-tag :type="scope.row.monitorStatus === 0 ? 'info' : scope.row.monitorStatus === 1 ? 'success' : 'danger'">
            {{ scope.row.monitorStatus === 0 ? '未监控' : scope.row.monitorStatus === 1 ? '监控中' : '异常' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="登陆账号" align="center" prop="username" />
      <!-- <el-table-column label="登陆密码(加密之后)" align="center" prop="password" /> -->
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="180">
        <template #default="scope">
          <div class="action-buttons">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['device:middware:edit']">修改</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['device:middware:remove']">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    
        <pagination
          v-show="total>0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="getList"
        />

        <!-- 添加或修改中间件管理对话框 -->
        <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="middwareRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="中间件名称" prop="middlewareName">
          <el-input v-model="form.middlewareName" placeholder="请输入中间件名称" />
        </el-form-item>
        <el-form-item label="中间件类型" prop="deviceId">
          <el-select v-model="form.deviceId" placeholder="请选择中间件类型" style="width: 100%">
            <el-option
              v-for="item in deviceOptions"
              :key="item.deviceId"
              :label="item.deviceName"
              :value="item.deviceId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="中间件版本号" prop="middlewareVersion">
          <el-input v-model="form.middlewareVersion" placeholder="请输入中间件版本号" />
        </el-form-item>
        <el-form-item label="部署方式" prop="deployType">
          <el-input v-model="form.deployType" placeholder="请输入部署方式" />
        </el-form-item>
        <el-form-item label="环境类型" prop="envType">
          <el-input v-model="form.envType" placeholder="请输入环境类型" />
        </el-form-item>
        <el-form-item label="部署ip" prop="ipAddress">
          <el-input v-model="form.ipAddress" placeholder="请输入部署ip" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input v-model="form.port" placeholder="请输入端口" />
        </el-form-item>
        <el-form-item label="负责人" prop="leader">
          <el-input v-model="form.leader" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="登陆账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入登陆账号" />
        </el-form-item>
        <el-form-item label="登陆密码" prop="password">
          <el-input v-model="form.password" placeholder="请输入登陆密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="checkPassword">
          <el-input v-model="form.checkPassword" placeholder="请再次输入密码" show-password />
        </el-form-item>
        <el-form-item label="中间价状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择中间价状态" style="width: 100%">
            <el-option label="正常" :value="0" />
            <el-option label="维护中" :value="1" />
            <el-option label="未启用" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="监控状态" prop="monitorStatus">
          <el-select v-model="form.monitorStatus" placeholder="请选择监控状态" style="width: 100%">
            <el-option label="未监控" :value="0" />
            <el-option label="监控中" :value="1" />
            <el-option label="异常" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
        </el-dialog>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Middware">
import { listMiddleware, getMiddleware, delMiddleware, addMiddleware, updateMiddleware, listDeviceManagerTree, getListByDeviceId } from "@/api/device/middleware"

const { proxy } = getCurrentInstance()

const middwareList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

// 树状图相关
const deviceTree = ref([])
const treeSearch = ref('')
const treeProps = {
  children: 'children',
  label: 'deviceName'
}
const deviceOptions = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    middlewareName: null,
    deviceId: null,
    leader: null,
    username: null,
  },
  rules: {
    middlewareName: [
      { required: true, message: "中间件名称不能为空", trigger: "blur" }
    ],
    deviceId: [
      { required: true, message: "中间件类型不能为空", trigger: "blur" }
    ],
    deployType: [
      { required: true, message: "部署方式不能为空", trigger: "blur" }
    ],
    envType: [
      { required: true, message: "环境类型不能为空", trigger: "blur" }
    ],
    ipAddress: [
      { required: true, message: "部署ip，多个都好隔开不能为空", trigger: "blur" }
    ],
    leader: [
      { required: true, message: "负责人不能为空", trigger: "blur" }
    ],
    status: [
      { required: true, message: "中间价状态不能为空", trigger: "change" }
    ],
    monitorStatus: [
      { required: true, message: "监控状态不能为空", trigger: "change" }
    ],
    username: [
      { required: true, message: "登陆账号不能为空", trigger: "blur" }
    ],
    password: [
      { required: true, message: "登陆密码不能为空", trigger: "blur" },
      { trigger: 'change', validator: (rule, value, callback) => {
        if (form.value.checkPassword) {
          proxy.$refs.middwareRef.validateField('checkPassword')
        }
        callback()
      }}
    ],
    checkPassword: [
      { required: true, message: "确认密码不能为空", trigger: "blur" },
      { 
        validator: (rule, value, callback) => {
          if (value !== form.value.password) {
            callback(new Error("两次输入的密码不一致"))
          } else {
            callback()
          }
        }, 
        trigger: "blur" 
      }
    ],
  }
})

const { queryParams, form, rules } = toRefs(data)

watch(
  () => treeSearch.value,
  (val) => {
    if (proxy.$refs.deviceTree) {
      proxy.$refs.deviceTree.filter(val)
    }
  }
)

/** 查询中间件管理列表 */
function getList() {
  loading.value = true
  listMiddleware(queryParams.value).then(response => {
    middwareList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 获取设备树状图数据 */
function getDeviceTree() {
  listDeviceManagerTree().then(response => {
    console.log('树状图数据:', response.data)
    deviceTree.value = buildTree(response.data, 0)
    console.log('构建后的树状图数据:', deviceTree.value)
    // 只保留"中间件"这个根节点
    if (deviceTree.value && deviceTree.value.length > 0) {
      const middlewareNode = deviceTree.value.find(node => node.deviceName === '中间件')
      if (middlewareNode) {
        deviceTree.value = [middlewareNode]
        console.log('过滤后的树状图数据:', deviceTree.value)
      }
    }
    // 树状图数据加载完成后，再获取设备类型下拉选项
    getDeviceOptions()
  }).catch(error => {
    console.error('获取树状图数据失败:', error)
  })
}

/** 获取设备类型下拉选项（排除根节点） */
function getDeviceOptions() {
  deviceOptions.value = []
  // 从树状图数据中提取所有设备类型（排除根节点）
  if (deviceTree.value && deviceTree.value.length > 0) {
    console.log('开始提取设备类型选项')
    // 遍历树状图的每个根节点
    deviceTree.value.forEach(rootNode => {
      console.log('根节点:', rootNode)
      // 如果根节点有子节点，提取这些子节点作为选项
      if (rootNode.children && rootNode.children.length > 0) {
        rootNode.children.forEach(child => {
          console.log('子节点:', child)
          deviceOptions.value.push({
            deviceId: child.deviceId,
            deviceName: child.deviceName
          })
        })
      }
    })
  }
  console.log('设备类型下拉选项:', deviceOptions.value)
}

/** 构建树状结构 */
function buildTree(data, parentId) {
  const result = []
  console.log('构建树状结构，parentId:', parentId)
  for (const item of data) {
    console.log('item:', item)
    if (item.parentId === parentId) {
      console.log('找到匹配的 item:', item)
      const children = buildTree(data, item.deviceId)
      if (children.length > 0) {
        item.children = children
      }
      result.push(item)
    }
  }
  console.log('构建后的树状结构:', result)
  return result
}

/** 过滤树状图节点 */
function filterNode(value, data) {
  if (!value) return true
  return data.deviceName.indexOf(value) !== -1
}

/** 树状图节点点击事件 */
function handleNodeClick(data) {
  console.log('点击了节点:', data)
  
  if (data && data.deviceId) {
    // 判断是否为根节点（parentId 为 0）
    if (data.parentId === 0) {
      // 点击根节点（如"中间件"），显示全部数据
      queryParams.value.deviceId = null
      queryParams.value.pageNum = 1
      getList()
      proxy.$modal.msgSuccess('已显示全部中间件数据')
    } else {
      // 点击子节点（如某种中间件类型），根据 deviceId 筛选数据
      queryParams.value.deviceId = data.deviceId
      queryParams.value.pageNum = 1
      // 调用根据 deviceId 查询的接口
      loading.value = true
      getListByDeviceId(data.deviceId).then(response => {
        middwareList.value = response.rows
        total.value = response.total
        loading.value = false
        proxy.$modal.msgSuccess(`已筛选设备类型：${data.deviceName}`)
      })
    }
  }
}

/** 获取设备类型名称 */
function getDeviceName(deviceId) {
  const device = deviceOptions.value.find(item => item.deviceId === deviceId)
  return device ? device.deviceName : '-'
}

// 取消按钮
function cancel() {
  open.value = false
  reset()
}

// 表单重置
function reset() {
  form.value = {
    middlewareId: null,
    middlewareName: null,
    deviceId: null,
    middlewareVersion: null,
    deployType: null,
    envType: null,
    ipAddress: null,
    port: null,
    leader: null,
    status: null,
    monitorStatus: null,
    username: null,
    password: null,
    checkPassword: null,
    createTime: null,
    createBy: null,
    remark: null
  }
  proxy.resetForm("middwareRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

// 多选框选中数据
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.middlewareId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加中间件管理"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _middlewareId = row.middlewareId || ids.value
  getMiddleware(_middlewareId).then(response => {
    form.value = response.data
    // 修改时，将密码也赋值给确认密码字段，避免比较不一致
    if (form.value.password) {
      form.value.checkPassword = form.value.password
    }
    open.value = true
    title.value = "修改中间件管理"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["middwareRef"].validate(valid => {
    if (valid) {
      if (form.value.middlewareId != null) {
        updateMiddleware(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addMiddleware(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _middlewareIds = row.middlewareId || ids.value
  proxy.$modal.confirm('是否确认删除中间件管理编号为"' + _middlewareIds + '"的数据项？').then(function() {
    return delMiddleware(_middlewareIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('device/middware/export', {
    ...queryParams.value
  }, `middware_${new Date().getTime()}.xlsx`)
}

getList()
getDeviceTree()
</script>

<style scoped>
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  white-space: nowrap;
}

.tree-container {
  padding: 10px;
  border-right: 1px solid #e6e6e6;
  height: calc(100vh - 140px);
  overflow-y: auto;
}
</style>
