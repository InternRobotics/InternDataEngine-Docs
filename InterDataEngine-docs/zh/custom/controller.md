---
title: 自定义控制器
description: 如何在 InternDataEngine 中创建新的机器人控制器
---

# 创建自定义控制器

本指南说明如何为 InternDataEngine 创建新的机器人手臂控制器。

## 概述

控制器管理机器人运动规划和执行。要支持新机器人，你需要：

1. 创建控制器类
2. 实现必需方法
3. 注册控制器
4. 创建 CuRobo 配置

## 步骤 1：创建控制器文件

在 `workflows/simbox/core/controllers/` 中创建新文件：

```python
# myrobot_controller.py
from typing import List
import numpy as np
from workflows.simbox.core.controllers import register_controller, TemplateController

@register_controller
class MyRobotController(TemplateController):
    """MyRobot 控制器。"""
    
    def __init__(self, cfg, task, robot_file: str, **kwargs):
        super().__init__(cfg, task, robot_file, **kwargs)
```

## 步骤 2：实现必需方法

### `_configure_joint_indices`

设置关节名称和索引：

```python
def _configure_joint_indices(self, robot_file: str):
    """配置关节名称和索引。"""
    
    # 从 robot_file 确定手臂（左或右）
    if "left" in robot_file:
        self.lr_name = "left"
        prefix = "fl_"
    elif "right" in robot_file:
        self.lr_name = "right"
        prefix = "fr_"
    else:
        raise ValueError(f"未知手臂: {robot_file}")
    
    # CuRobo 规划器关节顺序
    self.raw_js_names = [f"joint{i}" for i in range(1, 7)]
    
    # 仿真关节名称
    self.cmd_js_names = [f"{prefix}joint{i}" for i in range(1, 7)]
    
    # 仿真中的关节索引
    self.arm_indices = np.array([0, 1, 2, 3, 4, 5])
    self.gripper_indices = np.array([6, 7])  # 2 个夹爪关节
    
    # 碰撞参考 prim 路径
    self.reference_prim_path = self.task.robots[self.name].fl_base_path
    
    # 夹爪状态
    self._gripper_state = 1.0  # 1.0 = 开, -1.0 = 闭
    self._gripper_joint_position = np.array([0.04, 0.04])
```

### `_get_default_ignore_substring`

定义碰撞过滤：

```python
def _get_default_ignore_substring(self) -> List[str]:
    """返回默认碰撞忽略子字符串。"""
    return ["table", "floor", "scene", "material"]
```

### `get_gripper_action`

将夹爪状态映射到关节目标：

```python
def get_gripper_action(self):
    """将夹爪状态映射到关节位置。"""
    # self._gripper_state: 1.0 = 开, -1.0 = 闭
    action = self._gripper_state * self._gripper_joint_position
    return np.clip(action, 0.0, 0.04)
```

## 步骤 3：实现可选方法

如果你的机器人与默认值不同，重写这些方法：

### `_load_world`

自定义世界配置：

```python
def _load_world(self, use_default: bool = True):
    """加载自定义桌面高度的世界。"""
    from curobo.types.world import WorldConfig
    
    world = WorldConfig()
    # 添加自定义桌面高度
    world.add_table(name="table", height=0.75)
    return world
```

### `_get_grasp_approach_linear_axis`

自定义抓取轴：

```python
def _get_grasp_approach_linear_axis(self) -> int:
    """返回抓取接近轴（0=x, 1=y, 2=z）。"""
    return 0  # 使用 x 轴作为抓取接近方向
```

### `_get_motion_gen_collision_cache`

自定义碰撞缓存大小：

```python
def _get_motion_gen_collision_cache(self):
    """返回碰撞缓存大小。"""
    return {"obb": 1000, "mesh": 1000}
```

## 步骤 4：注册控制器

在 `__init__.py` 中导入：

```python
# controllers/__init__.py
from .myrobot_controller import MyRobotController

# @register_controller 装饰器处理注册
```

## 步骤 5：创建 CuRobo 配置

为你的机器人创建 YAML 文件：

```yaml
# myrobot_arm.yml
robot_cfg:
  kinematics:
    urdf_path: "path/to/robot.urdf"
    base_link: "base_link"
    ee_link: "ee_link"
    cspace:
      - joint1
      - joint2
      - joint3
      - joint4
      - joint5
      - joint6
```

## 步骤 6：在任务 YAML 中配置

```yaml
robots:
  - name: "myrobot"
    target_class: MyRobot
    path: "myrobot/robot.usd"
    robot_file:
      - path/to/myrobot_left_arm.yml
      - path/to/myrobot_right_arm.yml
    ignore_substring: ["table"]
```

## 完整示例

```python
from typing import List
import numpy as np
from workflows.simbox.core.controllers import register_controller, TemplateController

@register_controller
class MyRobotController(TemplateController):
    """MyRobot 双臂系统控制器。"""
    
    def _configure_joint_indices(self, robot_file: str):
        if "left" in robot_file:
            self.lr_name = "left"
            prefix = "fl_"
        elif "right" in robot_file:
            self.lr_name = "right"
            prefix = "fr_"
        else:
            raise ValueError(f"未知手臂: {robot_file}")
        
        self.raw_js_names = [f"joint{i}" for i in range(1, 7)]
        self.cmd_js_names = [f"{prefix}joint{i}" for i in range(1, 7)]
        self.arm_indices = np.array([0, 1, 2, 3, 4, 5])
        self.gripper_indices = np.array([6, 7])
        self.reference_prim_path = getattr(
            self.task.robots[self.name], 
            f"{prefix}base_path"
        )
        self._gripper_state = 1.0
        self._gripper_joint_position = np.array([0.04, 0.04])
    
    def _get_default_ignore_substring(self) -> List[str]:
        return ["table", "floor", "scene"]
    
    def _get_grasp_approach_linear_axis(self) -> int:
        return 0  # x 轴
    
    def get_gripper_action(self):
        return np.clip(
            self._gripper_state * self._gripper_joint_position,
            0.0, 0.04
        )
```

## 检查清单

- [ ] 创建控制器文件
- [ ] 实现 `_configure_joint_indices`
- [ ] 实现 `_get_default_ignore_substring`
- [ ] 实现 `get_gripper_action`
- [ ] 按需重写可选方法
- [ ] 创建 CuRobo 配置 YAML
- [ ] 在 `__init__.py` 中导入
- [ ] 使用任务配置测试

## 下一步

- [自定义技能](/zh/custom/skill/) - 创建自定义技能
- [自定义任务](/zh/custom/task/) - 创建自定义任务