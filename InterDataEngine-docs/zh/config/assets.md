---
title: 资产
description: InternDataEngine 仿真资产管理
---

# 资产

InternDataEngine 中的资产包括 3D 模型（USD 文件）、纹理、环境贴图和机器人配置。

## 资产结构

```
workflows/simbox/assets/
├── pick_and_place/
│   └── pre-train-pick/
│       └── assets/          # 物体 USD 文件
├── long_horizon/
│   └── dex_manip/
│       ├── left/            # 左侧物体
│       ├── right/           # 右侧物体
│       └── box/             # 容器
├── envmap_lib/              # HDR 环境贴图
└── texture_lib/             # 纹理文件
```

## 物体资产

### USD 格式

物体存储为 USD 文件：

```
long_horizon/dex_manip/left/bolt/bolt_0/Aligned_obj.usd
```

### 资产配置

物体在任务配置中引用：

```yaml
objects:
  - name: bolt_left1
    path: long_horizon/dex_manip/left/bolt/bolt_0/Aligned_obj.usd
    target_class: RigidObject
    dataset: oo3d
    category: bottle
    prim_path_child: Aligned
```

## 创建物体资产

### 步骤 1：准备 3D 模型

- 格式：USD 或 OBJ（转换为 USD）
- 确保正确缩放（米）
- 居中于原点
- 对齐预期的抓取方向

### 步骤 2：创建 USD 文件

使用 Isaac Sim 或 USD 工具：

```python
from pxr import Usd, UsdGeom

stage = Usd.Stage.CreateNew("object.usd")
xform = UsdGeom.Xform.Define(stage, "/Object")
mesh = UsdGeom.Mesh.Define(stage, "/Object/mesh")
# 添加几何体...
stage.Save()
```

### 步骤 3：添加到配置

```yaml
objects:
  - name: my_object
    path: path/to/my_object.usd
    target_class: RigidObject
    category: custom
```

## 资产类别

类别在 `constants.py` 中定义：

```python
CATEGORIES = {
    "bottle": {
        "euler_range": [[80, 100], [-10, 10], [-180, 180]],
        "scale_range": [0.9, 1.1],
    },
    "box": {
        "euler_range": [[85, 95], [-5, 5], [-180, 180]],
        "scale_range": [0.95, 1.05],
    },
    # 添加自定义类别...
}
```

## 机器人资产

### 机器人 USD 文件

机器人模型存储为 USD：

```
lift2/robot_invisible.usd    # Lift2 机器人
franka/robot.usd             # Franka 机器人
```

### CuRobo 配置

每个机器人都有运动学配置：

```yaml
# r5a_left_arm.yml
robot_cfg:
  kinematics:
    urdf_path: "path/to/urdf"
    base_link: "base_link"
    ee_link: "ee_link"
```

## 环境贴图

用于光照的 HDR 环境贴图：

```
assets/envmap_lib/
├── indoor_01.hdr
├── indoor_02.hdr
├── outdoor_01.hdr
└── ...
```

### 使用

```yaml
env_map:
  envmap_lib: envmap_lib
  apply_randomization: true
  intensity_range: [1500, 4000]
  rotation_range: [0, 180]
```

## 纹理资产

用于域随机化的纹理：

```
assets/texture_lib/
├── table/
│   ├── wood_01.png
│   ├── wood_02.png
│   └── marble_01.png
├── floor/
│   ├── tile_01.png
│   └── concrete_01.png
└── background/
    └── wall_01.png
```

## 资产软链接

资产可能存储在外部并链接：

```bash
cd workflows/simbox
ln -s /shared/assets/myData-A1_sim_assets assets
```

## 资产管理最佳实践

1. **按类别组织**
   - 将相似物体分组在一起
   - 使用一致的命名

2. **针对仿真优化**
   - 减少多边形数量
   - 使用简化的碰撞网格
   - 应用适当的物理属性

3. **版本控制**
   - 跟踪资产变更
   - 使用有意义的版本标签

4. **文档记录**
   - 记录来源和许可证
   - 注明任何修改

## 关键文件

| 文件 | 用途 |
|------|------|
| `utils/constants.py` | 类别定义 |
| `tasks/banana.py` | 资产加载 |
| `assets/` | 资产存储 |

## 下一步

- [域随机化](/zh/config/dr/) - 随机化资产
- [自定义任务](/zh/custom/task/) - 在任务中使用资产