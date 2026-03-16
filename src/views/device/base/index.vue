<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 左侧树状图 -->
      <el-col :span="4">
        <div class="tree-container">
          <el-input v-model="treeSearch" placeholder="搜索设备" clearable prefix-icon="el-icon-search" style="margin-bottom: 15px" />
          <el-tree
  :data="deviceTree"
  :props="treeProps"
  :filter-node-method="filterNode"
  node-key="deviceId" 
  ref="deviceTree"
  highlight-current
  default-expand-all
  @node-click="handleNodeClick"
/>
        </div>
      </el-col>
      
      <!-- 右侧内容 -->
      <el-col :span="20">
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="88px">
          <el-form-item label="物理机名称" prop="physicalName">
            <el-input
              v-model="queryParams.physicalName"
              placeholder="请输入物理机名称"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <!--<el-form-item label="物理机类型" prop="deviceId">
            <el-select v-model="queryParams.deviceId" placeholder="请选择物理机类型" clearable style="width: 240px">
              <el-option
                v-for="item in deviceOptions"
                :key="item.deviceId"
                :label="item.deviceName"
                :value="item.deviceId"
              />
            </el-select> 
          </el-form-item>-->
          <el-form-item label="品牌" prop="brand">
            <el-input
              v-model="queryParams.brand"
              placeholder="请输入品牌"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item label="型号" prop="model">
            <el-input
              v-model="queryParams.model"
              placeholder="请输入型号"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <!-- <el-form-item label="网卡MAC地址" prop="macAddress">
            <el-input
              v-model="queryParams.macAddress"
              placeholder="请输入网卡MAC地址"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item> -->
          <!-- <el-form-item label="ip地址" prop="ipAddress">
            <el-input
              v-model="queryParams.ipAddress"
              placeholder="请输入ip地址"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item> -->
          <el-form-item label="负责人" prop="leader">
            <el-input
              v-model="queryParams.leader"
              placeholder="请输入负责人"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">


          <el-col :span="1.5">
            <el-button
              type="primary"
              plain
              icon="el-icon-plus"
              size="mini"
              @click="handleAdd"
              v-hasPermi="['device:master:add']"
            >新增</el-button>
          </el-col>

          <el-col :span="1.5">
            <el-button
              type="success"
              plain
              icon="el-icon-edit"
              size="mini"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['device:master:edit']"
            >修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button
              type="danger"
              plain
              icon="el-icon-delete"
              size="mini"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['device:master:remove']"
            >删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button
              type="warning"
              plain
              icon="el-icon-download"
              size="mini"
              @click="handleExport"
              v-hasPermi="['device:master:export']"
            >导出</el-button>
          </el-col>
          <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>

        <el-table v-loading="loading" :data="masterList" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <!-- <el-table-column label="物理机id" align="center" prop="physicalId" /> -->
          <el-table-column label="物理机名称" align="center" prop="physicalName" />
          <el-table-column label="物理机类型" align="center" prop="deviceId">
            <template #default="scope">
              {{ getDeviceName(scope.row.deviceId) }}
            </template>
          </el-table-column>
          <el-table-column label="品牌" align="center" prop="brand" />
          <el-table-column label="型号" align="center" prop="model" />
          <el-table-column label="状态" align="center" prop="status">
            <template #default="scope">
              <el-tag :type="scope.row.status === 0 ? 'success' : 'danger'">
                {{ scope.row.status === 0 ? '正常' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="网卡MAC地址" align="center" prop="macAddress" />
          <el-table-column label="ip地址" align="center" prop="ipAddress" />
          <el-table-column label="负责人" align="center" prop="leader" />
          <el-table-column label="用户名" align="center" prop="username" />
          <el-table-column label="K8s集群" align="center" prop="isK8s">
            <template #default="scope">
              <el-tag :type="scope.row.isK8s === 0 ? 'success' : 'danger'">
                {{ scope.row.isK8s === 0 ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="250" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button
              size="mini"
              type="text"
              icon="el-icon-edit"
              @click="handleUpdate(scope.row)"
              v-hasPermi="['device:master:edit']"
            >修改</el-button>
            <el-button
              size="mini"
              type="text"
              icon="el-icon-delete"
              @click="handleDelete(scope.row)"
              v-hasPermi="['device:master:remove']"
            >删除</el-button>
            <el-button
              size="mini"
              type="text"
              icon="el-icon-view"
              @click="handleView(scope.row)"
            >查看详情</el-button>
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

        <!-- 添加或修改【请填写功能名称】对话框 -->
        <el-dialog :title="title" v-model="open" width="500px" append-to-body>
          <el-form ref="form" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="物理机名称" prop="physicalName">
              <el-input v-model="form.physicalName" placeholder="请输入物理机名称" />
            </el-form-item>
            <el-form-item label="物理机类型" prop="deviceId">
              <el-select v-model="form.deviceId" placeholder="请选择物理机类型" style="width: 100%">
                <el-option
                  v-for="item in deviceOptions"
                  :key="item.deviceId"
                  :label="item.deviceName"
                  :value="item.deviceId"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="品牌" prop="brand">
              <el-input v-model="form.brand" placeholder="请输入品牌" />
            </el-form-item>
            <el-form-item label="型号" prop="model">
              <el-input v-model="form.model" placeholder="请输入型号" />
            </el-form-item>
            <el-form-item label="网卡MAC地址" prop="macAddress">
              <el-input v-model="form.macAddress" placeholder="请输入网卡MAC地址" />
            </el-form-item>
            <el-form-item label="ip地址" prop="ipAddress">
              <el-input v-model="form.ipAddress" placeholder="请输入ip地址" />
            </el-form-item>
            <el-form-item label="负责人" prop="leader">
              <el-input v-model="form.leader" placeholder="请输入负责人" />
            </el-form-item>
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="物理机密码" prop="password">
              <el-input v-model="form.password" placeholder="请输入密码" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="checkPassword">
              <el-input v-model="form.checkPassword" placeholder="请再次输入密码" show-password />
            </el-form-item>
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio :label="0">正常</el-radio>
                <el-radio :label="1">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" placeholder="请输入备注" />
            </el-form-item>
            <el-form-item label="K8s集群" prop="isK8s">
              <el-radio-group v-model="form.isK8s">
                <el-radio :label="0">是</el-radio>
                <el-radio :label="1">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
          <div slot="footer" class="dialog-footer">
            <el-button type="primary" @click="submitForm">确 定</el-button>
            <el-button @click="cancel">取 消</el-button>
          </div>
        </el-dialog>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { listMaster, getMaster, delMaster, addMaster, updateMaster, listDeviceManagerTree } from "@/api/device/master"

export default {
  name: "Master",
  data() {
    return {
      // 遮罩层
      loading: true,
      // 选中数组
      ids: [],
      // 非单个禁用
      single: true,
      // 非多个禁用
      multiple: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 【请填写功能名称】表格数据
      masterList: [],
      // 弹出层标题
      title: "",
      // 是否显示弹出层
      open: false,
      // 树状图数据
      deviceTree: [],
      // 设备类型下拉选项
      deviceOptions: [],
      // 树状图搜索关键词
      treeSearch: '',
      // 树状图配置
      treeProps: {
        children: 'children',
        label: 'deviceName'
      },
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        physicalName: null,
        deviceId: null,
        brand: null,
        model: null,
        status: null,
        macAddress: null,
        ipAddress: null,
        leader: null,
      },
      // 表单参数
      form: {},
      // 表单校验
      rules: {
        physicalName: [
          { required: true, message: "物理机名称不能为空", trigger: "blur" }
        ],
        ipAddress: [
          { required: true, message: "IP地址不能为空", trigger: "blur" }
        ],
        password: [
          { required: true, message: "密码不能为空", trigger: "blur" },
          { trigger: 'change', validator: (rule, value, callback) => {
            if (this.form.checkPassword) {
              this.$refs.form.validateField('checkPassword')
            }
            callback()
          }}
        ],
        username: [
          { required: true, message: "用户名不能为空", trigger: "blur" }
        ],
        checkPassword: [
          { required: true, message: "确认密码不能为空", trigger: "blur" },
          { 
            validator: (rule, value, callback) => {
              // 如果密码为空（修改时后端返回的加密密码），不进行比较
              if (!this.form.password || this.form.password.length === 0) {
                callback()
                return
              }
              if (value !== this.form.password) {
                callback(new Error("两次输入的密码不一致"))
              } else {
                callback()
              }
            }, 
            trigger: "blur" 
          }
        ],
        deviceId: [
          { required: true, message: "物理机类型不能为空", trigger: "blur" }
        ],
      }
    }
  },
  created() {
    this.getList()
    this.getDeviceTree()
  },
  watch: {
    // 监听树状图搜索
    treeSearch(val) {
      this.$refs.deviceTree.filter(val)
    }
  },
  methods: {
    /** 查询【请填写功能名称】列表 */
    getList() {
      this.loading = true
      listMaster(this.queryParams).then(response => {
        this.masterList = response.rows
        this.total = response.total
        this.loading = false
      })
    },
    
    /** 获取设备树状图数据 */
    getDeviceTree() {
      listDeviceManagerTree().then(response => {
        console.log('树状图数据:', response.data)
        this.deviceTree = this.buildTree(response.data, 0)
        console.log('构建后的树状图数据:', this.deviceTree)
        // 只保留"物理机设备"这个根节点
        if (this.deviceTree && this.deviceTree.length > 0) {
          const physicalDeviceNode = this.deviceTree.find(node => node.deviceName === '物理机设备')
          if (physicalDeviceNode) {
            this.deviceTree = [physicalDeviceNode]
            console.log('过滤后的树状图数据:', this.deviceTree)
          }
        }
        // 树状图数据加载完成后，再获取设备类型下拉选项
        this.getDeviceOptions()
      }).catch(error => {
        console.error('获取树状图数据失败:', error)
      })
    },
    
    /** 获取设备类型下拉选项（排除根节点） */
    getDeviceOptions() {
      this.deviceOptions = []
      // 从树状图数据中提取所有设备类型（排除根节点）
      if (this.deviceTree && this.deviceTree.length > 0) {
        console.log('开始提取设备类型选项')
        // 遍历树状图的每个根节点
        this.deviceTree.forEach(rootNode => {
          console.log('根节点:', rootNode)
          // 如果根节点有子节点，提取这些子节点作为选项
          if (rootNode.children && rootNode.children.length > 0) {
            rootNode.children.forEach(child => {
              console.log('子节点:', child)
              this.deviceOptions.push({
                deviceId: child.deviceId,
                deviceName: child.deviceName
              })
            })
          }
        })
      }
      console.log('设备类型下拉选项:', this.deviceOptions)
    },
/** 构建树状结构 */
buildTree(data, parentId) {
  const result = []
  console.log('构建树状结构，parentId:', parentId)
  for (const item of data) {
    console.log('item:', item)
    if (item.parentId === parentId) {  // 改为 parentId
      console.log('找到匹配的item:', item)
      const children = this.buildTree(data, item.deviceId)  // 改为 deviceId
      if (children.length > 0) {
        item.children = children
      }
      result.push(item)
    }
  }
  console.log('构建后的树状结构:', result)
  return result
},
    

   /** 过滤树状图节点 */
  filterNode(value, data) {
  if (!value) return true
  return data.deviceName.indexOf(value) !== -1  // 改为 deviceName
},
    
    /** 树状图节点点击事件 */
    handleNodeClick(data) {
      console.log('点击了节点:', data)
      
      if (data && data.deviceId) {
        // 判断是否为根节点（parentId为0）
        if (data.parentId === 0) {
          // 点击根节点（如"物理机设备"），显示全部数据
          this.queryParams.deviceId = null
          this.queryParams.pageNum = 1
          this.getList()
          this.$modal.msgSuccess('已显示全部物理机数据')
        } else {
          // 点击子节点（如"刀片服务器"），根据deviceId筛选数据
          this.queryParams.deviceId = data.deviceId
          this.queryParams.pageNum = 1
          this.getList()
          this.$modal.msgSuccess(`已筛选设备类型: ${data.deviceName}`)
        }
      }
    },
    
    // 取消按钮
    cancel() {
      this.open = false
      this.reset()
    },
    // 表单重置
    reset() {
      this.form = {
        physicalId: null,
        physicalName: null,
        deviceId: null,
        brand: null,
        model: null,
        status: null,
        macAddress: null,
        ipAddress: null,
        createTime: null,
        leader: null,
        remark: null,
        username: null,
        password: null,
        checkPassword: null,
        isk8s: 0
      }
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm("queryForm")
      this.handleQuery()
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.physicalId)
      this.single = selection.length!==1
      this.multiple = !selection.length
    },
    /** 新增按钮操作 */
    handleAdd() {
      console.log('新增按钮被点击')
      this.reset()
      this.open = true
      this.title = "添加【请填写功能名称】"
    },
    
    /** 获取设备类型名称 */
    getDeviceName(deviceId) {
      const device = this.deviceOptions.find(item => item.deviceId === deviceId)
      return device ? device.deviceName : '-'
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset()
      const physicalId = row.physicalId || this.ids
      getMaster(physicalId).then(response => {
        this.form = response.data
        // 修改时，将密码也赋值给确认密码字段，避免比较不一致
        if (this.form.password) {
          this.form.checkPassword = this.form.password
        }
        this.open = true
        this.title = "修改【请填写功能名称】"
      })
    },
    /** 提交按钮 */
    submitForm() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.physicalId != null) {
            updateMaster(this.form).then(response => {
              this.$modal.msgSuccess("修改成功")
              this.open = false
              this.getList()
            })
          } else {
            addMaster(this.form).then(response => {
              this.$modal.msgSuccess("新增成功")
              this.open = false
              this.getList()
            })
          }
        }
      })
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const physicalIds = row.physicalId || this.ids
      this.$modal.confirm('是否确认删除【请填写功能名称】编号为"' + physicalIds + '"的数据项？').then(function() {
        return delMaster(physicalIds)
      }).then(() => {
        this.getList()
        this.$modal.msgSuccess("删除成功")
      }).catch(() => {})
    },
    /** 查看详情按钮操作 */
    handleView(row) {
      const physicalId = row.physicalId
      // 跳转到 hardwareinfo 页面，并传递 physicalId 参数
      this.$router.push({
        path: '/monitor/hardwareinfo',
        query: { physicalId: physicalId }
      })
    },
    /** 导出按钮操作 */
    handleExport() {
      this.download('device/master/export', {
        ...this.queryParams
      }, `master_${new Date().getTime()}.xlsx`)
    }
  }
}
</script>

<style scoped>
.tree-container {
  background: #fff;
  border-radius: 4px;
  padding: 15px;
  height: calc(100vh - 120px);
  overflow-y: auto;
}

/* 减少操作列按钮之间的间距 */
.el-table .cell {
  padding: 0 5px;
}

.el-button + .el-button {
  margin-left: 0.5px;
}
</style>
