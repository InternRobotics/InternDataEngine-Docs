---
title: 快速开始
description: 运行你的第一个 InternDataEngine 仿真任务
---

# 快速开始

本指南将帮助你从零运行第一个 InternDataEngine 数据生成任务，并理解执行配置的核心概念。

## 运行第一个任务

最快的启动方式：

```bash
/isaac-sim/python.sh launcher.py \
  --config configs/simbox/de_plan_with_render_template.yaml
```

也可以通过封装脚本启动（效果相同，参数更简洁）：

```bash
bash scripts/simbox/simbox_plan_with_render.sh <任务配置路径> [生成数量] [随机种子]

# 示例
bash scripts/simbox/simbox_plan_with_render.sh \
  workflows/simbox/core/configs/tasks/basic/split_aloha/track_the_targets/track_the_targets.yaml 10
```

> 更多用法请参考脚本文件中的说明。

### 命令行参数

| 参数 | 说明 |
|------|------|
| `--config` | **必需**。执行配置文件路径 |
| `--random_seed` | 可选。固定随机种子，用于复现 |
| `--debug` | 可选。调试模式，异常时立即抛出 |

此外，配置文件中的任意字段均可通过命令行以点分路径覆盖，例如：

```bash
--load_stage.layout_random_generator.args.random_num=500
--load_stage.scene_loader.args.simulator.headless=false
```

效果等价与直接更改配置文件。

## 执行模式

引擎提供多种执行模式，通过切换 `--config` 指定的配置文件即可选择：

| 配置文件 | 模式 | 说明 |
|---------|------|------|
| `de_plan_with_render_template.yaml` | Plan + Render 同步执行 | 最简单，适合调试；流体任务仅适用此模式 |
| `de_pipe_template.yaml` | Plan / Render 流水并行 | 性能最优（依赖内存），适合大规模数据生产 |
| `de_plan_and_render_template.yaml` | Plan 和 Render 串行执行 | 用于 Pipe 模式的串行调试 |
| `de_plan_template.yaml` | 仅执行规划 | 只生成轨迹，不渲染 |
| `de_render_template.yaml` | 仅执行渲染 | 对已有轨迹渲染图像，可多次渲染不同背景/材质 |

**推荐**：调试阶段使用 `de_plan_with_render_template.yaml` 和 `de_plan_and_render_template.yaml`，生产阶段使用 `de_pipe_template.yaml`，考虑到 Isaac Sim 多进程互相影响的问题，建议在容器环境下使用，可在集群环境中启动多个单卡容器执行该脚本。

```bash
# 调试模式
/isaac-sim/python.sh launcher.py --config configs/simbox/de_plan_with_render_template.yaml

# 生产模式
/isaac-sim/python.sh launcher.py --config configs/simbox/de_pipe_template.yaml
```

## 理解配置

引擎有两类配置文件：

- **执行配置**（`configs/simbox/de_*.yaml`）：定义数据管线的执行方式与阶段编排
- **任务配置**（`workflows/simbox/core/configs/tasks/...`）：定义具体任务的机器人、物体、技能等

### 执行配置详解

数据管线分为四个阶段：**Load**（加载） -> **Plan**（规划） -> **Render**（渲染） -> **Store**（存储）。

以 `de_plan_and_render_template.yaml` 为例：

```yaml
load_stage:
  scene_loader:                          # 场景加载器
    type: env_loader
    args:
      workflow_type: SimBoxDualWorkFlow
      cfg_path: workflows/simbox/core/configs/tasks/...  # 任务配置路径
      simulator:
        physics_dt: 1/30                 # 物理更新频率
        rendering_dt: 1/30              # 渲染更新频率
        headless: True                   # 无头模式（关闭 GUI）
        anti_aliasing: 0                 # 抗锯齿级别
  layout_random_generator:               # 场景随机化
    type: env_randomizer
    args:
      random_num: 5                      # 随机采样次数
      strict_mode: true                  # true: 生成数量必须等于 random_num

plan_stage:
  seq_planner:
    type: env_planner                    # 轨迹规划器

render_stage:
  renderer:
    type: env_renderer                   # 渲染器

store_stage:
  writer:
    type: env_writer
    args:
      batch_async: true                  # 异步写入（提升性能，增加内存压力）
      output_dir: output/${name}/        # 输出目录
```

### 任务配置

任务配置定义了一次数据生成任务的完整场景：

| 配置项 | 说明 |
|--------|------|
| 机器人（robots） | 使用的机器人型号与参数 |
| 物体（objects） | 场景中的交互物体 |
| 相机（camera） | 视角与图像采集配置 |
| 技能（skills） | 要执行的操作技能序列 |
| 区域（arena） | 物体的放置区域与场景布局 |

## 示例任务

### 抓取放置

```bash
/isaac-sim/python.sh launcher.py \
  --config configs/simbox/de_plan_with_render_template.yaml \
  --load_stage.scene_loader.args.cfg_path=workflows/simbox/core/configs/tasks/basic/lift2/insert_the_markpen_in_penholder/left/insert_the_markpen_in_penholder_part0.yaml
```

### 倾倒任务

```bash
/isaac-sim/python.sh launcher.py \
  --config configs/simbox/de_plan_with_render_template.yaml \
  --load_stage.scene_loader.args.cfg_path=workflows/simbox/core/configs/tasks/basic/lift2/pour_redwine_left.yaml
```

### 长程任务

```bash
/isaac-sim/python.sh launcher.py \
  --config configs/simbox/de_plan_with_render_template.yaml \
  --load_stage.scene_loader.args.cfg_path=workflows/simbox/core/configs/tasks/long_horizon/lift2/dexpnp/sort_parts_0.yaml
```

## 输出结构

输出保存在执行配置 `store_stage.writer.args.output_dir` 指定的路径下：

```text
output_dir/
├── <任务类型>/
│   └── <机器人>/
│       └── <任务名称>/
│           └── <手臂>/
│               ├── <时间戳1>/
│               │   ├── images.rgb.head/
│               │   ├── images.rgb.hand_right/
│               │   ├── images.rgb.hand_left/
│               │   └── lmdb/
│               └── <时间戳2>/
│                   └── ...
├── de_config.yaml                  # 本次执行的配置副本
├── de_time_profile_*.log           # 执行耗时统计
├── de_p*_w*_time_profile*.log      # (Pipe 模式) 各进程耗时
└── de_supervisor_p*_w*.log         # (Pipe 模式) 进程监控日志
```

## 调试技巧

### 开启可视化

关闭无头模式以显示仿真 GUI：

```bash
--load_stage.scene_loader.args.simulator.headless=false
```

### 常见问题

| 问题 | 排查方向 |
|------|---------|
| 场景设置错误 | 检查 `workflows/simbox/core/tasks/banana.py` 中的 `set_up_scene()` |
| 重置异常 | 检查 `workflows/simbox_dual_workflow.py` 中的 `reset()` |
| 运动规划失败 | 检查任务 YAML 中的机器人配置、物体碰撞设置、`ignore_substring` 列表 |
| UnicodeDecodeError | 设置 `export PYTHONUTF8=1` |
