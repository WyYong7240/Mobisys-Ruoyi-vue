<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="设备名称" prop="deviceName">
        <el-input
          v-model="queryParams.deviceName"
          placeholder="请输入设备名称"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="负责人" prop="leaders">
        <el-input
          v-model="queryParams.leaders"
          placeholder="请输入负责人"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="负责人电话" prop="phone">
        <el-input
          v-model="queryParams.phone"
          placeholder="请输入负责人电话"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="负责人邮箱" prop="email">
        <el-input
          v-model="queryParams.email"
          placeholder="请输入负责人邮箱"
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
          v-hasPermi="['device:manager:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="info"
          plain
          icon="Sort"
          @click="toggleExpandAll"
        >展开/折叠</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table
      v-if="refreshTable"
      v-loading="loading"
      :data="managerList"
      row-key="deviceId"
      :default-expand-all="isExpandAll"
      :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
    >
      <el-table-column label="设备名称" align="center" prop="deviceName" />
      <el-table-column label="设备状态" align="center" prop="deviceStatus" />
      <el-table-column label="负责人" align="center" prop="leaders" />
      <el-table-column label="负责人电话" align="center" prop="phone" />
      <el-table-column label="负责人邮箱" align="center" prop="email" />
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['device:manager:edit']">修改</el-button>
          <el-button link type="primary" icon="Plus" @click="handleAdd(scope.row)" v-hasPermi="['device:manager:add']">新增</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['device:manager:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加或修改设备管理对话框 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="managerRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="父类设备id" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="managerOptions"
            :props="{ value: 'deviceId', label: 'deviceName', children: 'children' }"
            value-key="deviceId"
            placeholder="请选择父类设备id"
            check-strictly
          />
        </el-form-item>
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="form.deviceName" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="负责人" prop="leaders">
          <el-input v-model="form.leaders" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="负责人电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入负责人电话" />
        </el-form-item>
        <el-form-item label="负责人邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入负责人邮箱" />
        </el-form-item>
        <el-form-item label="删除标志(0=存在，2=删除)" prop="delFlag">
          <el-input v-model="form.delFlag" placeholder="请输入删除标志(0=存在，2=删除)" />
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
  </div>
</template>

<script setup name="Manager">
import { listManager, getManager, delManager, addManager, updateManager } from "@/api/device/manager"

const { proxy } = getCurrentInstance()

const managerList = ref([])
const managerOptions = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const isExpandAll = ref(true)
const refreshTable = ref(true)

const data = reactive({
  form: {},
  queryParams: {
    deviceName: null,
    deviceStatus: null,
    leaders: null,
    phone: null,
    email: null,
  },
  rules: {
    parentId: [
      { required: true, message: "父类设备id不能为空", trigger: "blur" }
    ],
    deviceName: [
      { required: true, message: "设备名称不能为空", trigger: "blur" }
    ],
    deviceStatus: [
      { required: true, message: "设备状态不能为空", trigger: "change" }
    ],
    leaders: [
      { required: true, message: "负责人不能为空", trigger: "blur" }
    ],
    phone: [
      { required: true, message: "负责人电话不能为空", trigger: "blur" }
    ],
    email: [
      { required: true, message: "负责人邮箱不能为空", trigger: "blur" }
    ],
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询设备管理列表 */
function getList() {
  loading.value = true
  listManager(queryParams.value).then(response => {
    managerList.value = proxy.handleTree(response.data, "deviceId", "parentId")
    loading.value = false
  })
}

/** 查询设备管理下拉树结构 */
function getTreeselect() {
  listManager().then(response => {
    managerOptions.value = []
    const data = { deviceId: 0, deviceName: '顶级节点', children: [] }
    data.children = proxy.handleTree(response.data, "deviceId", "parentId")
    managerOptions.value.push(data)
  })
}
	
// 取消按钮
function cancel() {
  open.value = false
  reset()
}

// 表单重置
function reset() {
  form.value = {
    deviceId: null,
    parentId: null,
    deviceName: null,
    deviceStatus: null,
    leaders: null,
    phone: null,
    email: null,
    delFlag: null,
    createTime: null,
    updateTime: null,
    remark: null
  }
  proxy.resetForm("managerRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 新增按钮操作 */
function handleAdd(row) {
  reset()
  getTreeselect()
  if (row != null && row.deviceId) {
    form.value.parentId = row.deviceId
  } else {
    form.value.parentId = 0
  }
  open.value = true
  title.value = "添加设备管理"
}

/** 展开/折叠操作 */
function toggleExpandAll() {
  refreshTable.value = false
  isExpandAll.value = !isExpandAll.value
  nextTick(() => {
    refreshTable.value = true
  })
}

/** 修改按钮操作 */
async function handleUpdate(row) {
  reset()
  await getTreeselect()
  if (row != null) {
    form.value.parentId = row.parentId
  }
  getManager(row.deviceId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改设备管理"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["managerRef"].validate(valid => {
    if (valid) {
      if (form.value.deviceId != null) {
        updateManager(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addManager(form.value).then(response => {
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
  proxy.$modal.confirm('是否确认删除设备管理编号为"' + row.deviceId + '"的数据项？').then(function() {
    return delManager(row.deviceId)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getList()
</script>
