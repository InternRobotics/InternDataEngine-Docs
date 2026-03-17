---
title: YAML 配置
description: InternDataEngine 任务配置文件
---

# YAML 配置

InternDataEngine 中的任务配置使用 YAML 文件定义。本文档说明配置的结构和选项。

## 配置结构

```yaml
workflow_type: SimBoxDualWorkFlow

simulator:
  physics_dt: 1/30
  rendering_dt: 1/30
  headless: false

tasks:
  - name: task_name
    task: TaskClass
    # ... 任务配置
```

## 顶层字段

| 字段 | 类型 | 描述 |
|------|------|------|
| `workflow_type` | 字符串 | 工作流类名 |
| `simulator` | 字典 | 仿真参数 |
| `tasks` | 列表 | 任务定义 |

## 仿真器配置

```yaml
simulator:
  physics_dt: 1/30      # 物理时间步（秒）
  rendering_dt: 1/30    # 渲染时间步（秒）
  stage_units_in_meters: 1.0
  headless: false       # 无 GUI 运行
  anti_aliasing: 2      # 抗锯齿级别（0-4）
```

## 任务配置

### 基本字段

```yaml
tasks:
  - name: banana_base_task
    asset_root: workflows/simbox/assets
    task: BananaBaseTask
    task_id: 0
    offset: null
    render: true
```

### 机器人部分

```yaml
robots:
  - name: "lift2"
    target_class: Lift2
    path: "lift2/robot_invisible.usd"
    camera_mount: "lift2/lift2/fl/camera"
    euler: [0.0, 0.0, 90.0]
    robot_file:
      - path/to/left_arm.yml
      - path/to/right_arm.yml
    ignore_substring: ["table", "bolt"]
```

### 物体部分

```yaml
objects:
  - name: bottle
    path: objects/bottle.usd
    target_class: RigidObject
    dataset: oo3d
    category: bottle
    prim_path_child: Aligned
    translation: [0.0, 0.0, 0.0]
    euler: [90.0, 0.0, 0.0]
    scale: [1, 1, 1]
    apply_randomization: true
    orientation_mode: suggested
```

#### 物体字段

| 字段 | 类型 | 描述 |
|------|------|------|
| `name` | 字符串 | 唯一物体标识符 |
| `path` | 字符串 | USD 文件路径 |
| `target_class` | 字符串 | 物体类（RigidObject） |
| `dataset` | 字符串 | 数据集来源（oo3d） |
| `category` | 字符串 | 物体类别 |
| `translation` | [x,y,z] | 初始位置 |
| `euler` | [rx,ry,rz] | 初始旋转（度） |
| `scale` | [sx,sy,sz] | 缩放因子 |
| `apply_randomization` | 布尔 | 启用位姿随机化 |
| `orientation_mode` | 字符串 | 方向约束 |

### 区域部分

定义物体放置区域：

```yaml
regions:
  - object: bottle
    target: table
    random_type: A_on_B_region_sampler
    random_config:
      pos_range: [[-0.3, -0.35, 0.0], [-0.25, -0.25, 0.0]]
      yaw_rotation: [-10.0, 10.0]
```

### 相机部分

```yaml
cameras:
  - name: head_camera
    translation: [0.1, 0.02, 0.03]
    orientation: [0.6602, 0.2534, -0.2534, -0.6602]
    camera_axes: usd
    parent: "robot/head_link"
    params:
      camera_type: "RealSense"
      camera_params: [647.04, 646.34, 639.1, 364.36]
      resolution_width: 1280
      resolution_height: 720
      pixel_size: 3.0
      f_number: 2.0
      focus_distance: 0.6
    apply_randomization: true
    max_translation_noise: 0.03
    max_orientation_noise: 5.0
```

### 技能部分

```yaml
skills:
  - lift2:
      - left:
          - name: dexpick
            objects: [object_name]
            pick_pose_idx: 0
            pre_grasp_offset: 0.0
            post_grasp_offset: 0.1
          - name: dexplace
            objects: [object_name, target]
            camera_axis_filter:
              - direction: [0, 0, 1]
              - degree: [0, 45]
```

### 数据部分

```yaml
data:
  task_dir: "任务描述"
  language_instruction: "逐个抓取切割器并放入盒子"
  detailed_language_instruction: "抓取并抬起切割器，然后放入盒子"
  collect_info: "l2r1"
  version: "v3.0"
  update: true
  max_episode_length: 4000
```

## 配置目录

```
configs/manip/simbox/
├── basic/
│   ├── lift2/           # Lift2 基础任务
│   ├── split_aloha/     # Split Aloha 基础任务
│   └── franka/          # Franka 基础任务
├── long_horizon/
│   └── lift2/           # 长程任务
├── art/                 # 艺术任务
└── de_plan_with_render_template.yaml  # 模板
```

## 下一步

- [域随机化](/zh/config/dr/) - 随机化设置
- [资产](/zh/config/assets/) - 资产管理