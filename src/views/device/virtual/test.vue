<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="虚拟机名称" prop="virtualName">
        <el-input
          v-model="queryParams.virtualName"
          placeholder="请输入虚拟机名称"
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
      <el-form-item label="操作系统类型" prop="osType">
        <el-input
          v-model="queryParams.osType"
          placeholder="请输入操作系统类型"
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
          v-hasPermi="['device:virtual:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['device:virtual:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['device:virtual:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['device:virtual:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="virtualList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="虚拟机id" align="center" prop="virtualId" />
      <el-table-column label="设备类型id" align="center" prop="deviceId" />
      <el-table-column label="虚拟机名称" align="center" prop="virtualName" />
      <el-table-column label="状态，0正常，1禁用" align="center" prop="status" />
      <el-table-column label="ip地址" align="center" prop="ipAddress" />
      <el-table-column label="负责人" align="center" prop="leader" />
      <el-table-column label="操作系统类型" align="center" prop="osType" />
      <el-table-column label="用户名称" align="center" prop="username" />
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['device:virtual:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['device:virtual:remove']">删除</el-button>
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

    <!-- 添加或修改虚拟机管理对话框 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="virtualRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="设备类型id" prop="deviceId">
          <el-input v-model="form.deviceId" placeholder="请输入设备类型id" />
        </el-form-item>
        <el-form-item label="虚拟机名称" prop="virtualName">
          <el-input v-model="form.virtualName" placeholder="请输入虚拟机名称" />
        </el-form-item>
        <el-form-item label="ip地址" prop="ipAddress">
          <el-input v-model="form.ipAddress" placeholder="请输入ip地址" />
        </el-form-item>
        <el-form-item label="负责人" prop="leader">
          <el-input v-model="form.leader" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="操作系统类型" prop="osType">
          <el-input v-model="form.osType" placeholder="请输入操作系统类型" />
        </el-form-item>
        <el-form-item label="用户名称" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名称" />
        </el-form-item>
        <el-form-item label="用户密码" prop="password">
          <el-input v-model="form.password" placeholder="请输入用户密码" />
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

<script setup name="Virtual">
import { listVirtual, getVirtual, delVirtual, addVirtual, updateVirtual } from "@/api/device/virtual"

const { proxy } = getCurrentInstance()

const virtualList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    virtualName: null,
    leader: null,
    osType: null,
  },
  rules: {
    deviceId: [
      { required: true, message: "设备类型id不能为空", trigger: "blur" }
    ],
    virtualName: [
      { required: true, message: "虚拟机名称不能为空", trigger: "blur" }
    ],
    status: [
      { required: true, message: "状态，0正常，1禁用不能为空", trigger: "change" }
    ],
    ipAddress: [
      { required: true, message: "ip地址不能为空", trigger: "blur" }
    ],
    osType: [
      { required: true, message: "操作系统类型不能为空", trigger: "blur" }
    ],
    username: [
      { required: true, message: "用户名称不能为空", trigger: "blur" }
    ],
    password: [
      { required: true, message: "用户密码不能为空", trigger: "blur" }
    ],
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询虚拟机管理列表 */
function getList() {
  loading.value = true
  listVirtual(queryParams.value).then(response => {
    virtualList.value = response.rows
    total.value = response.total
    loading.value = false
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
    virtualId: null,
    deviceId: null,
    virtualName: null,
    status: null,
    ipAddress: null,
    createTime: null,
    leader: null,
    osType: null,
    username: null,
    password: null,
    remark: null
  }
  proxy.resetForm("virtualRef")
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
  ids.value = selection.map(item => item.virtualId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加虚拟机管理"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _virtualId = row.virtualId || ids.value
  getVirtual(_virtualId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改虚拟机管理"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["virtualRef"].validate(valid => {
    if (valid) {
      if (form.value.virtualId != null) {
        updateVirtual(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addVirtual(form.value).then(response => {
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
  const _virtualIds = row.virtualId || ids.value
  proxy.$modal.confirm('是否确认删除虚拟机管理编号为"' + _virtualIds + '"的数据项？').then(function() {
    return delVirtual(_virtualIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('device/virtual/export', {
    ...queryParams.value
  }, `virtual_${new Date().getTime()}.xlsx`)
}

getList()
</script>
