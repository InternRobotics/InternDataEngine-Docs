---
title: Custom Task
description: How to create a new task by combining custom components
---

# Creating a Custom Task

This guide explains how to create a new task by combining your custom assets, robots, controllers, and skills into a complete task configuration.

## Overview

After creating custom components (assets, robots, controllers, skills), you can combine them into a task YAML configuration. The workflow will load this configuration to set up the simulation environment.

## Prerequisites

Before creating a custom task, ensure you have:

1. **Custom Assets** - See [Assets Guide](/custom/assets.md)
2. **Custom Robot** - See [Robot Guide](/custom/robot.md)
3. **Custom Controller** - See [Controller Guide](/custom/controller.md)
4. **Custom Skill** - See [Skill Guide](/custom/skill.md)

## Prepare Asset Directory

Organize your task assets following the structure:

```
new_task/
└── new_objs/                          # Rigid objects directory
    ├── new_obj0/                      # Object instance 0
    │   ├── Aligned_obj.obj            # Preprocessed mesh
    │   ├── Aligned.mtl                # Material file
    │   ├── Aligned_obj.usd            # USD with physics properties
    │   ├── Aligned_grasp_sparse.npy   # Grasp poses (optional)
    │   └── textures/                  # Texture files
    ├── new_obj1/                      # Object instance 1
    └── new_obj2/                      # Object instance 2
```

Place this directory under your asset root (e.g., `workflows/simbox/assets/` or `workflows/simbox/example_assets/`).

<div class="custom-important">
<p class="custom-important-title">Note</p>
<p class="custom-important-content">For rigid manipulation objects, objects of the <strong>same category</strong> should be placed in the <strong>same parent folder</strong> (e.g., <code>new_obj0</code>, <code>new_obj1</code>, <code>new_obj2</code> all under <code>new_objs/</code>). This organization enables <strong>category-level domain randomization</strong>. Inside each object subfolder, use consistent naming conventions: <code>Aligned_obj.obj</code>, <code>Aligned_obj.usd</code>, <code>Aligned_grasp_sparse.npy</code>, etc.</p>
</div>

## Create Task YAML Configuration

Create a new YAML file in `workflows/simbox/core/configs/tasks/`:

```yaml
# =============================================================================
# New Task Configuration
# =============================================================================
tasks:
  - name: new_task
    asset_root: workflows/simbox/assets
    task: BananaBaseTask
    task_id: 0
    offset: null
    render: True

    # =========================================================================
    # Arena Configuration
    # =========================================================================
    arena_file: workflows/simbox/core/configs/arenas/example.yaml

    # =========================================================================
    # Environment Map (Lighting)
    # =========================================================================
    env_map:
      envmap_lib: envmap_lib
      apply_randomization: False
      intensity_range: [4000, 7000]
      rotation_range: [0, 180]

    # =========================================================================
    # Robots
    # =========================================================================
    robots:
      - name: "new_robot"
        robot_config_file: workflows/simbox/core/configs/robots/new_robot.yaml
        euler: [0.0, 0.0, 0.0]
        ignore_substring: ["material", "table", "floor"]

    # =========================================================================
    # Objects
    # =========================================================================
    objects:
      - name: obj0
        path: new_task/new_objs/new_obj0/Aligned_obj.usd
        target_class: RigidObject
        dataset: custom
        category: new_object
        prim_path_child: Aligned
        translation: [0.3, 0.0, 0.0]
        euler: [0.0, 0.0, 0.0]
        scale: [1, 1, 1]
        apply_randomization: False

      - name: obj1
        path: new_task/new_objs/new_obj1/Aligned_obj.usd
        target_class: RigidObject
        dataset: custom
        category: new_object
        prim_path_child: Aligned
        translation: [0.0, 0.2, 0.0]
        euler: [0.0, 0.0, 0.0]
        scale: [1, 1, 1]
        apply_randomization: False

      - name: obj2
        path: new_task/new_objs/new_obj2/Aligned_obj.usd
        target_class: RigidObject
        dataset: custom
        category: new_object
        prim_path_child: Aligned
        translation: [0.0, -0.2, 0.0]
        euler: [0.0, 0.0, 0.0]
        scale: [1, 1, 1]
        apply_randomization: False

    # =========================================================================
    # Regions (Object Placement)
    # =========================================================================
    regions:
      - object: obj0
        target: table
        random_type: A_on_B_region_sampler
        random_config:
          pos_range: [[0.2, -0.15, 0.0], [0.4, 0.15, 0.0]]
          yaw_rotation: [-30.0, 30.0]

      - object: obj1
        target: table
        random_type: A_on_B_region_sampler
        random_config:
          pos_range: [[-0.4, -0.15, 0.0], [-0.2, 0.15, 0.0]]
          yaw_rotation: [-180.0, 180.0]

      - object: obj2
        target: table
        random_type: A_on_B_region_sampler
        random_config:
          pos_range: [[-0.4, -0.15, 0.0], [-0.2, 0.15, 0.0]]
          yaw_rotation: [-180.0, 180.0]

    # =========================================================================
    # Cameras
    # =========================================================================
    cameras:
      - name: head_camera
        translation: [0.5, 0.0, 0.8]
        orientation: [0.924, 0.383, 0.0, 0.0]
        camera_axes: usd
        camera_file: workflows/simbox/core/configs/cameras/realsense_d455.yaml
        parent: ""
        apply_randomization: False

      - name: wrist_camera_left
        translation: [0.0, 0.05, 0.03]
        orientation: [0.0, 0.0, 0.0, 1.0]
        camera_axes: usd
        camera_file: workflows/simbox/core/configs/cameras/realsense_d435.yaml
        parent: "new_robot/path/to/fl_ee_link"
        apply_randomization: False

      - name: wrist_camera_right
        translation: [0.0, -0.05, 0.03]
        orientation: [0.0, 0.0, 0.0, 1.0]
        camera_axes: usd
        camera_file: workflows/simbox/core/configs/cameras/realsense_d435.yaml
        parent: "new_robot/path/to/fr_ee_link"
        apply_randomization: False

    # =========================================================================
    # Data Settings
    # =========================================================================
    data:
      task_dir: "new_task_demo"
      language_instruction: "New task."
      detailed_language_instruction: "New task."
      collect_info: "Custom task with new robot and skill"
      version: "v1.0"
      update: True
      max_episode_length: 500

    # =========================================================================
    # Skills
    # =========================================================================
    # Dual-arm mode: left arm operates obj0, right arm operates obj1 and obj2
    skills:
      - new_robot:
          - left:
              - name: skill0
                objects: [obj0]
          - right:
              - name: skill1
                objects: [obj1, obj2]
```

## Task Modes

The task configuration supports multiple execution modes. Here are common patterns:

### Single-Arm Task

For single-arm robots, configure only one arm in the skills section. Skills execute sequentially — each skill starts only after the previous one completes. The task finishes when all skills are done.

**Left Arm Example:**
```yaml
skills:
  - new_robot:
      - left:
          - name: skill0
            objects: [obj0]
          - name: skill1
            objects: [obj1]
          - name: skill2
            objects: [obj2]
```

**Right Arm Example:**
```yaml
skills:
  - new_robot:
      - right:
          - name: skill0
            objects: [obj0]
          - name: skill1
            objects: [obj1]
          - name: skill2
            objects: [obj2]
```

### Dual-Arm Sequential Task

For dual-arm robots operating sequentially. In this pattern, one arm completes all its skills before the other arm begins. The example below shows the left arm executing first, followed by the right arm.

```yaml
# Left arm skills execute first, then right arm skills
skills:
  - new_robot:
      - left:
          - name: skill0
            objects: [obj0]
          - name: skill1
            objects: [obj1]
          - name: skill2
            objects: [obj2]
      - right:
          - name: skill3
            objects: [obj3]
          - name: skill4
            objects: [obj4]
          - name: skill5
            objects: [obj5]
```

### Dual-Arm Simultaneous Task

For dual-arm robots operating simultaneously. Both arms start at the same time and execute their skills independently. Within each arm, skills still execute sequentially. The task finishes when all skills from both arms are complete.

```yaml
# Left and right arm skills start simultaneously
skills:
  - new_robot:
      - left:
          - name: skill0
            objects: [obj0]
          - name: skill1
            objects: [obj1]
          - name: skill2
            objects: [obj2]
        right:
          - name: skill3
            objects: [obj3]
          - name: skill4
            objects: [obj4]
          - name: skill5
            objects: [obj5]
```

### Complex Task Example

You can freely combine single-arm, dual-arm sequential, and dual-arm simultaneous tasks in any order. This example demonstrates a tableware arrangement task:

1. **Phase 1 (Sequential)**: Right arm picks a plate, places it on the table, then returns home
2. **Phase 2 (Simultaneous)**: Left arm picks and places the fork while right arm picks and places the spoon

```yaml
# Source: workflows/simbox/core/configs/tasks/basic/lift2/arrange_the_tableware/
skills:
  - lift2:
      - right:
          - name: pick
            objects: [plate]
            filter_z_dir: ["forward", 80]
            filter_x_dir: ["downward", 130]
            pre_grasp_offset: 0.05
            gripper_change_steps: 10
            ignore_substring: ["plate_shelf"]
            post_grasp_offset_min: 0.075
            post_grasp_offset_max: 0.125
          - name: place
            objects: [plate, table]
            place_direction: vertical
            filter_z_dir: ["forward", 10]
            filter_y_dir: ["upward", 60, 30]
            filter_x_dir: ["downward", 120, 150]
            position_constraint: object
            x_ratio_range: [0.5, 0.5]
            y_ratio_range: [0.12, 0.20]
            pre_place_z_offset: 0.15
            place_z_offset: 0.1
            post_place_vector: [-0.05, 0.0, 0.0]
            success_mode: xybbox
          - name: heuristic__skill
            mode: home
            gripper_state: 1.0
      - left:
          - name: pick
            objects: [fork]
            filter_z_dir: ["forward", 80]
            filter_x_dir: ["downward", 130]
            pre_grasp_offset: 0.05
            gripper_change_steps: 10
            post_grasp_offset_min: 0.125
            post_grasp_offset_max: 0.175
          - name: place
            objects: [fork, plate]
            place_direction: vertical
            filter_z_dir: ["forward", 20]
            filter_x_dir: ["downward", 150]
            x_ratio_range: [-0.25, -0.15]
            y_ratio_range: [0.30, 0.70]
            pre_place_z_offset: 0.175
            place_z_offset: 0.125
            success_mode: left
            threshold: 0.01
          - name: heuristic__skill
            mode: home
            gripper_state: 1.0
        right:
          - name: pick
            objects: [spoon]
            filter_z_dir: ["forward", 80]
            filter_x_dir: ["downward", 130]
            pre_grasp_offset: 0.05
            gripper_change_steps: 10
            post_grasp_offset_min: 0.125
            post_grasp_offset_max: 0.175
          - name: place
            objects: [spoon, plate]
            place_direction: vertical
            filter_z_dir: ["forward", 20]
            filter_x_dir: ["downward", 150]
            x_ratio_range: [1.15, 1.25]
            y_ratio_range: [0.30, 0.70]
            pre_place_z_offset: 0.175
            place_z_offset: 0.125
            success_mode: right
            threshold: 0.01
          - name: heuristic__skill
            mode: home
            gripper_state: 1.0
```


## Run the Task

Run the simulation with your task configuration:

```bash
# Plan with render mode (suitable for debugging)
bash scripts/simbox/simbox_plan_with_render.sh new_task [num_samples] [random_seed]

# Plan and render mode
bash scripts/simbox/simbox_plan_and_render.sh new_task [num_samples] [random_seed]

# DE pipeline mode (suitable for data generation)
bash scripts/simbox/simbox_pipe.sh new_task [num_samples] [random_seed]
```