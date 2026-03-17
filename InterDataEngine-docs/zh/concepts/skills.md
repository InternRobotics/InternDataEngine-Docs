---
title: 技能
description: InternDataEngine 中的机器人操作技能
---

# 技能

技能是 InternDataEngine 中机器人操作的基本构建块。每个技能定义机器人可以执行的原子动作，从简单的夹爪操作到复杂的操作序列。

## 快速导航

| 类别 | 描述 |
|------|------|
| [概述](/zh/concepts/skills/overview) | 技能架构和可用技能 |
| [抓取技能](/zh/concepts/skills/pick) | 抓取和提升物体 |
| [放置技能](/zh/concepts/skills/place) | 将物体放置到目标位置 |
| [关节操作技能](/zh/concepts/skills/articulation) | 操作关节物体（门、抽屉） |

## 什么是技能？

一个技能封装了：

- **运动规划**：使用 CuRobo 生成轨迹
- **执行控制**：逐步命令执行
- **状态监控**：成功/失败评估
- **夹爪动作**：打开/关闭操作

## 技能分类

### 操作技能

与环境中的物体交互的技能：

- **抓取 (Pick)**：使用采样的抓取位姿抓取和提升物体
- **放置 (Place)**：将物体放置到目标位置
- **关节操作 (Articulation)**：操作门、抽屉和其他关节物体

### 运动技能

机器人运动的技能：

- `goto_pose` - 移动到目标末端执行器位姿
- `move` - 沿方向进行笛卡尔运动
- `rotate` - 旋转末端执行器

### 工具技能

常用操作的辅助技能：

- `home` - 返回初始配置
- `open` / `close` - 夹爪控制
- `wait` - 暂停执行

## 入门指南

1. 阅读 [技能概述](/zh/concepts/skills/overview) 了解架构
2. 学习 [抓取技能](/zh/concepts/skills/pick) 进行物体抓取
3. 探索 [放置技能](/zh/concepts/skills/place) 进行放置操作
4. 查看 [关节操作技能](/zh/concepts/skills/articulation) 操作门和抽屉

## 相关主题

- [任务](/zh/concepts/tasks/) - 将技能组合成完整工作流
- [控制器](/zh/concepts/controllers/) - 了解运动控制
- [自定义技能](/zh/custom/skill/) - 创建自己的技能