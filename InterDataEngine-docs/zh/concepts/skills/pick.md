---
title: 抓取技能
description: InternDataEngine 抓取操作技能详细指南
---

# 抓取技能

抓取技能使机器人能够抓取并提升当前位置的物体。InternDataEngine 提供多种抓取技能变体以处理不同的抓取场景。

## 可用抓取技能

| 技能 | 描述 | 适用场景 |
|------|------|----------|
| `pick` | 带抓取位姿采样的标准抓取 | 具有多个抓取候选的一般抓取 |
| `dexpick` | 带预定义抓取位姿的 Dex 风格抓取 | 已知抓取配置的精确抓取 |
| `manualpick` | 手动指定抓取位姿 | 自定义抓取位姿控制 |
| `dynamicpick` | 动态抓取选择 | 基于物体状态的自适应抓取 |

---

## Pick（标准抓取）

标准 `Pick` 技能从预计算的抓取标注文件中采样多个抓取位姿，并通过运动规划选择最可行的位姿。

### 工作原理

```
1. 从 .npy 文件加载抓取标注
2. 将抓取位姿转换到机器人基座坐标系
3. 应用方向过滤器（x、y、z 轴约束）
4. 采样可行的抓取位姿
5. 生成预抓取接近轨迹
6. 执行抓取和抓取后提升
```

### 配置参数

```yaml
skills:
  - name: pick
    objects: [target_object]
    
    # 抓取标注文件（默认：Aligned_grasp_sparse.npy）
    npy_name: "Aligned_grasp_sparse.npy"
    
    # 预抓取偏移距离（米）
    pre_grasp_offset: 0.1
    
    # 抓取后提升偏移（米）
    post_grasp_offset_min: 0.05
    post_grasp_offset_max: 0.1
    
    # 夹爪配置
    final_gripper_state: -1  # -1: 闭合, 1: 打开
    gripper_change_steps: 40
    
    # 抓取处理
    grasp_scale: 1
    tcp_offset: [0, 0, 0]
    
    # 方向约束
    filter_x_dir: ["forward", 45]      # X轴指向前方，偏差在45度以内
    filter_y_dir: ["upward", 30]       # Y轴指向上方，偏差在30度以内
    filter_z_dir: ["backward", 60, 90] # Z轴在60-90度之间
    
    # 相对于物体的方向约束
    direction_to_obj: "right"  # 或 "left"
    
    # 固定方向覆盖
    fixed_orientation: [0, 0, 0, 1]  # 四元数 [x, y, z, w]
    
    # 运动规划
    test_mode: "forward"  # "forward" 或 "ik"
    ignore_substring: []
```

### 抓取位姿采样

`sample_ee_pose()` 方法基于以下条件过滤和采样抓取位姿：

1. **方向过滤器**：约束末端执行器沿 x、y、z 轴的方向
2. **方向过滤器**：确保相对于物体位置的接近方向
3. **基于分数的采样**：优先选择高质量的抓取位姿

```python
# 示例：过滤 X 轴指向前方的抓取位姿
filter_x_dir: ["forward", 45]  # 在前方方向45度以内

# 示例：带角度范围的过滤
filter_z_dir: ["upward", 30, 60]  # 在向上30-60度之间
```

### 执行流程

```python
def simple_generate_manip_cmds(self):
    # 1. 更新碰撞场景（忽略目标物体）
    # 2. 生成预抓取位姿
    # 3. 测试运动可行性（批量或顺序）
    # 4. 选择最佳可行位姿
    # 5. 生成命令序列：
    #    - 移动到预抓取位姿（夹爪打开）
    #    - 移动到抓取位姿
    #    - 闭合夹爪
    #    - 将物体附加到夹爪
    #    - 提升物体（抓取后）
```

### 成功标准

| 标准 | 描述 |
|------|------|
| 接触检查 | 夹爪手指与物体接触 |
| 速度检查 | 机器人和物体速度在限制范围内 |
| 提升检查 | 物体高度超过阈值（如果 `lift_th` > 0）|

---

## Dexpick

`Dexpick` 使用 YAML 配置文件中预定义的抓取位姿，提供对抓取方法的更精确控制。

### 配置

```yaml
skills:
  - name: dexpick
    objects: [target_object]
    pick_pose_idx: 0  # dexpick_pose.yaml 中的索引
    
    # 接近参数
    pre_grasp_offset: 0.1
    post_grasp_offset_min: 0.05
    post_grasp_offset_max: 0.1
    gripper_change_steps: 40
```

### 抓取位姿文件

抓取位姿定义在 `dexpick_pose.yaml` 中：

```yaml
pick_poses:
  - [x, y, z, qw, qx, qy, qz]  # 位姿 0
  - [x, y, z, qw, qx, qy, qz]  # 位姿 1
  # ... 更多位姿
```

### 执行流程

```
1. 从 dexpick_pose.yaml 加载抓取位姿
2. 通过 pick_pose_idx 选择位姿
3. 转换到机器人基座坐标系
4. 生成预抓取接近（如果 pre_grasp_offset > 0）
5. 执行抓取运动
6. 闭合夹爪并提升
```

---

## Manualpick

当需要精确控制抓取位姿时使用 `manualpick`。

### 配置

```yaml
skills:
  - name: manualpick
    objects: [target_object]
    grasp_pose: [x, y, z, qw, qx, qy, qz]  # 显式位姿
    
    pre_grasp_offset: 0.1
    post_grasp_offset_min: 0.05
    post_grasp_offset_max: 0.1
```

---

## Dynamicpick

`Dynamicpick` 基于当前物体状态和环境动态选择抓取位姿。

### 配置

```yaml
skills:
  - name: dynamicpick
    objects: [target_object]
    pivot_angle_z: 0  # 旋转枢轴角度
    
    # 类似 pick 的其他参数
    pre_grasp_offset: 0.1
    post_grasp_offset_min: 0.05
```

---

## 关键方法

### is_feasible()

基于规划失败次数检查技能执行是否可行：

```python
def is_feasible(self, th=5):
    return self.controller.num_plan_failed <= th
```

### is_done()

确定技能是否已完成所有命令的执行：

```python
def is_done(self):
    if len(self.manip_list) == 0:
        return True
    if self.is_subtask_done():
        self.manip_list.pop(0)
    return len(self.manip_list) == 0
```

### is_success()

评估抓取操作是否成功：

```python
def is_success(self):
    # 1. 检查夹爪-物体接触
    _, indices = self.get_contact()
    flag = len(indices) >= 1  # 至少一个接触点
    
    # 2. 检查过程有效性（速度在限制范围内）
    self.process_valid = (
        np.max(np.abs(self.robot.get_joints_state().velocities)) < 5 and
        np.max(np.abs(self.pick_obj.get_linear_velocity())) < 5
    )
    
    # 3. 检查提升高度（如果设置了阈值）
    if self.skill_cfg.get("lift_th", 0.0) > 0.0:
        p_world_obj = self.pick_obj.get_local_pose()[0]
        flag = flag and ((p_world_obj[2] - self.obj_init_trans[2]) > self.skill_cfg.get("lift_th", 0.0))
    
    return flag
```

---

## 最佳实践

1. **抓取标注质量**：确保抓取位姿标注覆盖多样化的方向
2. **预抓取偏移**：使用足够的偏移（0.1-0.2米）实现无碰撞接近
3. **抓取后提升**：配置提升高度以验证成功抓取
4. **方向过滤器**：使用过滤器约束接近方向以满足任务需求
5. **碰撞忽略**：正确配置 `ignore_substring` 以避免错误的碰撞检测

## 相关内容

- [放置技能](/zh/concepts/skills/place/) - 抓取后放置物体
- [关节操作技能](/zh/concepts/skills/articulation/) - 操作关节物体
- [任务](/zh/concepts/tasks/) - 将技能组合成任务工作流