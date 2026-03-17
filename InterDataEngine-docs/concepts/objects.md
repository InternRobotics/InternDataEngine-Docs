---
title: Objects
description: Object types supported by InternDataEngine
---

# Objects

InternDataEngine supports various types of objects for simulation tasks. All object classes are located in `workflows/simbox/core/objects/`.

## Supported Object Types

| Class | Description |
|-------|-------------|
| `RigidObject` | Rigid body objects with physics properties (graspable objects) |
| `GeometryObject` | Static geometry objects without physics (tables, fixtures) |
| `ArticulatedObject` | Articulated objects with joints (microwaves, drawers) |
| `PlaneObject` | Simple planes with textures (floors, backgrounds) |
| `XFormObject` | Transform-only objects |
| `ShapeObject` | Basic geometric shapes |
| `ConveyorObject` | Conveyor belt objects |


## RigidObject

`RigidObject` is used for objects that have physical properties and can be manipulated by robots. It inherits from Isaac Sim's `RigidPrim` and supports collision detection, mass properties, and texture randomization.

<p class="method-name">__init__(self, asset_root, root_prim_path, cfg, *args, **kwargs)</p>
<div class="method-block">

Initialize a rigid object in the simulation scene.

<p class="method-section">Parameters: </p>

- **asset_root** (<span class="param-type">str</span>): Root path for asset files.
- **root_prim_path** (<span class="param-type">str</span>): Root prim path in USD stage.
- **cfg** (<span class="param-type">dict</span>): Configuration dictionary containing:
  - **name** (<span class="param-type">str</span>): Object name.
  - **path** (<span class="param-type">str</span>): USD file path relative to asset_root.
  - **prim_path_child** (<span class="param-type">str</span>): Child prim path for rigid body.
  - **translation** (<span class="param-type">list</span>, optional): Initial translation [x, y, z].
  - **euler** (<span class="param-type">list</span>, optional): Initial euler rotation [rx, ry, rz] in degrees.
  - **scale** (<span class="param-type">list</span>, optional): Scale factor [sx, sy, sz].
  - **mass** (<span class="param-type">float</span>, optional): Object mass.
- ****kwargs**: Additional keyword arguments passed to `RigidPrim`.

</div>

### Config Example

```yaml
objects:
  -
    name: pick_object_left
    path: pick_and_place/pre-train-pick/assets/omniobject3d-banana/omniobject3d-banana_001/Aligned_obj.usd
    target_class: RigidObject
    dataset: oo3d
    category: "omniobject3d-banana"
    prim_path_child: Aligned
    translation: [0.0, 0.0, 0.0]
    euler: [0.0, 0.0, 0.0]
    scale: [0.001, 0.001, 0.001]
    apply_randomization: True
    orientation_mode: "suggested"
```

### Configuration Parameters

- **name** (`str`): Unique identifier for this object instance.
- **path** (`str`): Path to the USD file containing the object mesh.
- **target_class** (`str`): Must be `RigidObject` for rigid bodies.
- **dataset** (`str`): Dataset source identifier.
- **category** (`str`): Object category name.
- **prim_path_child** (`str`): Name of the child prim that contains the mesh.
- **translation** (`list`): Initial position [x, y, z] in world coordinates.
- **euler** (`list`): Initial rotation in degrees [roll, pitch, yaw].
- **scale** (`list`): Scale factors for each axis.
- **apply_randomization** (`bool`): Whether to apply domain randomization.
- **orientation_mode** (`str`): Orientation mode for randomization.


## GeometryObject

`GeometryObject` is used for static objects without physics simulation. It's ideal for environmental objects like tables, shelves, or fixtures that don't need to interact physically with other objects.

<p class="method-name">__init__(self, asset_root, root_prim_path, cfg, *args, **kwargs)</p>
<div class="method-block">

Initialize a geometry object in the simulation scene.

<p class="method-section">Parameters: </p>

- **asset_root** (<span class="param-type">str</span>): Root path for asset files.
- **root_prim_path** (<span class="param-type">str</span>): Root prim path in USD stage.
- **cfg** (<span class="param-type">dict</span>): Configuration dictionary containing:
  - **name** (<span class="param-type">str</span>): Object name.
  - **path** (<span class="param-type">str</span>): USD file path relative to asset_root.
  - **prim_path_child** (<span class="param-type">str</span>, optional): Child prim path suffix.
- ****kwargs**: Additional keyword arguments passed to `GeometryPrim`.

<p class="method-section">Difference from RigidObject: </p>

- No physics simulation (no mass, no collision response)
- Lighter weight for static environment objects
- Cannot be grasped or moved by robots

</div>

### Config Example

```yaml
objects:
  -
    name: table
    path: table0/instance.usd
    target_class: GeometryObject
    translation: [0.0, 0.0, 0.375]
    scale: [0.001, 0.001053, 0.001056]
```

### Configuration Parameters

- **name** (`str`): Unique identifier for this object.
- **path** (`str`): Path to the USD file.
- **target_class** (`str`): Must be `GeometryObject` for static geometry.
- **translation** (`list`): Position in world coordinates.
- **scale** (`list`): Scale factors for each axis.


## PlaneObject

`PlaneObject` creates simple planes with optional texture mapping. It's commonly used for floors, backgrounds, and other flat surfaces.

<p class="method-name">__init__(self, asset_root, root_prim_path, cfg, *args, **kwargs)</p>
<div class="method-block">

Initialize a plane object in the simulation scene.

<p class="method-section">Parameters: </p>

- **asset_root** (<span class="param-type">str</span>): Root path for asset files.
- **root_prim_path** (<span class="param-type">str</span>): Root prim path in USD stage.
- **cfg** (<span class="param-type">dict</span>): Configuration dictionary containing:
  - **name** (<span class="param-type">str</span>): Object name.
  - **size** (<span class="param-type">list</span>): Plane dimensions [width, height].
  - **translation** (<span class="param-type">list</span>, optional): Position [x, y, z].
  - **euler** (<span class="param-type">list</span>, optional): Rotation in degrees [roll, pitch, yaw].
  - **texture** (<span class="param-type">dict</span>, optional): Texture configuration.
- ****kwargs**: Additional keyword arguments.

</div>

### Config Example

```yaml
objects:
  -
    name: floor
    target_class: PlaneObject
    size: [5.0, 5.0]
    translation: [0, 0, 0]
    texture:
      texture_lib: "floor_textures"
      apply_randomization: True
      texture_id: 1
      texture_scale: [1.0, 1.0]
  -
    name: background0
    target_class: PlaneObject
    size: [3.0, 5.0]
    translation: [-2, 0, 1]
    euler: [0.0, 90.0, 0.0]
    texture:
      texture_lib: "background_textures"
      apply_randomization: True
      texture_id: 1
      texture_scale: [1.0, 1.0]
  -
    name: background1
    target_class: PlaneObject
    size: [3.0, 5.0]
    translation: [2, 0, 1]
    euler: [0.0, 90.0, 0.0]
    texture:
      texture_lib: "background_textures"
      apply_randomization: True
      texture_id: 1
      texture_scale: [1.0, 1.0]
  -
    name: background2
    target_class: PlaneObject
    size: [5.0, 3.0]
    translation: [0, -2, 1]
    euler: [90.0, 0.0, 0.0]
    texture:
      texture_lib: "background_textures"
      apply_randomization: True
      texture_id: 1
      texture_scale: [1.0, 1.0]
  -
    name: background3
    target_class: PlaneObject
    size: [5.0, 3.0]
    translation: [0, 2, 1]
    euler: [90.0, 0.0, 0.0]
    texture:
      texture_lib: "background_textures"
      apply_randomization: True
      texture_id: 1
      texture_scale: [1.0, 1.0]
```

### Configuration Parameters

- **name** (`str`): Unique identifier for the plane.
- **target_class** (`str`): Must be `PlaneObject`.
- **size** (`list`): Plane dimensions [width, height].
- **translation** (`list`): Position [x, y, z].
- **euler** (`list`): Rotation angles [roll, pitch, yaw] in degrees.
- **texture.texture_lib** (`str`): Name of texture library folder.
- **texture.apply_randomization** (`bool`): Whether to randomize texture selection.
- **texture.texture_id** (`int`): Specific texture ID (used when randomization is False).
- **texture.texture_scale** (`list`): Scale factors for texture UV mapping.


## ArticulatedObject

`ArticulatedObject` handles objects with movable joints, such as microwaves, drawers, and cabinets. It inherits from Isaac Sim's `Articulation` class and provides methods for joint control and state retrieval.

<p class="method-name">__init__(self, asset_root, root_prim_path, cfg, *args, **kwargs)</p>
<div class="method-block">

Initialize an articulated object in the simulation scene. Loads articulation info from the specified `info.json` file.

<p class="method-section">Parameters: </p>

- **asset_root** (<span class="param-type">str</span>): Root path for asset files.
- **root_prim_path** (<span class="param-type">str</span>): Root prim path in USD stage.
- **cfg** (<span class="param-type">dict</span>): Configuration dictionary containing:
  - **name** (<span class="param-type">str</span>): Object name.
  - **path** (<span class="param-type">str</span>): USD file path relative to asset_root.
  - **info_name** (<span class="param-type">str</span>): Name of the skill folder containing `info.json`.
  - **category** (<span class="param-type">str</span>): Object category identifier.
  - **euler** (<span class="param-type">list</span>, optional): Initial rotation [roll, pitch, yaw].
  - **joint_position_range** (<span class="param-type">list</span>, optional): Random range for initial joint position [min, max].
  - **apply_randomization** (<span class="param-type">bool</span>, optional): Whether to apply domain randomization.
- ****kwargs**: Additional keyword arguments passed to `Articulation`.

</div>

<p class="method-name">get_articulated_info(self, object_info)</p>
<div class="method-block">

Parse and store articulation information from the object's info.json file. This method extracts keypoints, joint paths, scale information, and axis orientations.

<p class="method-section">Parameters: </p>

- **object_info** (<span class="param-type">dict</span>): Dictionary loaded from `Kps/{skill}/info.json` containing:
  - **object_keypoints** (<span class="param-type">dict</span>): Keypoint positions in link_0 frame.
  - **object_scale** (<span class="param-type">list</span>): Object scale factors.
  - **object_prim_path** (<span class="param-type">str</span>): Prim path for the object.
  - **object_link_path** (<span class="param-type">str</span>): Prim path for the articulated link.
  - **object_base_path** (<span class="param-type">str</span>): Prim path for the base link.
  - **object_joint_path** (<span class="param-type">str</span>): Prim path for the joint.
  - **joint_index** (<span class="param-type">int</span>): Index of the main joint.
  - **object_link0_rot_axis** (<span class="param-type">str</span>): Rotation axis of the link.
  - **object_base_front_axis** (<span class="param-type">str</span>): Front axis of the base.

</div>

<p class="method-name">get_joint_position(self, stage)</p>
<div class="method-block">

Count and configure joints in the articulated object. This method identifies prismatic and revolute joints, and optionally fixes the base of the articulated object.

<p class="method-section">Parameters: </p>

- **stage** (<span class="param-type">UsdStage</span>): The USD stage containing the articulation.

<p class="method-section">Sets the following attributes: </p>

- **object_joint_number** (<span class="param-type">int</span>): Total number of joints found.

</div>

### Config Example

```yaml
objects:
  -
    name: close_v_left
    target_class: ArticulatedObject
    info_name: "close_v"
    euler: [0.0, 0.0, 90.0]
    joint_position_range: [0.6, 0.8]
    apply_randomization: False
    path: "art/microwave_gr/microwave7119/instance.usd"
    category: "microwave_gr"
```

### Configuration Parameters

- **name** (`str`): Unique identifier for the articulated object.
- **target_class** (`str`): Must be `ArticulatedObject`.
- **info_name** (`str`): Name of the skill folder containing `info.json`.
- **euler** (`list`): Initial rotation [roll, pitch, yaw] in degrees.
- **joint_position_range** (`list`): Random range for initial joint position [min, max].
- **apply_randomization** (`bool`): Whether to apply domain randomization.
- **path** (`str`): Path to the USD file (relative to asset_root).
- **category** (`str`): Object category identifier.
