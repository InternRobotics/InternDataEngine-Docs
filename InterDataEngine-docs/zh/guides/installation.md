---
title: 安装指南
description: 如何安装和配置 InternDataEngine
---

# 安装指南

## 环境要求

安装 InternDataEngine 之前，请确保具备以下条件：

| 依赖项 | 版本要求 | 说明 |
|--------|---------|------|
| NVIDIA Isaac Sim | 4.1.0（推荐） / 4.2.0 / 4.5.0 | 仿真引擎 |
| Python | 3.10+（推荐 3.10 或 3.11） | 运行环境 |
| CUDA | 11.8+ | GPU 加速运动规划 |

## 步骤 1：克隆仓库

```bash
git clone https://github.com/your-org/InternDataEngine.git
cd YOUR_PATH_TO_DATA_ENGINE
```

## 步骤 2：准备 Isaac Sim 环境

InternDataEngine 依赖 NVIDIA Isaac Sim 进行物理仿真，请根据上述版本要求完成安装。推荐使用 **4.1.0** 版本。

## 步骤 3：下载资产

所有资产及依赖包托管在 HuggingFace：[InternDataAssets](https://huggingface.co/datasets/InternRobotics/InternData-A1/tree/main/InternDataAssets)

需要下载以下三部分内容：

```text
InternDataAssets/
├── assets/          # 场景与任务资产
├── curobo/          # CuRobo 运动规划库
└── panda_drake/     # Drake 运动学库
```

### 3.1 场景资产（assets）

> **提示**：全量资产体积较大，建议按需下载。

**必需资产**（所有任务都需要）：

- `background_textures`、`envmap_lib`、`floor_textures`、`table_textures` — Domain Randomization 素材
- `table0`、`table_info.json` — 桌面场景

> 上述 Randomization 素材目录中包含大量文件。如仅做快速测试，可只下载每个目录中的少量样本。

**机器人模型**（按需选择）：

- `lift2`、`franka`、`frankarobotiq`、`split_aloha_mid_360`、`G1_120s`

**任务资产**（按需选择）：

- `basic`、`art`、`long_horizon`、`pick_and_place`

我们提供了一键下载脚本 `scripts/download_assets.sh`，支持按需下载：

```bash
bash scripts/download_assets.sh [OPTIONS]
```

| 参数 | 说明 |
|------|------|
| `--min` | 仅下载必需的场景资产（快速测试） |
| `--full` | 下载全部场景资产，包括所有机器人和任务（默认） |
| `--with-curobo` | 同时下载 CuRobo 包 |
| `--with-drake` | 同时下载 panda_drake 包 |
| `--local-dir DIR` | 指定下载目录（默认当前目录） |

```bash
# 最小资产 + CuRobo + panda_drake
bash scripts/download_assets.sh --min --with-curobo --with-drake

# 全量下载
bash scripts/download_assets.sh --full --with-curobo --with-drake
```

### 3.2 CuRobo

如果已有 CuRobo 安装且不需要通过上述脚本下载，只需将 HuggingFace 上的 [`curobo/src/curobo/content`](https://huggingface.co/datasets/InternRobotics/InternData-A1/tree/main/InternDataAssets/curobo/src/curobo/content) 目录内容合并到本地 `YOUR_CUROBO_PATH/src/curobo/content` 中（包含机器人 URDF 和 CuRobo 配置文件）。

如尚未安装 CuRobo，也可从 [NVlabs/curobo](https://github.com/NVlabs/curobo) 获取源码。

## 步骤 4：创建软链接

```bash
cd YOUR_PATH_TO_DATA_ENGINE/workflows/simbox
ln -s YOUR_PATH_TO_ASSETS assets
ln -s YOUR_PATH_TO_CUROBO curobo
ln -s YOUR_PATH_TO_PANDA_DRAKE panda_drake
```

## 步骤 5：安装 Python 依赖

### 方式 A：使用 Isaac Sim 内置 Python

```bash
cd YOUR_PATH_TO_DATA_ENGINE
YOUR_PATH_TO_ISAACSIM/python.sh -m pip install --upgrade pip
YOUR_PATH_TO_ISAACSIM/python.sh -m pip install -r requirements.txt
```

### 方式 B：使用 Conda 管理环境

```bash
conda create -n banana python=3.10
conda activate banana
source YOUR_PATH_TO_ISAACSIM/setup_conda_env.sh
pip install --upgrade pip
pip install -r requirements.txt
```

> **注意**：两种方式的唯一区别在于后续启动 Python 的命令——方式 A 使用 `YOUR_PATH_TO_ISAACSIM/python.sh`，方式 B 使用 `python`。本文档后续统一以 `YOUR_PATH_TO_ISAACSIM/python.sh` 进行说明。

## 步骤 6：安装 CuRobo

请参考 [CuRobo 安装文档](https://curobo.org/get_started/1_install_instructions.html) 中 **Install for use in Isaac Sim** 部分，然后执行：

```bash
cd YOUR_PATH_TO_DATA_ENGINE/workflows/simbox/curobo
YOUR_PATH_TO_ISAACSIM/python.sh -m pip install -e .[isaacsim] --no-build-isolation
```

## 故障排除

### 找不到 Isaac Sim

确保正确设置了 `ISAAC_SIM_PATH` 环境变量：

```bash
export ISAAC_SIM_PATH=/path/to/isaac-sim
```

### CUDA 内存不足

在配置中减少批处理大小，或使用更大显存的 GPU。CuRobo 运动规划受益于更大的 GPU 显存。

### 导入错误

确保所有软链接正确设置：

```bash
ls -la workflows/simbox/assets
ls -la workflows/simbox/curobo
ls -la workflows/simbox/panda_drake
```
