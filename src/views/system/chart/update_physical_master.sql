ALTER TABLE `physical_master` ADD COLUMN `node_x` decimal(5,2) NULL DEFAULT NULL COMMENT '节点X坐标(百分比)' AFTER `remark`;
ALTER TABLE `physical_master` ADD COLUMN `node_y` decimal(5,2) NULL DEFAULT NULL COMMENT '节点Y坐标(百分比)' AFTER `node_x`;
