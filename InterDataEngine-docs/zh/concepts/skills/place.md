---
title: 放置技能
description: InternDataEngine 放置操作技能详细指南
---

# 放置技能

放置技能使机器人能够将物体放到目标位置。`Place` 技能处理带有各种约束和成功标准的放置操作。

## 概述

Place 技能执行以下操作：

```
1. 基于容器边界框计算目标放置位置
2. 生成约束的末端执行器方向
3. 规划预放置接近轨迹
4. 执行放置并释放物体
```

---

## 配置参数

### 基本配置

```yaml
skills:
  - name: place
    objects: [pick_object, place_container]
    
    # 放置方向："vertical" 或 "horizontal"
    place_direction: "vertical"
    
    # 位置约束："gripper" 或 "object"
    position_constraint: "gripper"
```

### 放置位置

```yaml
    # 容器边界框内采样放置位置的比例范围
    x_ratio_range: [0.4, 0.6]
    y_ratio_range: [0.4, 0.6]
    z_ratio_range: [0.4, 0.6]
    
    # 预放置 Z 偏移（容器上方高度）
    pre_place_z_offset: 0.2
    
    # 最终放置 Z 偏移
    place_z_offset: 0.1
```

### 方向约束

```yaml
    # 按轴方向过滤末端执行器方向
    filter_x_dir: ["downward", 30]       # X轴指向下方
    filter_y_dir: ["forward", 45]        # Y轴指向前方
    filter_z_dir: ["backward", 60, 90]   # Z轴角度范围
    
    # 物体对齐约束
    align_pick_obj_axis: [0, 0, 1]       # 抓取物体上要对齐的轴
    align_place_obj_axis: [0, 0, 1]      # 放置容器上要对齐的轴
    align_obj_tol: 15                     # 对齐容差（度）
```

### 水平放置

用于水平放置（如插入物体）：

```yaml
    place_direction: "horizontal"
    position_constraint: "object"  # 或 "gripper"
    
    # 对齐轴
    align_place_obj_axis: [1, 0, 0]
    offset_place_obj_axis: [0, 0, 1]
    
    # 预放置对齐距离
    pre_place_align: 0.2
    pre_place_offset: 0.2
    place_align: 0.1
    place_offset: 0.1
```

### 运动参数

```yaml
    # 夹爪控制
    gripper_change_steps: 10
    hesitate_steps: 0  # 释放前暂停
    
    # 放置后运动
    post_place_vector: [0, 0, 0.1]  # 撤退方向
    
    # 代价度量权重
    pre_place_hold_vec_weight: null
    post_place_hold_vec_weight: null
```

---

## 放置策略

### 垂直放置

在容器顶部放置物体的默认策略：

```yaml
place_direction: "vertical"
```

算法：
1. 在容器顶面内采样 (x, y) 位置
2. 设置容器上方的高度（pre_place_z_offset）
3. 降低到 place_z_offset
4. 释放夹爪

### 水平放置

用于将物体插入槽或开口：

```yaml
place_direction: "horizontal"
align_place_obj_axis: [1, 0, 0]  # 插入轴
offset_place_obj_axis: [0, 0, 1]  # 偏移方向
```

算法：
1. 在容器边界框内采样位置
2. 沿对齐轴计算接近位置偏移
3. 移动到预放置位置
4. 沿对齐轴向前移动到放置位置
5. 释放夹爪

---

## 方向生成

`generate_constrained_rotation_batch()` 方法生成有效的末端执行器方向：

```python
def generate_constrained_rotation_batch(self, batch_size=3000):
    # 1. 随机采样旋转
    rot_mats = R.random(batch_size).as_matrix()
    valid_mask = np.ones(batch_size, dtype=bool)
    
    # 2. 应用方向过滤器
    for axis in ["x", "y", "z"]:
        filter_list = self.skill_cfg.get(f"filter_{axis}_dir", None)
        if filter_list is not None:
            # 基于轴方向约束进行过滤
            ...
    
    # 3. 应用物体对齐约束
    if self.align_pick_obj_axis is not None:
        # 确保抓取物体轴与放置容器轴对齐
        ...
    
    return valid_rot_mats
```

---

## 成功标准

`is_success()` 方法支持多种评估模式：

### 3D IoU 模式（默认）

测量抓取物体与容器之间的 3D 交并比：

```yaml
success_mode: "3diou"
```

```python
iou = IoU(Box(pick_obj_bbox), Box(place_obj_bbox)).iou()
return iou > threshold
```

### 高度模式

检查物体高度是否低于阈值：

```yaml
success_mode: "height"
```

### XY 边界框模式

检查物体中心是否在容器 XY 边界内：

```yaml
success_mode: "xybbox"
```

### 方向模式

检查物体是否在容器的左侧或右侧：

```yaml
success_mode: "left"   # 或 "right"
threshold: 0.03
```

### Flower/Cup 模式

特定物体类型的专用成功标准：

```yaml
success_mode: "flower"
success_th: 0.0
```

---

## 执行流程

```python
def simple_generate_manip_cmds(self):
    manip_list = []
    
    # 1. 更新碰撞场景
    p_base_ee_cur, q_base_ee_cur = self.controller.get_ee_pose()
    
    # 2. 生成放置轨迹
    result = self.sample_gripper_place_traj()
    # result[0]: 预放置位姿
    # result[1]: 放置位姿
    # result[2]: 放置后位姿（如果配置了）
    
    # 3. 生成命令
    # - 移动到预放置位姿（夹爪闭合）
    # - 移动到放置位姿
    # - 打开夹爪
    # - 分离物体
    # - 撤退（如果设置了 post_place_vector）
    
    self.manip_list = manip_list
```

---

## 关键参数参考

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `place_direction` | string | "vertical" | 放置接近方向 |
| `position_constraint` | string | "gripper" | "gripper" 或 "object" 位置模式 |
| `pre_place_z_offset` | float | 0.2 | 接近时容器上方高度 |
| `place_z_offset` | float | 0.1 | 最终放置高度 |
| `x_ratio_range` | [float, float] | [0.4, 0.6] | X 位置采样范围 |
| `y_ratio_range` | [float, float] | [0.4, 0.6] | Y 位置采样范围 |
| `gripper_change_steps` | int | 10 | 夹爪打开动作步数 |
| `hesitate_steps` | int | 0 | 释放前暂停步数 |
| `success_mode` | string | "3diou" | 成功评估模式 |
| `post_place_vector` | [float, float, float] | null | 放置后撤退方向 |

---

## 配置示例

### 简单放置到容器上

```yaml
skills:
  - name: place
    objects: [bolt, box]
    place_direction: "vertical"
    pre_place_z_offset: 0.15
    place_z_offset: 0.05
```

### 精确插入

```yaml
skills:
  - name: place
    objects: [peg, hole]
    place_direction: "horizontal"
    position_constraint: "object"
    align_place_obj_axis: [0, 0, 1]
    pre_place_align: 0.1
    place_align: 0.02
    filter_x_dir: ["forward", 15]
```

### 带撤退的放置

```yaml
skills:
  - name: place
    objects: [item, shelf]
    place_direction: "vertical"
    post_place_vector: [0, 0, 0.15]
    gripper_change_steps: 20
```

---

## 相关内容

- [抓取技能](/zh/concepts/skills/pick/) - 放置前抓取物体
- [关节操作技能](/zh/concepts/skills/articulation/) - 操作关节物体
- [任务](/zh/concepts/tasks/) - 将技能组合成任务工作流