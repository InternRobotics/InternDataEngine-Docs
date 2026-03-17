---
title: Quick Start
description: Run your first InternDataEngine simulation task
---

# Quick Start

This guide walks you through running your first InternDataEngine data generation task and understanding the core configuration concepts.

## Running Your First Task

The quickest way to start:

```bash
/isaac-sim/python.sh launcher.py \
  --config configs/simbox/de_plan_with_render_template.yaml
```

You can also use the wrapper script (same effect, simpler arguments):

```bash
bash scripts/simbox/simbox_plan_with_render.sh <task_config_path> [num_samples] [random_seed]

# Example
bash scripts/simbox/simbox_plan_with_render.sh \
  workflows/simbox/core/configs/tasks/basic/split_aloha/track_the_targets/track_the_targets.yaml 10
```

> See the script file for more usage details.

### Command Line Arguments

| Argument | Description |
|----------|-------------|
| `--config` | **Required**. Path to the execution config file |
| `--random_seed` | Optional. Fix random seed for reproducibility |
| `--debug` | Optional. Debug mode — exceptions are raised immediately |

Any field in the config file can be overridden via the command line using dot-separated paths:

```bash
--load_stage.layout_random_generator.args.random_num=500
--load_stage.scene_loader.args.simulator.headless=false
```

This is equivalent to modifying the config file directly.

## Execution Modes

The engine provides multiple execution modes. Switch between them by changing the config file passed to `--config`:

| Config File | Mode | Description |
|-------------|------|-------------|
| `de_plan_with_render_template.yaml` | Plan + Render simultaneous | Simplest; good for debugging. Required for fluid tasks |
| `de_pipe_template.yaml` | Plan / Render pipelined | Best performance (memory-dependent); ideal for large-scale production |
| `de_plan_and_render_template.yaml` | Plan and Render sequential | For serial debugging of the Pipe mode |
| `de_plan_template.yaml` | Planning only | Generate trajectories without rendering |
| `de_render_template.yaml` | Rendering only | Render images from existing trajectories; re-render with different backgrounds/materials |

**Recommended**: Use `de_plan_with_render_template.yaml` or `de_plan_and_render_template.yaml` during development, and `de_pipe_template.yaml` for production. Due to potential interference between Isaac Sim multi-process instances, it is recommended to run in containerized environments — e.g., launch multiple single-GPU containers on a cluster to execute the pipeline script.

```bash
# Debug mode
/isaac-sim/python.sh launcher.py --config configs/simbox/de_plan_with_render_template.yaml

# Production mode
/isaac-sim/python.sh launcher.py --config configs/simbox/de_pipe_template.yaml
```

## Understanding the Configuration

The engine uses two types of config files:

- **Execution configs** (`configs/simbox/de_*.yaml`): Define the pipeline execution mode and stage orchestration
- **Task configs** (`workflows/simbox/core/configs/tasks/...`): Define the specific task — robots, objects, skills, etc.

### Execution Config Details

The data pipeline consists of four stages: **Load** -> **Plan** -> **Render** -> **Store**.

Using `de_plan_and_render_template.yaml` as an example:

```yaml
load_stage:
  scene_loader:                          # Scene loader
    type: env_loader
    args:
      workflow_type: SimBoxDualWorkFlow
      cfg_path: workflows/simbox/core/configs/tasks/...  # Task config path
      simulator:
        physics_dt: 1/30                 # Physics update rate
        rendering_dt: 1/30              # Render update rate
        headless: True                   # Headless mode (no GUI)
        anti_aliasing: 0                 # Anti-aliasing level
  layout_random_generator:               # Scene randomization
    type: env_randomizer
    args:
      random_num: 5                      # Number of random samples
      strict_mode: true                  # true: output count must equal random_num

plan_stage:
  seq_planner:
    type: env_planner                    # Trajectory planner

render_stage:
  renderer:
    type: env_renderer                   # Renderer

store_stage:
  writer:
    type: env_writer
    args:
      batch_async: true                  # Async writes (better perf, more memory)
      output_dir: output/${name}/        # Output directory
```

### Task Config

A task config defines the complete scene for a data generation run:

| Field | Description |
|-------|-------------|
| robots | Robot model and parameters |
| objects | Interactive objects in the scene |
| camera | Viewpoint and image capture settings |
| skills | Manipulation skill sequence to execute |
| arena | Object placement regions and scene layout |

## Example Tasks

### Pick and Place

```bash
/isaac-sim/python.sh launcher.py \
  --config configs/simbox/de_plan_with_render_template.yaml \
  --load_stage.scene_loader.args.cfg_path=workflows/simbox/core/configs/tasks/basic/lift2/insert_the_markpen_in_penholder/left/insert_the_markpen_in_penholder_part0.yaml
```

### Pouring Task

```bash
/isaac-sim/python.sh launcher.py \
  --config configs/simbox/de_plan_with_render_template.yaml \
  --load_stage.scene_loader.args.cfg_path=workflows/simbox/core/configs/tasks/basic/lift2/pour_redwine_left.yaml
```

### Long-Horizon Task

```bash
/isaac-sim/python.sh launcher.py \
  --config configs/simbox/de_plan_with_render_template.yaml \
  --load_stage.scene_loader.args.cfg_path=workflows/simbox/core/configs/tasks/long_horizon/lift2/dexpnp/sort_parts_0.yaml
```

## Output Structure

Output is saved to the path specified in `store_stage.writer.args.output_dir`:

```text
output_dir/
├── <task_type>/
│   └── <robot>/
│       └── <task_name>/
│           └── <arm>/
│               ├── <timestamp1>/
│               │   ├── images.rgb.head/
│               │   ├── images.rgb.hand_right/
│               │   ├── images.rgb.hand_left/
│               │   └── lmdb/
│               └── <timestamp2>/
│                   └── ...
├── de_config.yaml                  # Copy of the execution config
├── de_time_profile_*.log           # Execution time statistics
├── de_p*_w*_time_profile*.log      # (Pipe mode) Per-process timing
└── de_supervisor_p*_w*.log         # (Pipe mode) Process monitor logs
```

## Debugging Tips

### Enable Visualization

Disable headless mode to show the simulation GUI:

```bash
--load_stage.scene_loader.args.simulator.headless=false
```

### Common Issues

| Issue | Troubleshooting |
|-------|-----------------|
| Scene setup errors | Check `set_up_scene()` in `workflows/simbox/core/tasks/banana.py` |
| Reset failures | Check `reset()` in `workflows/simbox_dual_workflow.py` |
| Motion planning failures | Check robot config in task YAML, object collision settings, `ignore_substring` list |
| UnicodeDecodeError | Set `export PYTHONUTF8=1` |

