---
title: 控制器 API
description: 控制器模块 API 参考
---

# 控制器 API 参考

本文档提供控制器模块的 API 文档。

## TemplateController

所有机器人手臂控制器的基类。

### 构造函数

```python
TemplateController(cfg, task, robot_file: str, **kwargs)
```

**参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `cfg` | DictConfig | 控制器配置 |
| `task` | BananaBaseTask | 任务实例 |
| `robot_file` | str | CuRobo 机器人配置路径 |

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `raw_js_names` | List[str] | CuRobo 顺序的关节名 |
| `cmd_js_names` | List[str] | 仿真顺序的关节名 |
| `arm_indices` | np.ndarray | 手臂关节索引 |
| `gripper_indices` | np.ndarray | 夹爪关节索引 |
| `_gripper_state` | float | 夹爪状态（1.0=开, -1.0=闭） |

### 方法

#### `_configure_joint_indices(robot_file: str)`

配置关节名称和索引。**必须由子类实现。**

#### `_get_default_ignore_substring() -> List[str]`

返回默认碰撞过滤子字符串。**必须由子类实现。**

#### `get_gripper_action() -> np.ndarray`

映射夹爪状态到关节目标。**必须由子类实现。**

#### `plan_to_pose(target_pose)`

规划到目标位姿的运动。

#### `execute_plan()`

执行规划的轨迹。

#### `set_gripper_state(state: float)`

设置夹爪状态（1.0=开, -1.0=闭）。

---

## 可用控制器

| 控制器 | 机器人 | 特性 |
|--------|--------|------|
| `Lift2Controller` | ARX-Lift2 | 双臂，x轴抓取 |
| `SplitAlohaController` | Split Aloha | 双臂，z轴抓取 |
| `Genie1Controller` | Genie1 | 7自由度，路径权重 |
| `FR3Controller` | Franka FR3 | 单臂，Panda夹爪 |
| `FrankaRobotiq85Controller` | Franka + Robotiq | 单臂，Robotiq夹爪 |