---
title: 任务
description: InternDataEngine 中的仿真任务定义
---

# 任务

任务定义仿真环境，包括机器人、物体、相机和域随机化设置。主要任务实现是 `BananaBaseTask`。

## 任务架构

```
BananaBaseTask
├── 场景设置
│   ├── 机器人
│   ├── 物体
│   ├── 相机
│   └── 区域
├── 域随机化
│   ├── 环境贴图
│   ├── 纹理
│   ├── 相机位姿
│   └── 物体放置
└── 数据收集
    ├── RGB 图像
    ├── 深度图
    └── 位姿
```

## 任务配置

任务通过 `configs/manip/simbox/` 下的 YAML 文件定义：

```yaml
tasks:
  - name: banana_base_task
    asset_root: workflows/simbox/assets
    task: BananaBaseTask
    task_id: 0
    
    robots:
      - name: "lift2"
        target_class: Lift2
        path: "lift2/robot.usd"
    
    objects:
      - name: bottle
        path: objects/bottle.usd
        target_class: RigidObject
    
    cameras:
      - name: head_camera
        translation: [0.5, 0.0, 1.0]
        orientation: [1, 0, 0, 0]
    
    regions:
      - object: bottle
        target: table
        random_type: A_on_B_region_sampler
    
    skills:
      - lift2:
          - left:
              - name: pick
                objects: [bottle]
```

## 任务类别

### 基础任务 (`basic/`)

简单操作任务：

| 任务类型 | 示例 |
|----------|------|
| 抓取放置 | 插入物体、堆叠物品 |
| 倾倒 | 将液体倒入容器 |
| 追踪 | 追踪移动目标 |

### 长程任务 (`long_horizon/`)

多步骤操作序列：

| 任务类型 | 示例 |
|----------|------|
| 分类零件 | 将多个物体分类到盒子中 |
| 翻转包裹 | 翻转和操作包裹 |
| 交接 | 在手臂之间传递物体 |
| 装配 | 多步骤装配任务 |

### 艺术任务 (`art/`)

创意任务：

| 任务类型 | 示例 |
|----------|------|
| 绘制 | 绘制形状和图案 |
| 书写 | 用笔书写文字 |
| 绘画 | 在画布上绘画 |

## 关键任务组件

### 机器人

定义使用的机器人：

```yaml
robots:
  - name: "lift2"
    target_class: Lift2
    path: "lift2/robot_invisible.usd"
    camera_mount: "lift2/lift2/fl/camera"
    euler: [0.0, 0.0, 90.0]
    robot_file:
      - workflows/simbox/curobo/.../r5a_left_arm.yml
      - workflows/simbox/curobo/.../r5a_right_arm.yml
    ignore_substring: ["table", "bolt"]
```

### 物体

定义场景中的物体：

```yaml
objects:
  - name: bolt_left1
    path: long_horizon/dex_manip/left/bolt/bolt_0/Aligned_obj.usd
    target_class: RigidObject
    dataset: oo3d
    category: bottle
    translation: [0.0, 0.0, 0.0]
    euler: [90.0, 0.0, 0.0]
    scale: [1, 1, 1]
    apply_randomization: true
```

### 相机

定义相机配置：

```yaml
cameras:
  - name: lift2_head
    translation: [0.1, 0.02, 0.03]
    orientation: [0.6602, 0.2534, -0.2534, -0.6602]
    parent: "lift2/lift2/lift2/h_link6"
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

### 区域

定义物体放置区域：

```yaml
regions:
  - object: bolt_left1
    target: table
    random_type: A_on_B_region_sampler
    random_config:
      pos_range: [[-0.3, -0.35, 0.0], [-0.25, -0.25, 0.0]]
      yaw_rotation: [-10.0, 10.0]
```

### 域随机化

启用随机化以生成多样化数据：

```yaml
env_map:
  envmap_lib: envmap_lib
  apply_randomization: true
  intensity_range: [1500, 4000]
  rotation_range: [0, 180]
```

## BananaBaseTask

主要任务类（`banana.py`）处理：

- **场景设置**：`set_up_scene()` - 加载机器人、物体、相机
- **随机化**：`set_envmap()`、`set_fixture_textures()`、`set_camera_poses()`
- **物体加载**：`_load_obj()` - 加载 USD 资产
- **数据收集**：收集 RGB、深度、位姿

### 核心方法

| 方法 | 用途 |
|------|------|
| `set_up_scene()` | 用机器人、物体、相机初始化场景 |
| `reset()` | 为新回合重置场景 |
| `set_envmap()` | 应用随机环境贴图 |
| `set_fixture_textures()` | 应用随机纹理 |
| `set_camera_poses()` | 随机化相机位置 |
| `get_observations()` | 收集传感器数据 |

## 数据输出

任务数据保存到：

```
data_debug/simbox_plan_with_render/
└── <机器人>/
    └── <任务>/
        └── <手臂>/
            └── <时间戳>/
                ├── images.rgb.head/
                │   └── *.png
                ├── images.rgb.wrist/
                ├── depth/
                └── poses/
```

## 下一步

- [相机](/zh/concepts/cameras/) - 相机配置
- [域随机化](/zh/config/dr/) - 随机化设置
- [自定义任务](/zh/custom/task/) - 创建自定义任务