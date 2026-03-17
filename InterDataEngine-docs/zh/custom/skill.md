---
title: 自定义技能
description: 如何在 InternDataEngine 中创建新的操作技能
---

# 创建自定义技能

本指南说明如何为 InternDataEngine 创建新的操作技能。

## 概述

技能定义原子操作动作。要创建自定义技能，你需要：

1. 创建继承自 `BaseSkill` 的技能类
2. 实现 `run()` 方法
3. 注册技能

## 步骤 1：创建技能文件

在 `workflows/simbox/core/skills/` 中创建新文件：

```python
# my_skill.py
from workflows.simbox.core.skills.base_skill import BaseSkill
import numpy as np

class MySkill(BaseSkill):
    """自定义操作技能。"""
    
    def __init__(self, cfg, task, controller, **kwargs):
        super().__init__(cfg, task, controller, **kwargs)
```

## 步骤 2：实现技能

### 基本结构

```python
class MySkill(BaseSkill):
    """带接近动作的自定义抓取技能。"""
    
    def run(self):
        """执行技能。"""
        # 1. 获取技能参数
        objects = self.skill_cfg.get("objects", [])
        offset = self.skill_cfg.get("offset", 0.1)
        
        # 2. 获取目标物体
        obj_name = objects[0]
        obj = self.task.objects[obj_name]
        
        # 3. 获取物体位姿
        position, orientation = obj.get_world_pose()
        
        # 4. 计算抓取位姿
        grasp_pose = self._compute_grasp_pose(position, orientation, offset)
        
        # 5. 规划并执行
        self.controller.plan_to_pose(grasp_pose)
        self.controller.execute_plan()
        
        # 6. 夹爪动作
        self.controller.set_gripper_state(-1.0)  # 关闭
    
    def _compute_grasp_pose(self, position, orientation, offset):
        """计算带接近偏移的抓取位姿。"""
        # 添加接近偏移
        grasp_pos = position + np.array([0, 0, offset])
        return (grasp_pos, orientation)
```

## 步骤 3：访问任务组件

### 访问物体

```python
# 从任务获取物体
obj_name = self.skill_cfg["objects"][0]
obj = self.task.objects[obj_name]

# 获取物体位姿
position, orientation = obj.get_world_pose()

# 获取物体包围盒
bbox = obj.get_bounding_box()
```

### 访问机器人状态

```python
# 获取当前关节状态
joint_state = self.controller.get_current_joint_state()

# 获取末端执行器位姿
ee_pose = self.controller.get_ee_pose()

# 获取夹爪状态
gripper_state = self.controller._gripper_state
```

### 运动规划

```python
# 规划到目标位姿
success = self.controller.plan_to_pose(target_pose)

# 执行规划的轨迹
self.controller.execute_plan()

# 规划到关节配置
self.controller.plan_to_joint_state(target_joints)
```

### 夹爪控制

```python
# 打开夹爪
self.controller.set_gripper_state(1.0)

# 关闭夹爪
self.controller.set_gripper_state(-1.0)

# 获取夹爪动作
action = self.controller.get_gripper_action()
```

## 步骤 4：处理参数

技能可以从 YAML 接受参数：

```yaml
skills:
  - lift2:
      - left:
          - name: my_skill
            objects: [object_name]
            offset: 0.15
            approach_angle: 45
            gripper_delay: 0.5
```

在技能中访问参数：

```python
def run(self):
    objects = self.skill_cfg.get("objects", [])
    offset = self.skill_cfg.get("offset", 0.1)
    approach_angle = self.skill_cfg.get("approach_angle", 0)
    gripper_delay = self.skill_cfg.get("gripper_delay", 0.0)
```

## 步骤 5：错误处理

```python
def run(self):
    try:
        # 尝试运动规划
        success = self.controller.plan_to_pose(target_pose)
        if not success:
            print("规划失败，尝试替代方案...")
            # 处理失败
            return False
        
        self.controller.execute_plan()
        return True
        
    except Exception as e:
        print(f"技能执行失败: {e}")
        return False
```

## 完整示例：自定义抓取

```python
from workflows.simbox.core.skills.base_skill import BaseSkill
import numpy as np

class CustomPickSkill(BaseSkill):
    """带预抓取接近的自定义抓取技能。"""
    
    def __init__(self, cfg, task, controller, **kwargs):
        super().__init__(cfg, task, controller, **kwargs)
    
    def run(self):
        """执行自定义抓取技能。"""
        # 获取参数
        objects = self.skill_cfg.get("objects", [])
        pre_offset = self.skill_cfg.get("pre_grasp_offset", 0.1)
        post_offset = self.skill_cfg.get("post_grasp_offset", 0.05)
        
        if not objects:
            print("未指定物体")
            return False
        
        # 获取目标物体
        obj_name = objects[0]
        obj = self.task.objects[obj_name]
        obj_pos, obj_ori = obj.get_world_pose()
        
        # 打开夹爪
        self.controller.set_gripper_state(1.0)
        
        # 移动到预抓取位姿（物体上方）
        pre_grasp_pos = obj_pos + np.array([0, 0, pre_offset])
        success = self.controller.plan_to_pose((pre_grasp_pos, obj_ori))
        if not success:
            return False
        self.controller.execute_plan()
        
        # 移动到抓取位姿
        grasp_pos = obj_pos + np.array([0, 0, 0])
        success = self.controller.plan_to_pose((grasp_pos, obj_ori))
        if not success:
            return False
        self.controller.execute_plan()
        
        # 关闭夹爪
        self.controller.set_gripper_state(-1.0)
        
        # 抬起物体
        lift_pos = obj_pos + np.array([0, 0, post_offset])
        success = self.controller.plan_to_pose((lift_pos, obj_ori))
        if not success:
            return False
        self.controller.execute_plan()
        
        return True
```

## 注册和使用

### 在 `__init__.py` 中注册

```python
# skills/__init__.py
from .my_skill import MySkill
```

### 在任务 YAML 中使用

```yaml
skills:
  - lift2:
      - left:
          - name: my_skill
            objects: [bottle]
            offset: 0.1
```

## 最佳实践

1. **模块化设计**：将复杂技能分解为更小的步骤
2. **错误恢复**：优雅地处理规划失败
3. **参数化**：使用 YAML 参数实现灵活性
4. **日志记录**：打印有用的调试信息

## 下一步

- [自定义任务](/zh/custom/task/) - 创建自定义任务
- [控制器](/zh/concepts/controllers/) - 了解控制器