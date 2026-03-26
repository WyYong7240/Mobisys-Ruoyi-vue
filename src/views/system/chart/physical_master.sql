/*
 Navicat Premium Dump SQL

 Source Server         : test1
 Source Server Type    : MySQL
 Source Server Version : 50744 (5.7.44)
 Source Host           : 192.168.31.34:3309
 Source Schema         : ry-vue

 Target Server Type    : MySQL
 Target Server Version : 50744 (5.7.44)
 File Encoding         : 65001

 Date: 25/03/2026 19:38:43
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for physical_master
-- ----------------------------
DROP TABLE IF EXISTS `physical_master`;
CREATE TABLE `physical_master`  (
  `physical_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '物理机id',
  `physical_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '物理机名称',
  `device_id` int(11) NULL DEFAULT 2 COMMENT '物理机类型',
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '品牌',
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '型号',
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '状态，0正常，1禁用',
  `mac_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '网卡MAC地址',
  `ip_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ip地址',
  `create_time` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `leader` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '负责人',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '备注',
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '用户名称',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '密码',
  `Is_k8s` int(11) NULL DEFAULT NULL COMMENT '是否在k8s集群里，0代表是，1代表不是',
  PRIMARY KEY (`physical_id`) USING BTREE,
  INDEX `device_id`(`device_id`) USING BTREE,
  CONSTRAINT `device_id` FOREIGN KEY (`device_id`) REFERENCES `device_manager` (`device_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 153 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of physical_master
-- ----------------------------
INSERT INTO `physical_master` VALUES (122, 'master', 2, '阿里云', 'ecs.g8.48xlarge 裸金属服务器', 0, 'bc:fc:e7:c9:25:88', '192.168.31.34', '2026-01-10 09:15:20', '张明', '核心业务集群master节点', 'root', '$2a$10$9KrQLssepp5ZOh1fa3e2seejek8aixTbl.u3DMof8D7h1GpkAb5bm', 0);
INSERT INTO `physical_master` VALUES (123, 'node1', 3, '阿里云', 'ecs.g7.24xlarge 裸金属服务器', 0, 'bc:fc:e7:c9:22:02', '192.168.31.103', '2026-01-10 09:20:15', '张明', '核心业务集群node1节点', 'root', '$2a$10$LnZa2eQbYz.zvRwbIvuKCeplgUwN6t3kTtUjVVOxkBIsE5ycHxh0m', 0);
INSERT INTO `physical_master` VALUES (124, 'phy-tencent-01', 3, '腾讯云', 'S5.48xlarge 黑石物理机', 0, '00:16:3e:3c:7d:8e', '10.0.0.1', '2026-01-10 09:25:10', '李华', '游戏业务计算节点', 'root', 'Tencent@2026!', 1);
INSERT INTO `physical_master` VALUES (125, 'phy-tencent-02', 3, '腾讯云', 'S6.24xlarge 黑石物理机', 1, '00:16:3e:3c:7d:8f', '10.0.10.5', '2026-01-10 09:30:05', '李华', '游戏业务存储节点', 'root', 'Tencent@2026!', 0);
INSERT INTO `physical_master` VALUES (126, 'phy-huawei-01', 3, '华为', 'FusionServer RH2288 V5', 0, 'bc:fc:e7:c9:25:88', '10.0.30.40', '2026-01-10 10:00:00', '王强', '数据库主节点（MySQL主库）', 'root', 'Huawei@2026Root#', 0);
INSERT INTO `physical_master` VALUES (127, 'phy-huawei-02', 3, '华为', 'TaiShan 2280 V2', 0, 'bc:fc:e7:c9:25:89', '10.0.0.11', '2026-01-10 10:05:00', '王强', '数据库从节点（MySQL从库）', 'root', 'Huawei@2026Root#', 0);
INSERT INTO `physical_master` VALUES (140, 'phy-huawei-03', 2, '华为', 'FusionServer RH5885 V4', 0, 'bc:fc:e7:c9:25:90', '172.16.10.19', '2026-01-11 09:10:00', '王强', '分布式缓存Redis集群节点', 'root', 'Huawei@2026Root#', 0);
INSERT INTO `physical_master` VALUES (145, 'phy-ibm-02', 4, 'IBM', 'System x3650 M5', 0, '00:1b:21:5a:bc:ec', '172.16.10.24', '2026-01-11 09:35:00', '吴浩', '企业OA办公系统节点', 'root', 'IBM@2026OA!', 0);
INSERT INTO `physical_master` VALUES (148, 'phy-inspur-04', 4, '浪潮', 'i24G8 高密度服务器', 0, '00:1b:21:5a:bc:ee', '172.16.10.27', '2026-01-12 10:10:00', '刘芳', '高密度存储计算融合节点', 'root', 'Inspur@2026Dense!', 0);
INSERT INTO `physical_master` VALUES (149, 'phy-hpe-04', 4, 'HPE', 'ProLiant DL325 Gen10', 0, '00:1b:21:5a:bc:ef', '172.16.10.28', '2026-01-12 10:15:00', '陈杰', '轻量型应用服务节点', 'root', 'HPE@2026Light!', 0);
INSERT INTO `physical_master` VALUES (150, 'phy-lenovo-04', 2, '联想', 'ThinkSystem SD530 V2', 0, '00:1b:21:5a:bc:f0', '172.16.10.29', '2026-01-12 10:20:00', '周明', '云桌面虚拟化支撑节点', 'root', 'Lenovo@2026Cloud!', 0);
INSERT INTO `physical_master` VALUES (152, 'node2', 2, '阿里云', 'ecs.g7.24xlarge 裸金属服务器', 0, 'bc:fc:e7:c9:25:bc', '192.168.31.86', '2026-03-24 15:36:22', '王博', '数据备份恢复服务节点', 'root', '$2a$10$d4Y0NXRcQU.4TmWmQC1zneM7Icdz7wPr2MpuntED801uwPiLM0Afy', 0);

SET FOREIGN_KEY_CHECKS = 1;
