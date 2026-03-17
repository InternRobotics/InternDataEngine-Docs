---
title: 技能概述
description: InternDataEngine 中的机器人操作技能
---

# 技能概述

技能定义机器人可以执行的原子操作动作。每个技能封装了特定的行为，如抓取、放置或旋转物体。

## 技能架构

所有技能继承自 `BaseSkill`，定义在 `workflows/simbox/core/skills/base_skill.py` 中。

```
BaseSkill (抽象基类)
├── 操作技能
│   ├── dexpick.py      - Dex 风格抓取
│   ├── dexplace.py     - Dex 风格放置
│   ├── pick.py         - 标准抓取
│   ├── place.py        - 标准放置
│   ├── manualpick.py   - 手动抓取位姿
│   └── dynamicpick.py  - 动态抓取选择
├── 运动技能
│   ├── goto_pose.py    - 移动到目标位姿
│   ├── move.py         - 笛卡尔运动
│   └── rotate.py       - 旋转运动
├── 夹爪技能
│   ├── open.py         - 打开夹爪
│   ├── close.py        - 关闭夹爪
├── 工具技能
│   ├── home.py         - 返回初始位置
│   ├── wait.py         - 等待指定时长
│   └── heuristic_skill.py - 可配置动作
└── 任务特定技能
    ├── pour_water_succ.py - 倾倒
    ├── flip.py           - 翻转物体
    └── scan.py           - 扫描运动
```

## 可用技能

### 操作技能

| 技能 | 描述 | 关键参数 |
|------|------|----------|
| `dexpick` | Dex 风格抓取（带接近规划） | `objects`, `pick_pose_idx`, `pre_grasp_offset` |
| `dexplace` | Dex 风格放置（带约束） | `objects`, `camera_axis_filter` |
| `pick` | 标准抓取操作 | `objects` |
| `place` | 标准放置操作 | `objects` |
| `manualpick` | 手动指定抓取位姿 | `objects`, `grasp_pose` |
| `dynamicpick` | 动态抓取选择 | `objects`, `pivot_angle_z` |

### 运动技能

| 技能 | 描述 | 关键参数 |
|------|------|----------|
| `goto_pose` | 移动末端执行器到指定位姿 | `target_pose` |
| `move` | 笛卡尔运动 | `direction`, `distance` |
| `rotate` | 旋转末端执行器 | `axis`, `angle` |

### 工具技能

| 技能 | 描述 | 关键参数 |
|------|------|----------|
| `home` | 返回初始配置 | `mode` |
| `open` | 打开夹爪 | - |
| `close` | 关闭夹爪 | - |
| `wait` | 等待指定时长 | `duration` |

## 技能配置

技能在任务 YAML 的 `skills` 部分配置：

```yaml
skills:
  - lift2:
      - left:
          - name: dexpick
            objects: [bolt_left1]
            pick_pose_idx: 0
            pre_grasp_offset: 0.0
            post_grasp_offset: 0.1
          - name: dexplace
            objects: [bolt_left1, box]
            camera_axis_filter:
              - direction: [0, 0, 1]
              - degree: [0, 45]
        right:
          - name: dexpick
            objects: [bolt_right1]
            pick_pose_idx: 0
```

## 创建自定义技能

### 基本结构

```python
from workflows.simbox.core.skills.base_skill import BaseSkill
import numpy as np

class MySkill(BaseSkill):
    def __init__(self, cfg, task, controller, **kwargs):
        super().__init__(cfg, task, controller, **kwargs)
        # 初始化技能参数
    
    def run(self):
        """执行技能。"""
        # 1. 获取目标物体
        obj_name = self.skill_cfg["objects"][0]
        obj = self.task.objects[obj_name]
        
        # 2. 获取物体位姿
        obj_pose = obj.get_world_pose()
        
        # 3. 规划运动
        self.controller.plan_to_pose(obj_pose)
        
        # 4. 执行运动
        self.controller.execute_plan()
        
        # 5. 更新夹爪
        self.controller.set_gripper_state(1.0)  # 打开
```

### 技能参数

从 `self.skill_cfg` 访问技能参数：

```python
class MySkill(BaseSkill):
    def run(self):
        # 从 YAML 配置获取参数
        objects = self.skill_cfg.get("objects", [])
        offset = self.skill_cfg.get("offset", 0.1)
        
        # 访问任务和控制器
        obj = self.task.objects[objects[0]]
        self.controller.get_current_joint_state()
```

### 夹爪控制

```python
# 打开夹爪（状态 = 1.0）
self.controller.set_gripper_state(1.0)

# 关闭夹爪（状态 = -1.0）
self.controller.set_gripper_state(-1.0)

# 获取夹爪动作
action = self.controller.get_gripper_action()
```

## 技能执行流程

```
1. 技能初始化
   ├── 从 YAML 加载技能配置
   ├── 存储任务和控制器的引用
   └── 初始化内部状态

2. 技能执行 (run())
   ├── 获取目标物体/位姿
   ├── 规划运动轨迹
   ├── 执行轨迹
   └── 处理夹爪动作

3. 技能完成
   ├── 返回成功/失败状态
   └── 更新任务状态
```

## 关键文件

| 文件 | 用途 |
|------|------|
| `base_skill.py` | 所有技能的抽象基类 |
| `dexpick.py` | Dex 风格抓取实现 |
| `dexplace.py` | Dex 风格放置实现 |
| `__init__.py` | 技能注册 |

## 下一步

- [任务](/zh/concepts/tasks/) - 了解任务定义
- [自定义技能](/zh/custom/skill/) - 创建自己的技能