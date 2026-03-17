---
title: 关节操作技能
description: InternDataEngine 关节物体操作技能详细指南
---

# 关节操作技能

关节操作技能使机器人能够操作关节物体，如门、抽屉和柜子。这些技能使用 KPAM（基于关键点的姿态属性操作）规划器进行精确操作。

## 可用关节技能

| 技能 | 描述 | 适用场景 |
|------|------|----------|
| `open` | 打开关节物体 | 打开门、抽屉、柜子 |
| `close` | 关闭关节物体 | 关闭门、抽屉 |

---

## 关节操作原理

InternDataEngine 中的关节物体表示包含：

- **关节位置**：可追踪的门、抽屉等关节状态
- **接触视图**：监控手指-物体和碰撞接触
- **初始关节位置**：用于成功评估的参考状态

### 操作流程

```
1. 从配置加载关节信息
2. 设置 KPAM 规划器生成轨迹
3. 生成操作关键帧位姿
4. 执行轨迹并控制夹爪
5. 基于关节位移评估成功
```

---

## Open 技能

`Open` 技能用于打开门、抽屉等关节物体。

### 配置

```yaml
skills:
  - name: open
    objects: [door_handle]
    
    # 关节特定信息路径
    obj_info_path: "path/to/articulation_info.yaml"
    
    # 规划器设置
    planner_setting:
      # 轨迹中的接触位姿索引
      contact_pose_index: 2
      
      # 成功阈值（关节位移，弧度/米）
      success_threshold: 1.5
      
      # 成功评估模式
      success_mode: "abs"  # "abs" 或 "normal"
      
      # 是否更新关节目标
      update_art_joint: false
```

### 规划器配置

KPAM 规划器需要额外配置：

```yaml
planner_setting:
  # 轨迹生成参数
  contact_pose_index: 2
  
  # 成功标准
  success_threshold: 1.5
  success_mode: "abs"
  
  # 关节控制
  update_art_joint: false
```

### 执行流程

```python
def simple_generate_manip_cmds(self):
    # 1. 如果提供了路径，更新关节信息
    if self.skill_cfg.get("obj_info_path", None):
        self.art_obj.update_articulation_info(self.skill_cfg["obj_info_path"])
    
    # 2. 设置 KPAM 规划器
    self.setup_kpam()
    
    # 3. 生成关键帧轨迹
    traj_keyframes, sample_times = self.planner.get_keypose()
    
    # 4. 转换为操作命令
    for i, keyframe in enumerate(traj_keyframes):
        if i <= self.contact_pose_index:
            gripper_cmd = "open_gripper"
        else:
            gripper_cmd = "close_gripper"
        
        # 在接触点添加夹爪闭合命令
        if i == self.contact_pose_index:
            # 多步确保夹爪完全闭合
            manip_list.extend([close_cmd] * 40)
        
        # 在接触前更新碰撞场景
        if i == self.contact_pose_index - 1:
            # 忽略父关节的碰撞
            ...
```

### 成功标准

| 标准 | 描述 |
|------|------|
| 关节位移 | `curr_joint_p - init_joint_p >= threshold` |
| 碰撞有效 | 无禁止的碰撞接触 |
| 过程有效 | 机器人和关节速度在限制范围内 |

```python
def is_success(self):
    # 检查关节位移
    curr_joint_p = self.art_obj._articulation_view.get_joint_positions()[:, self.art_obj.object_joint_index]
    init_joint_p = self.art_obj.articulation_initial_joint_position
    
    # 成功模式
    if self.success_mode == "normal":
        return (curr_joint_p - init_joint_p) >= np.abs(self.success_threshold)
    elif self.success_mode == "abs":
        return np.abs(curr_joint_p - init_joint_p) >= np.abs(self.success_threshold)
```

---

## Close 技能

`Close` 技能用于关闭关节物体。

### 配置

```yaml
skills:
  - name: close
    objects: [door_handle]
    
    obj_info_path: "path/to/articulation_info.yaml"
    
    planner_setting:
      contact_pose_index: 2
      success_threshold: 0.1
      update_art_joint: false
```

### 与 Open 的关键区别

- 夹爪在整个轨迹中保持**闭合**
- 当关节位置**接近零**（关闭状态）时成功

```python
def is_success(self):
    curr_joint_p = self.art_obj._articulation_view.get_joint_positions()[:, self.art_obj.object_joint_index]
    
    return np.abs(curr_joint_p) <= self.success_threshold and \
           self.collision_valid and \
           self.process_valid
```

---

## 接触监控

Open 和 Close 技能都监控多种接触类型：

### 接触视图

```python
# 手指连杆接触（夹爪手指）
self.fingers_link_contact_view

# 手指基座接触（夹爪手掌）
self.fingers_base_contact_view

# 禁止碰撞区域
self.forbid_collision_contact_view
```

### 接触评估

```python
def get_contact(self, contact_threshold=0.0):
    contact = {}
    
    # 检查手指连杆接触
    fingers_link_contact = np.abs(
        self.fingers_link_contact_view.get_contact_force_matrix()
    ).squeeze()
    
    # 检查禁止碰撞
    forbid_collision_contact = np.abs(
        self.forbid_collision_contact_view.get_contact_force_matrix()
    ).squeeze()
    
    return contact
```

---

## KPAM 规划器集成

KPAM 规划器生成操作轨迹：

```python
def setup_kpam(self):
    self.planner = KPAMPlanner(
        env=self.world,
        robot=self.robot,
        object=self.art_obj,
        cfg_path=self.planner_setting,
        controller=self.controller,
        draw_points=self.draw,
        stage=self.stage,
    )
```

### 关键帧生成

```python
traj_keyframes, sample_times = self.planner.get_keypose()
```

每个关键帧包含：
- 位置（3D）
- 方向（旋转矩阵）
- 轨迹插值的时间戳

---

## 配置参考

### Open 技能参数

| 参数 | 类型 | 描述 |
|------|------|------|
| `objects` | [string] | 关节物体名称 |
| `obj_info_path` | string | 关节信息 YAML 路径 |
| `planner_setting.contact_pose_index` | int | 夹爪接触物体的索引 |
| `planner_setting.success_threshold` | float | 关节位移阈值 |
| `planner_setting.success_mode` | string | "abs" 或 "normal" |
| `planner_setting.update_art_joint` | bool | 执行期间更新关节目标 |

### 成功模式

| 模式 | 公式 | 适用场景 |
|------|------|----------|
| `abs` | `|Δ关节| >= 阈值` | 绝对位移检查 |
| `normal` | `Δ关节 >= 阈值` | 方向特定检查 |

---

## 配置示例

### 打开门

```yaml
skills:
  - name: open
    objects: [cabinet_door]
    obj_info_path: "configs/articulation/cabinet_door.yaml"
    planner_setting:
      contact_pose_index: 3
      success_threshold: 1.2  # 铰链用弧度
      success_mode: "abs"
```

### 打开抽屉

```yaml
skills:
  - name: open
    objects: [drawer_handle]
    obj_info_path: "configs/articulation/drawer.yaml"
    planner_setting:
      contact_pose_index: 2
      success_threshold: 0.3  # 滑动用米
      success_mode: "abs"
```

### 关闭门

```yaml
skills:
  - name: close
    objects: [cabinet_door]
    obj_info_path: "configs/articulation/cabinet_door.yaml"
    planner_setting:
      contact_pose_index: 3
      success_threshold: 0.1  # 接近关闭状态
```

---

## 最佳实践

1. **关节信息**：提供准确的关节信息以正确跟踪关节
2. **接触位姿索引**：根据操作序列正确配置
3. **成功阈值**：根据关节类型设置（铰链用弧度，滑轨用米）
4. **碰撞区域**：在任务设置中定义禁止碰撞区域
5. **关节更新**：启用 `update_art_joint` 进行动态关节控制

---

## 相关内容

- [抓取技能](/zh/concepts/skills/pick/) - 抓取物体
- [放置技能](/zh/concepts/skills/place/) - 放置物体
- [任务](/zh/concepts/tasks/) - 将技能组合成任务工作流