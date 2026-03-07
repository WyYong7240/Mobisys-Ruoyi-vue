<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="设施编号" prop="facilityCode">
        <el-input
          v-model="queryParams.facilityCode"
          placeholder="请输入设施编号"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="设施名称" prop="facilityName">
        <el-input
          v-model="queryParams.facilityName"
          placeholder="请输入设施名称"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="所属机房" prop="machineRoom">
        <el-input
          v-model="queryParams.machineRoom"
          placeholder="请输入所属机房"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="安装位置" prop="installPosition">
        <el-input
          v-model="queryParams.installPosition"
          placeholder="请输入安装位置"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="厂商" prop="vendor">
        <el-input
          v-model="queryParams.vendor"
          placeholder="请输入厂商"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="型号" prop="model">
        <el-input
          v-model="queryParams.model"
          placeholder="请输入型号"
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
          v-hasPermi="['facility:machine:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['facility:machine:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['facility:machine:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['facility:machine:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="machineList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="设施ID" align="center" prop="id" />
      <el-table-column label="设施编号" align="center" prop="facilityCode" />
      <el-table-column label="设施名称" align="center" prop="facilityName" />
      <el-table-column label="所属机房" align="center" prop="machineRoom" />
      <el-table-column label="安装位置" align="center" prop="installPosition" />
      <el-table-column label="厂商" align="center" prop="vendor" />
      <el-table-column label="型号" align="center" prop="model" />
      <el-table-column label="运行状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status"/>
        </template>
      </el-table-column>
      <el-table-column label="负责人" align="center" prop="responsiblePerson" />
      <el-table-column label="联系电话" align="center" prop="contactPhone" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['facility:machine:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['facility:machine:remove']">删除</el-button>
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

    <!-- 添加或修改机房设施管理对话框 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="machineRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="设施编号" prop="facilityCode">
          <el-input v-model="form.facilityCode" placeholder="请输入设施编号" />
        </el-form-item>
        <el-form-item label="设施名称" prop="facilityName">
          <el-input v-model="form.facilityName" placeholder="请输入设施名称" />
        </el-form-item>
        <el-form-item label="设施类型" prop="deviceId">
          <el-select v-model="form.deviceId" placeholder="请选择设施类型">
            <el-option
              v-for="dict in machine_facility_type"
              :key="dict.value"
              :label="dict.label"
              :value="parseInt(dict.value)"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="所属机房" prop="machineRoom">
          <el-input v-model="form.machineRoom" placeholder="请输入所属机房" />
        </el-form-item>
        <el-form-item label="安装位置" prop="installPosition">
          <el-input v-model="form.installPosition" placeholder="请输入安装位置" />
        </el-form-item>
        <el-form-item label="厂商" prop="vendor">
          <el-input v-model="form.vendor" placeholder="请输入厂商" />
        </el-form-item>
        <el-form-item label="型号" prop="model">
          <el-input v-model="form.model" placeholder="请输入型号" />
        </el-form-item>
        <el-form-item label="运行状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择运行状态">
            <el-option
              v-for="dict in sys_normal_disable"
              :key="dict.value"
              :label="dict.label"
              :value="parseInt(dict.value)"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="responsiblePerson">
          <el-input v-model="form.responsiblePerson" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactPhone">
          <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="安装时间" prop="installTime">
          <el-date-picker clearable
            v-model="form.installTime"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择安装时间">
          </el-date-picker>
        </el-form-item>
        <el-form-item label="最后维护时间" prop="lastMaintainTime">
          <el-date-picker clearable
            v-model="form.lastMaintainTime"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择最后维护时间">
          </el-date-picker>
        </el-form-item>
        <el-form-item label="下次维护时间" prop="nextMaintainTime">
          <el-date-picker clearable
            v-model="form.nextMaintainTime"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择下次维护时间">
          </el-date-picker>
        </el-form-item>
        <el-form-item label="备注信息" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
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

<script setup name="Machine">
import { listMachine, getMachine, delMachine, addMachine, updateMachine } from "@/api/facility/machine"

const { proxy } = getCurrentInstance()
const { machine_facility_type, sys_normal_disable } = proxy.useDict('machine_facility_type', 'sys_normal_disable')

const machineList = ref([])
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
    facilityCode: null,
    facilityName: null,
    machineRoom: null,
    installPosition: null,
    vendor: null,
    model: null,
  },
  rules: {
    facilityCode: [
      { required: true, message: "设施编号不能为空", trigger: "blur" }
    ],
    facilityName: [
      { required: true, message: "设施名称不能为空", trigger: "blur" }
    ],
    deviceId: [
      { required: true, message: "设施类型不能为空", trigger: "change" }
    ],
    machineRoom: [
      { required: true, message: "所属机房不能为空", trigger: "blur" }
    ],
    installPosition: [
      { required: true, message: "安装位置不能为空", trigger: "blur" }
    ],
    vendor: [
      { required: true, message: "厂商不能为空", trigger: "blur" }
    ],
    model: [
      { required: true, message: "型号不能为空", trigger: "blur" }
    ],
    status: [
      { required: true, message: "运行状态不能为空", trigger: "change" }
    ],
    responsiblePerson: [
      { required: true, message: "负责人不能为空", trigger: "blur" }
    ],
    contactPhone: [
      { required: true, message: "联系电话不能为空", trigger: "blur" }
    ],
    installTime: [
      { required: true, message: "安装时间不能为空", trigger: "blur" }
    ],
    createTime: [
      { required: true, message: "记录创建时间不能为空", trigger: "blur" }
    ],
    updateTime: [
      { required: true, message: "记录更新时间不能为空", trigger: "blur" }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询机房设施管理列表 */
function getList() {
  loading.value = true
  listMachine(queryParams.value).then(response => {
    machineList.value = response.rows
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
    id: null,
    facilityCode: null,
    facilityName: null,
    deviceId: null,
    machineRoom: null,
    installPosition: null,
    vendor: null,
    model: null,
    status: null,
    responsiblePerson: null,
    contactPhone: null,
    installTime: null,
    lastMaintainTime: null,
    nextMaintainTime: null,
    remark: null,
    createTime: null,
    updateTime: null
  }
  proxy.resetForm("machineRef")
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
  ids.value = selection.map(item => item.id)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加机房设施管理"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getMachine(_id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改机房设施管理"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["machineRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateMachine(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addMachine(form.value).then(response => {
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
  const _ids = row.id || ids.value
  proxy.$modal.confirm('是否确认删除机房设施管理编号为"' + _ids + '"的数据项？').then(function() {
    return delMachine(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('facility/machine/export', {
    ...queryParams.value
  }, `machine_${new Date().getTime()}.xlsx`)
}

getList()
</script>
