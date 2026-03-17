---
title: 相机
description: InternDataEngine 中的相机配置
---

# 相机

相机从仿真中捕获视觉数据。InternDataEngine 使用统一的 `CustomCamera` 类，可通过 YAML 完全配置。

## 相机架构

```
CustomCamera
├── 位姿配置
│   ├── 平移
│   └── 方向
├── 内参
│   ├── 焦距
│   ├── 主点
│   └── 分辨率
├── 镜头设置
│   ├── 光圈值
│   ├── 对焦距离
│   └── 孔径
└── 输出
    ├── RGB 图像
    └── 相机位姿
```

## 相机配置

完整的相机配置示例：

```yaml
cameras:
  - name: head_camera                    # 唯一相机名称
    translation: [0.5, 0.0, 1.0]         # 位置 [x, y, z]（米）
    orientation: [1, 0, 0, 0]            # 四元数 [w, x, y, z]
    camera_axes: usd                     # 坐标系
    parent: ""                           # 父节点路径（空 = 世界）
    apply_randomization: true            # 启用位姿随机化
    max_translation_noise: 0.02          # 最大位置噪声（米）
    max_orientation_noise: 2.5           # 最大旋转噪声（度）
    params:
      camera_type: "RealSense"           # 相机型号类型
      camera_params: [647.04, 646.34, 639.1, 364.36]  # [fx, fy, cx, cy]
      resolution_width: 1280             # 图像宽度（像素）
      resolution_height: 720             # 图像高度（像素）
      pixel_size: 3.0                    # 物理像素尺寸（μm）
      f_number: 2.0                      # 镜头光圈 f 值
      focus_distance: 0.6                # 对焦距离（米）
      frequency: 30                      # 采集频率（Hz）
```

## 相机参数说明

### 内参矩阵

相机内参矩阵 K：

```
K = | fx  0  cx |
    |  0 fy  cy |
    |  0  0   1 |

fx, fy = 焦距（像素）
cx, cy = 主点（像素）
```

### 传感器设置

| 参数 | 描述 | 典型值 |
|------|------|--------|
| `resolution_width` | 图像宽度（像素） | 640 - 1920 |
| `resolution_height` | 图像高度（像素） | 480 - 1080 |
| `pixel_size` | 物理像素尺寸（μm） | 1.4 - 3.0 |
| `f_number` | 镜头光圈 | 1.8 - 4.0 |
| `focus_distance` | 对焦距离（m） | 0.3 - 1.0 |
| `frequency` | 采集频率（Hz） | 15 - 60 |

## 相机安装

### 机器人安装

附加到机器人连杆：

```yaml
parent: "lift2/lift2/lift2/fl/link6"  # 末端执行器连杆
translation: [0.07, 0.01, 0.08]       # 相对连杆的偏移
```

### 世界固定

固定在世界坐标系：

```yaml
parent: ""
translation: [0.5, 0.5, 1.2]
orientation: [0.707, 0.707, 0, 0]  # 向下看
```

## 域随机化

使用定义在 `workflows/simbox/core/tasks/banana.py` 中的 `_perturb_camera()` 方法启用相机位姿随机化：

```yaml
cameras:
  - name: head_camera
    apply_randomization: true
    max_translation_noise: 0.03   # ±3 厘米
    max_orientation_noise: 5.0    # ±5 度
```

## 相机输出

`CustomCamera.get_observations()` 返回：

| 输出 | 形状 | 描述 |
|------|------|------|
| `color_image` | H×W×3 | RGB 图像（float32） |
| `camera2env_pose` | 4×4 | 相机到环境变换 |
| `camera_params` | 3×3 | 内参矩阵 K |

## 关键文件

| 文件 | 用途 |
|------|------|
| `cameras/custom_camera.py` | CustomCamera 实现 |
| `cameras/__init__.py` | 相机注册 |

## 参考资料

- [Isaac Sim Camera Sensors 文档](https://docs.isaacsim.omniverse.nvidia.com/4.5.0/sensors/isaacsim_sensors_camera.html)
- [Intel RealSense D415 产品简介](https://simplecore.intel.com/realsensehub/wp-content/uploads/sites/63/D415_Series_ProductBrief_010718.pdf)
- [Intel RealSense D435 产品简介](https://simplecore.intel.com/realsensehub/wp-content/uploads/sites/63/D435_Series_ProductBrief_010718.pdf)
- [相机坐标系参考](https://www.researchgate.net/figure/Axes-of-the-camera-frame-on-the-camera-CCD-and-lens_fig3_225025509)