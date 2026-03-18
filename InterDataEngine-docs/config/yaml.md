---
title: YAML Configuration
description: Task configuration files for InternDataEngine
---

# YAML Configuration

Task configurations in InternDataEngine are defined using YAML files. This page explains the structure and available options.

## Overview

A task YAML file defines all components needed for a simulation episode: environment, robots, objects, cameras, and skills. The workflow loads this configuration to set up the simulation.

## World Settings

Global simulation settings are defined in the YAML files under `configs/simbox`:

```yaml
simulator:
  physics_dt: 1/30                   # Physics update rate
  rendering_dt: 1/30                 # Render update rate
  stage_units_in_meters: 1.0         # Stage unit scale
  headless: True                     # Run without GUI; set to False for visual debugging
  anti_aliasing: 0                   # Anti-aliasing level
```

### World Settings

- **physics_dt** (<span class="param-type">float</span>): Physics simulation time step (in seconds).
- **rendering_dt** (<span class="param-type">float</span>): Rendering time step (in seconds).
- **stage_units_in_meters** (<span class="param-type">float</span>): Unit scale used for the USD stage.
- **headless** (<span class="param-type">bool</span>): Run without GUI; set to `False` for visual debugging.
- **anti_aliasing** (<span class="param-type">int</span>): Anti-aliasing level (0 = disabled).

## Task Basic Configuration

Each task begins with basic metadata and settings:

```yaml
tasks:
  -
    name: banana_base_task      # Task identifier
    asset_root: workflows/simbox/example_assets  # Root path for all assets
    task: BananaBaseTask        # Task class name
    task_id: 0                  # Task instance ID

    offset: null                # Optional position offset
    render: True                # Enable rendering

    neglect_collision_names: ["table"]  # Collision filter names
```

### Task Basic Configuration

- **name** (<span class="param-type">str</span>): Unique task identifier.
- **asset_root** (<span class="param-type">str</span>): Root directory for all USD assets.
- **task** (<span class="param-type">str</span>): Python class that implements task logic.
- **task_id** (<span class="param-type">int</span>): Instance ID for multi-task scenarios.
- **offset** (<span class="param-type">list</span>): Optional world offset [x, y, z].
- **render** (<span class="param-type">bool</span>): Enable/disable visual rendering.
- **neglect_collision_names** (<span class="param-type">list</span>): Object names to exclude from gripper collision checking.

## Arena

Arena configuration defines static fixtures in the environment, such as tables, floors, and backgrounds. Each fixture specifies its USD asset path, position, orientation, scale, and optionally texture randomization settings.

Arena configs are stored in `workflows/simbox/core/configs/arenas/` and referenced via the `arena_file` field.

```yaml
name: example
fixtures:
  -
    name: table
    path: table0/instance.usd
    target_class: GeometryObject
    translation: [0.0, 0.0, 0.375]
    scale: [0.000525, 0.001053, 0.001056]
  -
    name: floor
    target_class: PlaneObject
    size: [5.0, 5.0]
    translation: [0, 0, 0]
```

## Environment Map

Environment map controls scene lighting and HDR backgrounds. It supports randomization of lighting intensity and rotation:

```yaml
env_map:
  envmap_lib: envmap_lib              # Path to HDR environment maps
  apply_randomization: True           # Enable random lighting
  intensity_range: [4000, 7000]       # Light intensity range
  rotation_range: [0, 180]            # Environment rotation range (degrees)
```

## Robots

Robot configuration specifies the robot name, its configuration file path, initial orientation, and collision filter substrings:

```yaml
robots:
  -
    name: "split_aloha"
    robot_config_file: workflows/simbox/core/configs/robots/split_aloha.yaml
    euler: [0.0, 0.0, 90.0]
    ignore_substring: ["material", "table", "gso_box"]
```

### Robots

- **name** (<span class="param-type">str</span>): Robot identifier (must match skill definitions).
- **robot_config_file** (<span class="param-type">str</span>): Path to robot config file, relative to asset_root.
- **euler** (<span class="param-type">list</span>): Initial rotation [roll, pitch, yaw] in degrees, in world frame.
- **ignore_substring** (<span class="param-type">list</span>): Substrings for collision filtering; objects with matching name prefixes are excluded from CuRobo collision checking.

For detailed robot configuration, see [Robots](/concepts/robots).

## Objects

Objects define items in the scene that can be manipulated, along with their metadata and placement properties:

```yaml
objects:
  -
    name: pick_object_left
    path: task/sort_the_rubbish/non_recyclable_garbage/obj_0/Aligned_obj.usd
    target_class: RigidObject
    dataset: oo3d
    category: bottle
    prim_path_child: Aligned
    translation: [0.0, 0.0, 0.0]
    euler: [0.0, 0.0, 0.0]
    scale: [1, 1, 1]
    apply_randomization: True
    orientation_mode: random
```

### Objects

- **name** (<span class="param-type">str</span>): Unique object identifier (must match skill definitions).
- **path** (<span class="param-type">str</span>): USD file path relative to asset_root.
- **target_class** (<span class="param-type">str</span>): Object type: `RigidObject`, `GeometryObject`, `ArticulatedObject`, `XFormObject`, `ConveyorObject`.
- **dataset** (<span class="param-type">str</span>): Source dataset (e.g., `oo3d`, `gso`).
- **category** (<span class="param-type">str</span>): Object category for grasp detection.
- **prim_path_child** (<span class="param-type">str</span>): USD sub-prim name (default: `Aligned`). This prim contains the target mesh for collision and grasping.
- **translation** (<span class="param-type">list</span>): Initial position [x, y, z] in world frame.
- **euler** (<span class="param-type">list</span>): Initial rotation [roll, pitch, yaw] in degrees, in world frame.
- **scale** (<span class="param-type">list</span>): Scale factors [sx, sy, sz].
- **apply_randomization** (<span class="param-type">bool</span>): Enable pose randomization within the category.
- **orientation_mode** (<span class="param-type">str</span>): Orientation constraint: `random` (pure random), `suggested` (follows category defaults), or `keep` (use `euler` values).

For detailed object configuration, see [Objects](/concepts/objects).

## Regions

Regions define spatial constraints for object placement, specifying which object to place, the target surface, and the allowed position/orientation ranges:

```yaml
regions:
  -
    object: pick_object_left
    target: table
    random_type: A_on_B_region_sampler
    random_config:
      pos_range: [
        [-0.3, -0.20, 0.0],
        [-0.025, 0.10, 0.0]
      ]
      yaw_rotation: [-45.0, 15.0]
```

### Regions

- **object** (<span class="param-type">str</span>): Name of the object to place.
- **target** (<span class="param-type">str</span>): Target surface name from arena fixtures (default: `table`).
- **random_type** (<span class="param-type">str</span>): Sampler type for placement.
- **pos_range** (<span class="param-type">list</span>): Position range [[x_min, y_min, z_min], [x_max, y_max, z_max]] in world frame.
- **yaw_rotation** (<span class="param-type">list</span>): Yaw angle range [min, max] in degrees in world frame.

## Cameras

Camera configuration defines viewpoint, intrinsic parameters, and extrinsic randomization:

```yaml
cameras:
  -
    name: split_aloha_hand_left
    translation: [0.0, 0.08, 0.05]
    orientation: [0.0, 0.0, 0.965, 0.259]
    camera_axes: usd
    camera_file: workflows/simbox/core/configs/cameras/astra.yaml
    parent: "split_aloha/split_aloha_mid_360_with_piper/split_aloha_mid_360_with_piper/fl/link6"
    apply_randomization: False
```

### Cameras

- **name** (<span class="param-type">str</span>): Camera identifier.
- **translation** (<span class="param-type">list</span>): Position offset [x, y, z] from parent link.
- **orientation** (<span class="param-type">list</span>): Rotation offset as quaternion [qx, qy, qz, qw] from parent link.
- **camera_axes** (<span class="param-type">str</span>): Coordinate convention: `usd` or `ros`.
- **camera_file** (<span class="param-type">str</span>): Path to camera parameter file.
- **parent** (<span class="param-type">str</span>): USD prim path to attach the camera to.
- **apply_randomization** (<span class="param-type">bool</span>): Enable extrinsics randomization.

For detailed camera configuration, see [Cameras](/concepts/cameras).

## Data

The data section stores metadata for dataset generation:

```yaml
data:
  task_dir: "sort_the_rubbish_part0"
  language_instruction: "Sort the garbage on the desktop into recyclable and non-recyclable."
  detailed_language_instruction: "Pick the bottles and place them into the recyclable trashbin with right arm, and pick the other garbage and place it into the non-recyclable trashbin with left arm."
  collect_info: ""
  version: "v2.0, head camera 1280x720, wrist 640x480"
  update: True
  max_episode_length: 4000
```

### Data

- **task_dir** (<span class="param-type">str</span>): Output directory name.
- **language_instruction** (<span class="param-type">str</span>): Short task description.
- **detailed_language_instruction** (<span class="param-type">str</span>): Detailed instruction for training.
- **collect_info** (<span class="param-type">str</span>): Additional collection metadata.
- **version** (<span class="param-type">str</span>): Dataset version string.
- **update** (<span class="param-type">bool</span>): Whether to overwrite existing data.
- **max_episode_length** (<span class="param-type">int</span>): Maximum steps per episode.

## Skills

Skills define the action sequence for the robot:

```yaml
skills:
  -
    split_aloha:
      -
        right:
          -
            name: pick
            objects: [pick_object_right]
            filter_y_dir: ["forward", 60]
            filter_z_dir: ["downward", 150]
            pre_grasp_offset: 0.05
            gripper_change_steps: 10
            t_eps: 0.025
            o_eps: 1
            process_valid: True
            lift_th: 0.02
            post_grasp_offset_min: 0.10
            post_grasp_offset_max: 0.15
          -
            name: place
            objects: [pick_object_right, gso_box_right]
            place_direction: vertical
            x_ratio_range: [0.3, 0.4]
            y_ratio_range: [0.3, 0.4]
            pre_place_z_offset: 0.3
            place_z_offset: 0.3
            success_mode: height
          -
            name: heuristic__skill
            mode: home
            gripper_state: 1.0
```

For detailed skill configuration, see [Skills](/concepts/skills/overview).

## Complete Example

Here is a minimal task configuration:

```yaml
tasks:
  -
    name: banana_base_task
    asset_root: workflows/simbox/assets
    task: BananaBaseTask
    task_id: 0
    offset: null
    render: True

    arena_file: workflows/simbox/core/configs/arenas/example.yaml

    env_map:
      envmap_lib: envmap_lib
      apply_randomization: False

    robots:
      -
        name: "fr3"
        robot_config_file: workflows/simbox/core/configs/robots/fr3.yaml
        euler: [0.0, 0.0, 0.0]

    objects:
      -
        name: bottle
        path: objects/bottle.usd
        target_class: RigidObject
        dataset: oo3d
        category: bottle
        prim_path_child: Aligned
        translation: [0.3, 0.0, 0.0]
        euler: [0.0, 0.0, 0.0]
        scale: [1, 1, 1]
        apply_randomization: False

    regions:
      -
        object: bottle
        target: table
        random_type: A_on_B_region_sampler
        random_config:
          pos_range: [[0.2, -0.1, 0.0], [0.4, 0.1, 0.0]]
          yaw_rotation: [-30.0, 30.0]

    cameras:
      -
        name: head_camera
        translation: [0.0, 0.0, 0.5]
        orientation: [0.707, 0.0, 0.0, 0.707]
        camera_file: workflows/simbox/core/configs/cameras/realsense_d455.yaml
        parent: ""

    data:
      task_dir: "pick_bottle"
      language_instruction: "Pick the bottle."
      detailed_language_instruction: "Pick the bottle."
      collect_info: ""
      version: "v1.0"
      update: True
      max_episode_length: 500

    skills:
      -
        fr3:
          -
            name: pick
            objects: [bottle]
            pre_grasp_offset: 0.05
```