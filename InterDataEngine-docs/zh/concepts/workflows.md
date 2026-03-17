---
title: 工作流
description: 理解 InternDataEngine 中的工作流架构
---

# 工作流

**工作流** 是 InternDataEngine 中的顶级协调器。它管理从初始化到数据收集的整个仿真流程。

## 工作流生命周期

```
┌─────────────────────────────────────────────────────────┐
│                    工作流生命周期                         │
├─────────────────────────────────────────────────────────┤
│  1. 初始化仿真                                           │
│     ├── 创建 Isaac Sim 场景                             │
│     ├── 设置物理参数                                    │
│     └── 配置渲染                                        │
│                                                          │
│  2. 加载场景                                             │
│     ├── 加载机器人（从配置）                            │
│     ├── 加载物体（从配置）                              │
│     └── 加载相机（从配置）                              │
│                                                          │
│  3. 执行任务                                             │
│     ├── 对于任务配置中的每个技能：                      │
│     │   ├── 规划运动（通过控制器）                      │
│     │   ├── 执行轨迹                                    │
│     │   └── 收集观测数据                                │
│     └── 保存数据到输出目录                              │
│                                                          │
│  4. 重置（重复或结束）                                   │
│     ├── 重置物体位姿                                    │
│     ├── 重置机器人状态                                  │
│     └── 应用域随机化                                    │
└─────────────────────────────────────────────────────────┘
```

## SimBoxDualWorkflow

双臂操作的主要工作流是 `SimBoxDualWorkFlow`，定义在 `workflows/simbox_dual_workflow.py` 中。

### 核心方法

| 方法 | 描述 |
|------|------|
| `__init__(cfg)` | 使用配置初始化工作流 |
| `set_up_scene()` | 加载机器人、物体和相机 |
| `reset()` | 为新回合重置场景 |
| `step()` | 执行一个仿真步骤 |
| `run()` | 任务执行的主循环 |

### 配置

工作流通过 YAML 文件配置：

```yaml
workflow_type: SimBoxDualWorkFlow

simulator:
  physics_dt: 1/30      # 物理时间步
  rendering_dt: 1/30    # 渲染时间步
  headless: false       # 无 GUI 运行
  anti_aliasing: 2      # 抗锯齿级别

tasks:
  - name: banana_base_task
    task: BananaBaseTask
    # ... 任务配置
```

## 工作流类型

### SimBoxDualWorkFlow

双臂操作任务的主要工作流：

- 支持双臂机器人（Lift2、Split Aloha、Genie1）
- 协调左右臂控制器
- 处理并行技能执行

### 自定义工作流

你可以通过继承 `BaseWorkflow` 创建自定义工作流：

```python
from workflows.base import BaseWorkflow

class MyCustomWorkflow(BaseWorkflow):
    def __init__(self, cfg):
        super().__init__(cfg)
        # 自定义初始化
    
    def set_up_scene(self):
        super().set_up_scene()
        # 自定义场景设置
    
    def run(self):
        # 自定义运行逻辑
```

## 关键文件

| 文件 | 用途 |
|------|------|
| `workflows/base.py` | 基础工作流类 |
| `workflows/simbox_dual_workflow.py` | 双臂工作流实现 |
| `workflows/__init__.py` | 工作流注册 |

## 与其他组件的集成

```
工作流
    ├── 任务 (banana.py)
    │   ├── 物体
    │   ├── 相机
    │   └── 区域
    │
    ├── 控制器 (template_controller.py)
    │   ├── CuRobo 运动规划器
    │   └── 夹爪控制
    │
    └── 技能 (pick.py, place.py, ...)
        └── 原子动作
```

## 下一步

- [控制器](/zh/concepts/controllers/) - 了解机器人运动规划
- [技能](/zh/concepts/skills/) - 理解操作技能
- [任务](/zh/concepts/tasks/) - 定义仿真环境