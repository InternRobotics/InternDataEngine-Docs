---
title: 自定义任务
description: 如何在 InternDataEngine 中创建新任务
---

# 创建自定义任务

本指南说明如何为 InternDataEngine 创建新的仿真任务。

## 方式一：仅 YAML 配置

大多数情况下，只需要一个新的 YAML 文件。

### 步骤 1：复制模板

```bash
cp configs/manip/simbox/basic/lift2/pour_redwine_left.yaml \
   configs/manip/simbox/basic/lift2/my_task.yaml
```

### 步骤 2：修改配置

```yaml
tasks:
  - name: my_task
    task: BananaBaseTask
    
    robots:
      - name: "lift2"
        target_class: Lift2
        robot_file:
          - path/to/left_arm.yml
          - path/to/right_arm.yml
    
    objects:
      - name: my_object
        path: path/to/object.usd
        translation: [0.0, 0.0, 0.0]
    
    regions:
      - object: my_object
        target: table
        random_config:
          pos_range: [[-0.3, -0.35, 0.0], [-0.25, -0.25, 0.0]]
    
    skills:
      - lift2:
          - left:
              - name: pick
                objects: [my_object]
```

### 步骤 3：运行任务

```bash
python launcher.py \
  --config configs/manip/simbox/de_plan_with_render_template.yaml \
  --task_config configs/manip/simbox/basic/lift2/my_task.yaml
```

## 方式二：自定义任务类

对于高级定制，创建新的任务类：

```python
from workflows.simbox.core.tasks.banana import BananaBaseTask

class MyCustomTask(BananaBaseTask):
    def set_up_scene(self):
        super().set_up_scene()
        # 自定义场景设置
    
    def reset(self):
        super().reset()
        # 自定义重置逻辑
```

## 检查清单

- [ ] 创建 YAML 配置
- [ ] 定义物体
- [ ] 配置区域
- [ ] 设置相机
- [ ] 定义技能
- [ ] 测试执行

## 下一步

- [自定义控制器](/zh/custom/controller) - 创建自定义控制器
- [自定义技能](/zh/custom/skill) - 创建自定义技能