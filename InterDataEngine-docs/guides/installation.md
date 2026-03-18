---
title: Installation
description: How to install and configure InternDataEngine
---

# Installation

This guide walks you through setting up InternDataEngine, including cloning the repository, preparing Isaac Sim, downloading assets, and installing dependencies. Follow the steps below to get your simulation environment ready for data generation.

## Prerequisites

Before installing InternDataEngine, ensure the following requirements are met:

| Dependency | Version | Description |
|------------|---------|-------------|
| NVIDIA Isaac Sim | 4.1.0 (recommended) / 4.2.0 / 4.5.0 | Simulation engine |
| Python | 3.10+ (recommended 3.10 or 3.11) | Runtime |
| CUDA | 11.8+ | GPU-accelerated motion planning |

## Step 1: Clone the Repository

```bash
git clone https://github.com/InternRobotics/InternDataEngine.git
cd InternDataEngine
```

## Step 2: Prepare Isaac Sim

InternDataEngine relies on NVIDIA Isaac Sim for physics simulation. Please install it according to the version requirements above. Version **4.1.0** is recommended.

## Step 3: Download Assets

All assets and dependency packages are hosted on HuggingFace: [InternDataAssets](https://huggingface.co/datasets/InternRobotics/InternData-A1/tree/main/InternDataAssets)

Three components need to be downloaded:

```text
InternDataAssets/
├── assets/          # Scene and task assets
├── curobo/          # CuRobo motion planning library
└── panda_drake/     # Drake kinematics library
```

### 3.1 Scene Assets
**Required assets** (needed for all tasks):

- `background_textures`, `envmap_lib`, `floor_textures`, `table_textures` — Domain Randomization materials
- `table0`, `table_info.json` — Table scene

> The Randomization material directories contain many files. For quick testing, you can download just a few samples from each directory.

**Robot models** (choose as needed):

- `lift2`, `franka`, `frankarobotiq`, `split_aloha_mid_360`, `G1_120s`

**Task assets** (choose as needed):

- `basic`, `art`, `long_horizon`, `pick_and_place`

We provide a download script at `scripts/download_assets.sh` for selective downloading:

```bash
bash scripts/download_assets.sh [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--min` | Download only required scene assets (for quick testing) |
| `--full` | Download all scene assets including all robots and tasks (default) |
| `--with-curobo` | Also download the CuRobo package |
| `--with-drake` | Also download the panda_drake package |
| `--local-dir DIR` | Specify download directory (default: current directory) |

```bash
# Minimum assets + CuRobo + panda_drake
bash scripts/download_assets.sh --min --with-curobo --with-drake

# Full download (~200GB)
bash scripts/download_assets.sh --full --with-curobo --with-drake
```

<div class="custom-tip">
<p class="custom-tip-title">Hint</p>
<p class="custom-tip-content">The full asset collection is large, so download selectively based on your needs. Because the background, floor, and table textures contain many images for domain randomization, if your download speed is slow or disk space is limited, you can download only a small subset (e.g., 10+ images per directory) for debugging.</p>
</div>

### 3.2 CuRobo

If you already have CuRobo installed and don't need to download it via the script above, simply merge the contents of [`curobo/src/curobo/content`](https://huggingface.co/datasets/InternRobotics/InternData-A1/tree/main/InternDataAssets/curobo/src/curobo/content) from HuggingFace into your local `YOUR_CUROBO_PATH/src/curobo/content` (contains robot URDFs and CuRobo configuration files).

If CuRobo is not yet installed, you can also get the source from [NVlabs/curobo]
(https://github.com/NVlabs/curobo).

## Step 4: Create Symlinks

```bash
cd InternDataEngine/workflows/simbox
ln -s YOUR_PATH_TO_ASSETS assets
ln -s YOUR_PATH_TO_CUROBO curobo
ln -s YOUR_PATH_TO_PANDA_DRAKE panda_drake
```

## Step 5: Install Python Dependencies

### Option A: Using Isaac Sim's Built-in Python

```bash
cd InternDataEngine
YOUR_PATH_TO_ISAACSIM/python.sh -m pip install --upgrade pip
YOUR_PATH_TO_ISAACSIM/python.sh -m pip install -r requirements.txt
```

### Option B: Using Conda

```bash
conda create -n banana python=3.10
conda activate banana
source YOUR_PATH_TO_ISAACSIM/setup_conda_env.sh
cd InternDataEngine
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note**: The only difference between the two options is the Python launch command — Option A uses `YOUR_PATH_TO_ISAACSIM/python.sh`, while Option B uses `python`. This documentation uses `YOUR_PATH_TO_ISAACSIM/python.sh` throughout for consistency.

## Step 6: Install CuRobo

Refer to the [CuRobo installation docs](https://curobo.org/get_started/1_install_instructions.html), specifically the **Install for use in Isaac Sim** section, then run:

```bash
cd InternDataEngine/workflows/simbox/curobo
YOUR_PATH_TO_ISAACSIM/python.sh -m pip install -e .[isaacsim] --no-build-isolation
```

## Troubleshooting

### Isaac Sim Not Found

Ensure the `ISAAC_SIM_PATH` environment variable is set correctly:

```bash
export ISAAC_SIM_PATH=/path/to/isaac-sim
```

### CUDA Out of Memory

Reduce the batch size in the configuration, or use a GPU with more VRAM. CuRobo motion planning benefits from larger GPU memory.

### Import Errors

Ensure all symlinks are set up correctly:

```bash
ls -la workflows/simbox/assets
ls -la workflows/simbox/curobo
ls -la workflows/simbox/panda_drake
```
