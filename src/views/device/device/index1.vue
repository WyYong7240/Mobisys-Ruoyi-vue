<template>
  <div class="app-container">

    <el-row :gutter="20">

      <!-- 左侧设备分类 -->
      <el-col :span="5">

        <el-card shadow="never">
          <template #header>
            <span>设备分类</span>
          </template>

          <el-menu
            :default-active="activeId"
            @select="handleCategoryClick"
          >

            <el-menu-item
              v-for="item in categoryList"
              :key="item.deviceId"
              :index="item.deviceId.toString()"
            >
              {{ item.deviceName }}
            </el-menu-item>

          </el-menu>

        </el-card>

      </el-col>


      <!-- 右侧设备列表 -->
      <el-col :span="19">

        <el-card shadow="never">

          <template #header>

            <el-row>

              <el-col :span="12">
                <span>设备列表</span>
              </el-col>

              <el-col :span="12" style="text-align:right">

                <el-button
                  type="primary"
                  icon="Plus"
                  @click="handleAdd"
                >
                  新增
                </el-button>

              </el-col>

            </el-row>

          </template>


          <el-table
            v-loading="loading"
            :data="deviceList"
          >

            <el-table-column
              label="设备名称"
              prop="deviceName"
              align="center"
            />

            <el-table-column
              label="负责人"
              prop="leader"
              align="center"
            />

            <el-table-column
              label="电话"
              prop="phone"
              align="center"
            />

            <el-table-column
              label="状态"
              align="center"
            >

              <template #default="scope">

                <el-tag v-if="scope.row.status == 0" type="success">
                  正常
                </el-tag>

                <el-tag v-else type="danger">
                  异常
                </el-tag>

              </template>

            </el-table-column>

            <el-table-column label="操作" align="center">

              <template #default="scope">

                <el-button
                  link
                  type="primary"
                  icon="Edit"
                  @click="handleUpdate(scope.row)"
                >
                  修改
                </el-button>

                <el-button
                  link
                  type="primary"
                  icon="Plus"
                  @click="handleAdd(scope.row)"
                >
                  新增子设备
                </el-button>

                <el-button
                  link
                  type="danger"
                  icon="Delete"
                  @click="handleDelete(scope.row)"
                >
                  删除
                </el-button>

              </template>

            </el-table-column>

          </el-table>

        </el-card>

      </el-col>

    </el-row>


    <!-- 新增 / 修改设备 -->
    <el-dialog :title="title" v-model="open" width="500px">

      <el-form ref="deviceRef" :model="form" label-width="80px">

        <el-form-item label="父设备">

          <el-tree-select
            v-model="form.parentId"
            :data="deviceOptions"
            :props="{ value: 'deviceId', label: 'deviceName', children: 'children' }"
            value-key="deviceId"
            placeholder="选择父设备"
            check-strictly
          />

        </el-form-item>

        <el-form-item label="设备名称">
          <el-input v-model="form.deviceName" />
        </el-form-item>

        <el-form-item label="显示顺序">
          <el-input v-model="form.orderNum" />
        </el-form-item>

        <el-form-item label="负责人">
          <el-input v-model="form.leader" />
        </el-form-item>

        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="0">正常</el-radio>
            <el-radio :label="1">不正常</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>

        <el-button type="primary" @click="submitForm">
          确定
        </el-button>

        <el-button @click="open = false">
          取消
        </el-button>

      </template>

    </el-dialog>

  </div>
</template>

<script setup name="Device">

import { listDevice, getDevice, delDevice, addDevice, updateDevice } from "@/api/device/device"

const { proxy } = getCurrentInstance()

const loading = ref(true)

const categoryList = ref([])
const deviceList = ref([])
const allDevice = ref([])

const activeId = ref("")

const open = ref(false)
const title = ref("")

const deviceOptions = ref([])

const form = ref({})


/** 查询设备 */
function getList() {

  loading.value = true

  listDevice().then(res => {

    allDevice.value = res.data

    categoryList.value = res.data.filter(item => item.parentId == 0)

    if (categoryList.value.length > 0) {

      activeId.value = categoryList.value[0].deviceId.toString()

      loadDevice(categoryList.value[0].deviceId)

    }

    loading.value = false

  })

}


/** 加载设备 */
function loadDevice(parentId) {

  deviceList.value = allDevice.value.filter(
    item => item.parentId == parentId
  )

}


/** 点击分类 */
function handleCategoryClick(id) {

  activeId.value = id

  loadDevice(Number(id))

}


/** 获取树结构 */
function getTreeselect() {

  listDevice().then(res => {

    const data = { deviceId: 0, deviceName: "顶级设备", children: [] }

    data.children = proxy.handleTree(res.data, "deviceId", "parentId")

    deviceOptions.value = [data]

  })

}


/** 新增 */
function handleAdd(row) {

  form.value = {}

  getTreeselect()

  if (row) {
    form.value.parentId = row.deviceId
  } else {
    form.value.parentId = Number(activeId.value)
  }

  title.value = "新增设备"

  open.value = true

}


/** 修改 */
function handleUpdate(row) {

  getTreeselect()

  getDevice(row.deviceId).then(res => {

    form.value = res.data

    title.value = "修改设备"

    open.value = true

  })

}


/** 提交 */
function submitForm() {

  if (form.value.deviceId) {

    updateDevice(form.value).then(() => {

      proxy.$modal.msgSuccess("修改成功")

      open.value = false

      getList()

    })

  } else {

    addDevice(form.value).then(() => {

      proxy.$modal.msgSuccess("新增成功")

      open.value = false

      getList()

    })

  }

}


/** 删除 */
function handleDelete(row) {

  proxy.$modal.confirm("确认删除设备？")

  .then(() => delDevice(row.deviceId))

  .then(() => {

    proxy.$modal.msgSuccess("删除成功")

    getList()

  })

}


getList()

</script>