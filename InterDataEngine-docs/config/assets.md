---
title: Assets
description: Managing simulation assets in InternDataEngine
---

# Assets

All simulation assets are organized under `workflows/simbox/assets`. This document describes the asset structure, required assets, and organization conventions.

## Asset Structure

```
workflows/simbox/assets/
├── envmap_lib/              # HDR environment maps for scene lighting
├── background_textures/     # Background textures for domain randomization
├── floor_textures/          # Floor textures for domain randomization
├── table_textures/          # Table surface textures
├── table0/                  # Default table USD model
├── lift2/                   # ARX Lift-2 robot assets
├── G1_120s/                 # Genie-1 robot assets
├── franka/                  # Franka robot assets
├── frankarobotiq/           # Franka with Robotiq 2F-85 gripper assets
├── split_aloha_mid_360/     # Agilex Split ALOHA robot assets
├── basic/                   # Basic task-specific assets
│   ├── arrange_the_tableware/
│   ├── hang_the_cup_on_rack/
│   ├── pour/
│   ├── store_the_eggs/
│   └── ...                  # Other task folders
├── art/                     # Articulated object assets
│   ├── electriccooker/
│   ├── microwave_gr/
│   ├── laptop/
│   └── ...
├── long_horizon/            # Long-horizon task assets
└── pick_and_place/          # Pick-and-place task assets
```

## Required Assets

To run a simulation task, the following assets are required:

- **Environment Maps** (`envmap_lib/`): HDR lighting for scene illumination.
- **Background Textures** (`background_textures/`): Domain randomization backgrounds.
- **Floor Textures** (`floor_textures/`): Floor appearance variation.
- **Table Model** (`table0/`): Default table fixture.
- **Robot Assets** (e.g., `lift2/`): Robot USD and kinematics configs.
- **Task Assets** (e.g., `basic/<task_name>/`): Objects specific to each task.

## Rigid Object Assets

This section describes the asset structure for rigid objects, using `workflows/simbox/example_assets/task/sort_the_rubbish` as an example.

### Directory Organization

Different object categories are placed in separate folders at the same level. Objects of the same category are grouped together in a single folder to facilitate **category-level randomization**.

```
workflows/simbox/example_assets/task/sort_the_rubbish/
├── garbage_can/             # Container category
│   ├── recyclable_can/
│   └── nonrecyclable_can/
├── non_recyclable_garbage/  # Non-recyclable items category
│   ├── obj_1/
│   ├── obj_2/
│   └── ...
└── recyclable_garbage/      # Recyclable items category
    ├── bottle_0/
    ├── bottle_1/
    └── ...
```

### Object Instance Structure

Each object instance folder contains the USD model, textures, and annotations:

```
workflows/simbox/example_assets/task/sort_the_rubbish/non_recyclable_garbage/obj_2/
├── Aligned_obj.usd              # Object USD with physics properties (mass, collision, etc.)
├── Aligned_grasp_sparse.npy     # Grasp pose annotations (for pickable objects)
└── textures/                    # Texture files
    └── baked_mesh_*.png
```

**File Naming Conventions:**

- **Aligned_obj.usd** (<span class="param-type">file</span>): USD file containing the 3D model with complete physics properties (mass, collision mesh, etc.).
- **Aligned_grasp_sparse.npy** (<span class="param-type">file</span>): Grasp pose annotations for manipulation tasks.
- **textures/** (<span class="param-type">directory</span>): Directory containing texture maps for the object.

## Articulated Object Assets

Articulated objects (e.g., doors, drawers, appliances) follow a similar organization pattern. This section uses `workflows/simbox/assets/art/electriccooker` as an example.

### Directory Organization

Different articulated object categories are placed in separate folders. Objects within the same category share consistent orientation, category classification, and functionality after preprocessing.

```
workflows/simbox/assets/art/electriccooker/
├── electriccooker_0002/
├── electriccooker_0008/
├── electriccooker_0011/
├── electriccooker_0017/
├── electriccooker_0031/
└── ...
```

### Articulated Object Instance Structure

Each articulated object instance contains the USD model, materials, and keypoint annotations:

```
workflows/simbox/assets/art/electriccooker/electriccooker_0031/
├── instance.usd             # Articulated object USD
├── instance.png             # Preview image
├── Materials/               # Material definitions
└── Kps/                     # Keypoint annotations
    └── close_h/             # Keypoints for "close horizontally" action
        ├── keypoints.json
        ├── keypoints_final.json
        └── info.json
```

**File Naming Conventions:**

- **instance.usd** (<span class="param-type">file</span>): USD file for articulated objects (unlike rigid objects which use `Aligned_obj.usd`).
- **instance.png** (<span class="param-type">file</span>): Preview/thumbnail image.
- **Materials/** (<span class="param-type">directory</span>): Material and texture definitions.
- **Kps/** (<span class="param-type">directory</span>): Keypoint annotations for interaction points.
- **Kps/<action_type>/** (<span class="param-type">directory</span>): Action-specific keypoints (e.g., `close_h` for closing horizontally).

### Keypoint Annotations

Keypoint annotations define interaction points for articulated objects:

```
Kps/
├── close_h/         # Close horizontally (e.g., laptop, pot, electric cooker)
├── close_v/         # Close vertically (e.g., microwave)
├── open_h/          # Open horizontally
├── open_v/          # Open vertically
├── pull/            # Pull (e.g., drawer)
├── push/            # Push
└── ...
```

Each action folder contains:

- **keypoints.json** (<span class="param-type">file</span>): Initial keypoint positions.
- **keypoints_final.json** (<span class="param-type">file</span>): Final/processed keypoint positions.
- **info.json** (<span class="param-type">file</span>): Metadata about the keypoints.

## Asset Configuration

Assets are referenced in task YAML configurations:

```yaml
objects:
  - name: bottle_1
    path: task/sort_the_rubbish/recyclable_garbage/bottle_1/Aligned_obj.usd
    target_class: RigidObject
    category: bottle
```

For more details on object configuration, see [Objects](/concepts/objects).

## Best Practices

1. **Category Organization**: Group objects of the same category in a single folder for efficient domain randomization.

2. **Consistent Naming**: Use standardized naming conventions:
   - `Aligned_obj.usd` for rigid objects
   - `instance.usd` for articulated objects
   - `Aligned_grasp_sparse.npy` for grasp annotations

3. **Complete Physics Properties**: Ensure USD files include:
   - Accurate mass properties
   - Collision meshes
   - Appropriate friction coefficients

4. **Preprocessing**: For all objects, ensure consistent frame and alignment across instances in the same category.