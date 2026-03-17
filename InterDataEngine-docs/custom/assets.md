---
title: New Assets
description: Add new assets to InternDataEngine
---

# New Assets

This guide explains how to add new assets to InternDataEngine for simulation tasks.

## Part 1: Rigid Objects

This section describes how to introduce new rigid objects for manipulation tasks.

### Step 1: Obtain Geometry and Textures

We recommend starting with an OBJ file that includes:
- An `.mtl` file storing material properties
- With texture images

**Sources for OBJ Files:**

| Source | Description |
|--------|-------------|
| Open-source datasets | Various public 3D model repositories |
| ARCode | 3D reconstruction software for high-fidelity surface textures |
| LiDAR-based apps | Reconstruction apps with depth sensors for mesh generation |
| Tencent Hunyuan3D | Multi-view reconstruction for fine, non-convex, or transparent/specular objects |

<div class="custom-tip">
<p class="custom-tip-title">Hint</p>
<p class="custom-tip-content">For objects that are difficult to reconstruct (fine details, non-convex shapes, transparent or highly reflective surfaces), we recommend <a href="https://3d.hunyuan.tencent.com/">Tencent Hunyuan3D</a> for high-quality multi-view reconstruction.</p>
</div>

### Step 2: Preprocess the OBJ File

Before conversion, preprocess the OBJ file to ensure it meets the following requirements:

- **Correct units**: Use real-world scale (meters recommended)
- **Centered origin**: Place origin at the object's center
- **Canonical pose**: Align with a reasonable axis (e.g., along a symmetry axis)

You can perform these adjustments in **MeshLab**:

<p align="center">
  <a href="/meshlab_setorigin.jpg" target="_blank">
    <img src="/meshlab_setorigin.jpg" alt="Set Origin in MeshLab" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Setting the origin point at the object center in MeshLab</em></p>

<p align="center">
  <a href="/meshlab_set_scale.jpg" target="_blank">
    <img src="/meshlab_set_scale.jpg" alt="Set Scale in MeshLab" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Setting the correct scale (units) for the object</em></p>

<p align="center">
  <a href="/meshlab_set_rotation.jpg" target="_blank">
    <img src="/meshlab_set_rotation.jpg" alt="Set Rotation in MeshLab" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Rotating the object to align with canonical pose</em></p>

After adjustment, export and <span style="color: red; font-weight: bold;">rename to `Aligned_obj.obj`</span>.

### Step 3: Convert OBJ to USD

Navigate to the tools directory and run the converter:

```bash
cd workflows/simbox/tools/rigid_obj
python asset_usd_converter.py --folders /path/to/obj/folder
```

This converts the OBJ to USD format and saves it as `Aligned_obj.usd` in the same directory.

<p align="center">
  <a href="/obj2usd.jpg" target="_blank">
    <img src="/obj2usd.jpg" alt="OBJ to USD Conversion" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Converting OBJ to USD format</em></p>

### Step 4: Add Rigid Body Properties

Add rigid body physics properties (mass, etc.) to the USD file:

```bash
python make_rigid.py --usd_path /path/to/Aligned_obj.usd
```

<p align="center">
  <a href="/usd_add_rigid.jpg" target="_blank">
    <img src="/usd_add_rigid.jpg" alt="Add Rigid Body Properties" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Adding rigid body physics properties (mass) to the USD</em></p>

### Step 5: Add Collision and Friction

Add collider properties and physics materials with friction:

```bash
# NOTE: This requires Isaac Sim Python
isaacsim.python.sh make_collider.py --usd_path /path/to/Aligned_obj.usd
```

The collider uses convex decomposition to tightly wrap the object for accurate collision detection.

<p align="center">
  <a href="/usd_add_collider.jpg" target="_blank">
    <img src="/usd_add_collider.jpg" alt="Add Collider Properties" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Adding collision mesh and friction properties</em></p>

### Step 6: Verify Properties

After processing, confirm the USD file has the following physics properties:
- Rigid body dynamics
- Collision mesh
- Friction coefficients

The USD file structure will be:

```
World (defaultprim)
├── Looks
│   └── materials
└── Aligned
    └── mesh
```

This hierarchical design ensures consistency. The `Aligned` prim (commonly set as `prim_path_child`) contains the mesh, which is used to detect force contact with the gripper.

### Step 7 (Optional but Common): Generate Grasp Poses

If the object will be used for grasping, generate grasp pose annotations:

```bash
cd workflows/simbox/tools/grasp
# See README.md for detailed usage
python gen_sparse_label.py --obj_path /path/to/Aligned_obj.obj --unit m
```

For detailed instructions, refer to the [README.md](https://github.com/InternRobotics/InternDataEngine/blob/master/workflows/simbox/tools/grasp/README.md) in the grasp tools directory.

<p align="center">
  <a href="/grasp_banana.jpg" target="_blank">
    <img src="/grasp_banana.jpg" alt="Grasp Pose Visualization" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Visualization of generated grasp poses on a banana object</em></p>

<div class="custom-warning">
<p class="custom-warning-title">Warning</p>
<p class="custom-warning-content">The OBJ file must maintain consistent canonical frame and scale with the USD file. If you modify the OBJ file (scale, orientation) after USD conversion and then regenerate grasp poses, the grasp poses will be incorrect because they are generated from the OBJ mesh.</p>
</div>

### Step 8: Final Directory Structure

After completing all the steps above, your task's asset directory should have the following structure:

```
new_task/
└── new_objs/                          # Directory containing all rigid objects
    ├── new_obj0/                      # Example object instance
    │   ├── Aligned_obj.obj            # Preprocessed OBJ mesh (source)
    │   ├── Aligned.mtl                # Material file for OBJ
    │   ├── Aligned_obj.usd            # Final USD with physics properties
    │   ├── Aligned_grasp_sparse.npy   # Sparse grasp poses (N × 17)
    │   ├── Aligned_grasp_dense.npz    # Dense grasp poses (optional)
    │   └── textures/                  # Texture files
    │       └── Scan.jpg               # Object texture image
    ├── new_obj1/                      # Another object instance
    ├── new_obj2/
    ├── new_obj3/
    └── new_obj4/
```


## Part 2: Articulated Objects

This section describes how to add new articulated objects (e.g., microwave, drawer, cabinet) for manipulation tasks.

### Step 1: Prepare a Stable USD Asset

First, you need to prepare a stable USD asset for the articulated object. This USD can be:
- Built from scratch
- Converted from URDF format

The asset should have stable physical properties:
- **Mass**: Properly defined for each link
- **Joint properties**: Appropriate stiffness and damping values
- **Collision**: Properly configured colliders for realistic interaction

The initial hierarchy structure should look like this:

<p align="center">
  <a href="/pre_rehier.jpg" target="_blank">
    <img src="/pre_rehier.jpg" alt="Initial USD Hierarchy" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Initial USD hierarchy structure - root positioned at articulation root</em></p>

### Step 2: Understand the Skills Directory Structure

We provide tools for different articulated object manipulation skills in `workflows/simbox/tools/art/`. Currently available:
- `close_v`: Close vertical articulated objects (e.g., microwave, oven)
- `open_v`: Open vertical articulated objects

More skills will be added gradually.

Take `close_v` as an example - this skill handles horizontal closing motions like closing a microwave from the side. A sample asset is provided at `workflows/simbox/tools/art/close_v/7265/usd/`.

### Step 3: Create keypoints_config.json

After obtaining the original asset (e.g., `microwave_0.usd`), create a `keypoints_config.json` file with the following structure:

```json
{
    "DIR": "/path/to/your/usd/directory",
    "USD_NAME": "microwave_0.usd",
    "INSTANCE_NAME": "microwave7265",
    "link0_initial_prim_path": "/root/group_18",
    "base_initial_prim_path": "/root/group_0",
    "revolute_joint_initial_prim_path": "/root/group_18/RevoluteJoint",
    "joint_index": 0,
    "LINK0_ROT_AXIS": "y",
    "BASE_FRONT_AXIS": "z",
    "LINK0_CONTACT_AXIS": "-y",
    "SCALED_VOLUME": 0.02
}
```

| Configuration | Description |
|---------------|-------------|
| **DIR** | Directory where USD files are stored |
| **USD_NAME** | Original USD file name |
| **INSTANCE_NAME** | Model identifier (name it yourself, preferably matching the asset) |
| **link0_initial_prim_path** | Absolute path in Isaac Sim for the "door" that interacts with the gripper |
| **base_initial_prim_path** | Absolute path in Isaac Sim for the object base |
| **revolute_joint_initial_prim_path** | Absolute path for the revolute joint |
| **joint_index** | Joint number (default: 0) |
| **LINK0_ROT_AXIS** | Axis pointing vertically upward in the rotating joint's local coordinate system |
| **BASE_FRONT_AXIS** | Axis facing the door in the base link's local coordinate system |
| **LINK0_CONTACT_AXIS** | Axis pointing vertically downward in the contact link's local coordinate system |
| **SCALED_VOLUME** | Default value 0.02 for microwave-like objects |

For detailed axis configuration with visual examples, refer to the [readme.md](https://github.com/InternRobotics/InternDataEngine/blob/master/workflows/simbox/tools/art/close_v/readme.md).

### Step 4: Run the Keypoint Annotation Pipeline

Navigate to the tools directory and follow the pipeline in `keypoints_pipeline.sh`:

```bash
cd workflows/simbox/tools/art/close_v/tool
```

**Step 4.1: Rehier - Restructure Asset Hierarchy**

```bash
python rehier.py --config $CONFIG_PATH
```

This step reorganizes the asset hierarchy to a unified standard. After rehier, the structure should look like:

<p align="center">
  <a href="/after_rehier.jpg" target="_blank">
    <img src="/after_rehier.jpg" alt="Rehiered USD Hierarchy" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Restructured USD hierarchy - instance prim inserted between original asset and root as articulation root</em></p>

An `instance.usd` file will be generated, indicating success. All joints except the specified one will be locked.

**Step 4.2: Select Keypoints**

```bash
python select_keypoint.py --config $CONFIG_PATH
```

This opens an Open3D visualization window for interactive point selection:
- **Ctrl + Left Click**: Add a point
- **Ctrl + Right Click**: Remove a point

You need to annotate two contact points:

| Point | Description |
|-------|-------------|
| **First point (articulated_object_head)** | Desired base position where the gripper contacts the door |
| **Second point (articulated_object_tail)** | The line from the first point should be perpendicular to the rotation axis |

For visual guidance, refer to the [readme.md](https://github.com/InternRobotics/InternDataEngine/blob/master/workflows/simbox/tools/art/close_v/readme.md).

**Step 4.3: Transfer Keypoints**

```bash
python transfer_keypoints.py --config $CONFIG_PATH
```

**Step 4.4: Overwrite Keypoints**

```bash
python overwrite_keypoints.py --config $CONFIG_PATH
```

### Step 5: Final Directory Structure

After completing all steps, your asset directory should have the following structure:

```
7265/                                # Asset ID
└── usd/
    ├── microwave_0.usd              # Original USD asset
    ├── instance.usd                 # Processed USD with rehiered structure
    ├── keypoints_config.json        # Configuration file
    ├── textures/                    # Texture files
    │   ├── door_mesh_0_texture_0.jpg
    │   └── door_mesh_1_texture_0.jpg
    └── Kps/                         # Keypoint annotations
        └── close_v/                 # Skill directory
            ├── info.json            # Complete metadata
            ├── keypoints.json       # Raw keypoints
            └── keypoints_final.json # Final processed keypoints
```

You can have multiple USD files for similar objects. Each USD directory must contain:
- `instance.usd`: The processed USD asset
- `Kps/`: Keypoint annotations organized by skill

Each skill directory under `Kps/` must contain:
- `info.json`: Complete object metadata including paths, axes, and keypoint positions
- `keypoints.json`: Raw keypoint coordinates
- `keypoints_final.json`: Processed keypoint data

### Step 6: Test with Task Configuration

With the annotated asset, you can now write a task configuration file to test the manipulation task. Refer to existing task configs in `workflows/simbox/core/configs/tasks/art/` for examples.

## References

- [GraspNet API](https://github.com/graspnet/graspnetAPI)
- [Tencent Hunyuan3D](https://3d.hunyuan.tencent.com/)