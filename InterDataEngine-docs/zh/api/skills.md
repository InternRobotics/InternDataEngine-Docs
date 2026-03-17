---
title: 技能 API
description: 技能模块 API 参考
---

# 技能 API 参考

本文档提供技能模块的 API 文档。

## BaseSkill

所有操作技能的基类。

### 构造函数

```python
BaseSkill(cfg, task, controller, **kwargs)
```

**参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `cfg` | DictConfig | 技能配置 |
| `task` | BananaBaseTask | 任务实例 |
| `controller` | TemplateController | 控制器实例 |

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `skill_cfg` | dict | 技能特定配置 |
| `task` | BananaBaseTask | 任务引用 |
| `controller` | TemplateController | 控制器引用 |

### 方法

#### `run() -> bool`

执行技能。**必须由子类实现。**

---

## 操作技能

### Dexpick

Dex 风格抓取技能。

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `objects` | List[str] | 必需 | 要抓取的物体 |
| `pick_pose_idx` | int | 0 | 抓取位姿组索引 |
| `pre_grasp_offset` | float | 0.0 | 预抓取接近偏移 |
| `post_grasp_offset` | float | 0.1 | 抓取后抬起偏移 |

### Dexplace

Dex 风格放置技能。

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `objects` | List[str] | 必需 | [物体, 目标] |
| `camera_axis_filter` | dict | None | 相机约束 |

### Pick / Place

标准抓取和放置技能。

---

## 工具技能

### Home

返回初始配置。

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `mode` | str | "default" | 初始配置模式 |

### Open / Close

夹爪控制。

- `Open`: 打开夹爪（状态 = 1.0）
- `Close`: 关闭夹爪（状态 = -1.0）

### Wait

等待技能。

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `duration` | float | 1.0 | 等待时长（秒）|