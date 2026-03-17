---
title: Place Skill
description: Place objects at target locations with constrained orientations
---

# Place Skill

The `Place` skill performs placement operations with constrained end-effector orientations. It generates valid place poses through random sampling and filtering, then executes the placement motion.

```python
# Source workflows/simbox/core/skills/place.py
from copy import deepcopy

import numpy as np
from core.skills.base_skill import BaseSkill, register_skill
from core.utils.box import Box, get_bbox_center_and_corners
from core.utils.constants import CUROBO_BATCH_SIZE
from core.utils.iou import IoU
from core.utils.plan_utils import (
    select_index_by_priority_dual,
    select_index_by_priority_single,
)
from core.utils.transformation_utils import create_pose_matrices, poses_from_tf_matrices
from core.utils.usd_geom_utils import compute_bbox
from omegaconf import DictConfig
from omni.isaac.core.controllers import BaseController
from omni.isaac.core.robots.robot import Robot
from omni.isaac.core.tasks import BaseTask
from omni.isaac.core.utils.prims import get_prim_at_path
from omni.isaac.core.utils.transformations import (
    get_relative_transform,
    pose_from_tf_matrix,
    tf_matrix_from_pose,
)
from scipy.spatial.transform import Rotation as R


@register_skill
class Place(BaseSkill):
    def __init__(self, robot: Robot, controller: BaseController, task: BaseTask, cfg: DictConfig, *args, **kwargs):
        super().__init__()
        self.robot = robot
        self.controller = controller
        self.task = task

        self.name = cfg["name"]
        self.pick_obj = task._task_objects[cfg["objects"][0]]
        self.place_obj = task._task_objects[cfg["objects"][1]]
        self.place_align_axis = cfg.get("place_align_axis", None)
        self.pick_align_axis = cfg.get("pick_align_axis", None)
        self.constraint_gripper_x = cfg.get("constraint_gripper_x", False)
        self.place_part_prim_path = cfg.get("place_part_prim_path", None)
        if self.place_part_prim_path:
            self.place_prim_path = f"{self.place_obj.prim_path}/{self.place_part_prim_path}"
        else:
            self.place_prim_path = self.place_obj.prim_path
        self.manip_list = []
        self.robot_ee_path = self.controller.robot_ee_path
        self.robot_base_path = self.controller.robot_base_path

        self.skill_cfg = cfg
        self.align_pick_obj_axis = self.skill_cfg.get("align_pick_obj_axis", None)
        self.align_place_obj_axis = self.skill_cfg.get("align_place_obj_axis", None)
        self.align_plane_x_axis = self.skill_cfg.get("align_plane_x_axis", None)
        self.align_plane_y_axis = self.skill_cfg.get("align_plane_y_axis", None)
        self.align_obj_tol = self.skill_cfg.get("align_obj_tol", None)

    def simple_generate_manip_cmds(self):
        manip_list = []

        p_base_ee_cur, q_base_ee_cur = self.controller.get_ee_pose()
        cmd = (p_base_ee_cur, q_base_ee_cur, "update_pose_cost_metric", {"hold_vec_weight": None})
        manip_list.append(cmd)

        if self.skill_cfg.get("ignore_substring", []):
            ignore_substring = deepcopy(self.controller.ignore_substring + self.skill_cfg.get("ignore_substring", []))
            cmd = (
                p_base_ee_cur,
                q_base_ee_cur,
                "update_specific",
                {"ignore_substring": ignore_substring, "reference_prim_path": self.controller.reference_prim_path},
            )
            manip_list.append(cmd)

        result = self.sample_gripper_place_traj()

        cmd = (result[0][0], result[0][1], "close_gripper", {})
        manip_list.append(cmd)

        p_base_ee_place, q_base_ee_place = result[1][0], result[1][1]
        cmd = (p_base_ee_place, q_base_ee_place, "close_gripper", {})
        manip_list.append(cmd)

        cmd = (p_base_ee_place, q_base_ee_place, "open_gripper", {})
        manip_list.extend([cmd] * self.skill_cfg.get("gripper_change_steps", 10))

        cmd = (p_base_ee_place, q_base_ee_place, "detach_obj", {})
        manip_list.append(cmd)

        self.manip_list = manip_list
        self.place_ee_trans = p_base_ee_place

    def sample_gripper_place_traj(self):
        # ... sampling logic ...
        pass

    def generate_constrained_rotation_batch(self, batch_size=3000):
        filter_conditions = {
            "x": {
                "forward": (0, 0, 1),
                "backward": (0, 0, -1),
                "leftward": (1, 0, 1),
                "rightward": (1, 0, -1),
                "upward": (2, 0, 1),
                "downward": (2, 0, -1),
            },
            "y": {
                "forward": (0, 1, 1),
                "backward": (0, 1, -1),
                "leftward": (1, 1, 1),
                "rightward": (1, 1, -1),
                "upward": (2, 1, 1),
                "downward": (2, 1, -1),
            },
            "z": {
                "forward": (0, 2, 1),
                "backward": (0, 2, -1),
                "leftward": (1, 2, 1),
                "rightward": (1, 2, -1),
                "upward": (2, 2, 1),
                "downward": (2, 2, -1),
            },
        }
        rot_mats = R.random(batch_size).as_matrix()
        valid_mask = np.ones(batch_size, dtype=bool)

        for axis in ["x", "y", "z"]:
            filter_list = self.skill_cfg.get(f"filter_{axis}_dir", None)
            if filter_list is not None:
                direction = filter_list[0]
                row, col, sign = filter_conditions[axis][direction]
                elements = rot_mats[:, row, col]
                if len(filter_list) == 2:
                    value = filter_list[1]
                    cos_val = np.cos(np.deg2rad(value))
                    if sign > 0:
                        valid_mask &= elements >= cos_val
                    else:
                        valid_mask &= elements <= cos_val

        valid_rot_mats = rot_mats[valid_mask]
        if len(valid_rot_mats) == 0:
            return rot_mats[:CUROBO_BATCH_SIZE]
        else:
            indices = np.random.choice(len(valid_rot_mats), CUROBO_BATCH_SIZE)
            return valid_rot_mats[indices]

    def is_feasible(self, th=5):
        return self.controller.num_plan_failed <= th

    def is_subtask_done(self, t_eps=1e-3, o_eps=5e-3):
        assert len(self.manip_list) != 0
        p_base_ee_cur, q_base_ee_cur = self.controller.get_ee_pose()
        p_base_ee, q_base_ee, *_ = self.manip_list[0]
        diff_trans = np.linalg.norm(p_base_ee_cur - p_base_ee)
        diff_ori = 2 * np.arccos(min(abs(np.dot(q_base_ee_cur, q_base_ee)), 1.0))
        pose_flag = np.logical_and(diff_trans < t_eps, diff_ori < o_eps)
        self.plan_flag = self.controller.num_last_cmd > 10
        return np.logical_or(pose_flag, self.plan_flag)

    def is_done(self):
        if len(self.manip_list) == 0:
            return True
        if self.is_subtask_done(t_eps=self.skill_cfg.get("t_eps", 1e-3), o_eps=self.skill_cfg.get("o_eps", 5e-3)):
            self.manip_list.pop(0)
        return len(self.manip_list) == 0

    def is_success(self, th=0.0):
        if self.skill_cfg.get("success_mode", "3diou") == "3diou":
            bbox_pick_obj = compute_bbox(self.pick_obj.prim)
            bbox_place_obj = compute_bbox(get_prim_at_path(self.place_prim_path))
            iou = IoU(
                Box(get_bbox_center_and_corners(bbox_pick_obj)), Box(get_bbox_center_and_corners(bbox_place_obj))
            ).iou()
            return iou > th
        elif self.skill_cfg.get("success_mode", "3diou") == "xybbox":
            bbox_place_obj = compute_bbox(get_prim_at_path(self.place_prim_path))
            pick_x, pick_y = self.pick_obj.get_local_pose()[0][:2]
            place_xy_min = bbox_place_obj.min[:2]
            place_xy_max = bbox_place_obj.max[:2]
            return ((place_xy_min[0] + 0.015) < pick_x < (place_xy_max[0] - 0.015)) and (
                (place_xy_min[1] + 0.015) < pick_y < (place_xy_max[1] - 0.015)
            )
```

<p class="method-name">__init__(self, robot, controller, task, cfg, *args, **kwargs)</p>
<div class="method-block">

Initialize the place skill with target objects and constraints.

<p class="method-section">Parameters:</p>

- **robot** (<span class="param-type">Robot</span>): Robot instance for state queries and actions.
- **controller** (<span class="param-type">BaseController</span>): Controller for motion planning.
- **task** (<span class="param-type">BaseTask</span>): Task instance containing scene objects.
- **cfg** (<span class="param-type">DictConfig</span>): Skill configuration from task YAML.

<p class="method-section">Key Operations:</p>

1. Extract pick object from `cfg["objects"][0]`
2. Extract place container from `cfg["objects"][1]`
3. Initialize alignment constraints (`align_pick_obj_axis`, `align_place_obj_axis`)
4. Set up collision filtering paths

</div>

<p class="method-name">simple_generate_manip_cmds(self)</p>
<div class="method-block">

Generate the full placement motion sequence.

<p class="method-section">Steps:</p>

1. **Update planning settings** — Reset cost metrics and collision settings
2. **Generate place trajectory** — Call `sample_gripper_place_traj()` to get pre-place and place poses
3. **Build manip_list** — Construct command sequence:
   - Move to pre-place pose (gripper closed)
   - Move to place pose
   - Open gripper to release object
   - Detach object from gripper (physics)
   - Retreat motion (if `post_place_vector` configured)

</div>

<p class="method-name">sample_gripper_place_traj(self)</p>
<div class="method-block">

Generate pre-place and place poses based on placement direction mode.

<p class="method-section">Returns:</p>

- <span class="param-type">list</span>: `[pre_place_pose, place_pose]` or `[pre_place_pose, place_pose, post_place_pose]`

<p class="method-section">Position Constraint Modes:</p>

- **`"gripper"`**: Target pose controls gripper position directly
- **`"object"`**: Target pose controls pick object position (accounts for object offset from EE)

<p class="method-section">Direction Modes:</p>

See [Placement Direction Modes](#placement-direction-modes) section below.

</div>

<p class="method-name">generate_constrained_rotation_batch(self, batch_size=3000)</p>
<div class="method-block">

Generate valid end-effector orientations through random sampling and filtering.

<p class="method-section">Parameters:</p>

- **batch_size** (<span class="param-type">int</span>): Number of random rotations to sample.

<p class="method-section">Returns:</p>

- <span class="param-type">np.ndarray</span>: Filtered rotation matrices `(N, 3, 3)`.

<p class="method-section">Filtering Logic:</p>

1. Sample random rotation matrices using `scipy.spatial.transform.Rotation`
2. Apply direction filters (`filter_x_dir`, `filter_y_dir`, `filter_z_dir`)
3. Apply object alignment constraints (if configured)
4. Return filtered rotations

For detailed filtering explanation, see [Orientation Filtering](#orientation-filtering).

</div>

<p class="method-name">is_success(self, th=0.0)</p>
<div class="method-block">

Check if the placement succeeded based on configured mode.

<p class="method-section">Parameters:</p>

- **th** (<span class="param-type">float</span>): Threshold for IoU-based success.

<p class="method-section">Returns:</p>

- <span class="param-type">bool</span>: `True` if success conditions are satisfied.

<p class="method-section">Success Modes:</p>

| Mode | Condition |
|------|-----------|
| `3diou` | 3D IoU between pick object and container > threshold |
| `xybbox` | Pick object center within container XY bounds |
| `height` | Pick object below height threshold |
| `left` / `right` | Object positioned left/right of container |
| `flower` | IoU + object center within container bounds |
| `cup` | IoU + object above container base |

</div>

## Placement Direction Modes

### Vertical Placement

Default mode for placing objects on top of containers (e.g., placing items in boxes, on plates).

```yaml
place_direction: "vertical"
```

**Algorithm**:

1. Sample (x, y) position within container top surface using ratio ranges
2. Set z-height to `b_max[2] + pre_place_z_offset` (above container)
3. Lower to `b_max[2] + place_z_offset` (final placement height)

```yaml
x_ratio_range: [0.4, 0.6]      # X position ratio within container bbox
y_ratio_range: [0.4, 0.6]      # Y position ratio within container bbox
pre_place_z_offset: 0.2        # Height above container for approach
place_z_offset: 0.1            # Final placement height offset
```

### Horizontal Placement

For inserting objects into slots, shelves, or openings from the side.

```yaml
place_direction: "horizontal"
align_place_obj_axis: [1, 0, 0]    # Insertion direction
offset_place_obj_axis: [0, 0, 1]    # Offset direction
```

**Algorithm**:

1. Sample position within container bounding box
2. Compute approach position offset along alignment axis
3. Move forward along alignment axis to place position

```yaml
# Position constraint: "object" or "gripper"
position_constraint: "object"

# Approach distances
pre_place_align: 0.2            # Pre-place offset along alignment axis
pre_place_offset: 0.2           # Pre-place offset along offset axis
place_align: 0.1                # Place offset along alignment axis
place_offset: 0.1               # Place offset along offset axis
```

## Orientation Filtering

The place skill uses the same **direction-based filtering strategy** as the pick skill. See [Pick Skill - Grasp Orientation Filtering](/concepts/skills/pick/#grasp-orientation-filtering) for detailed explanation.

### Filter Parameters

| Parameter | Description |
|-----------|-------------|
| `filter_x_dir` | Filter based on EE's X-axis direction in arm base frame |
| `filter_y_dir` | Filter based on EE's Y-axis direction in arm base frame |
| `filter_z_dir` | Filter based on EE's Z-axis direction in arm base frame |

**Format**: `[direction, angle]` or `[direction, angle_min, angle_max]`

### Direction Mapping

| Direction | Condition |
|-----------|-----------|
| `forward` | EE axis dot arm_base_X ≥ cos(angle) |
| `backward` | EE axis dot arm_base_X ≤ cos(angle) |
| `leftward` | EE axis dot arm_base_Y ≥ cos(angle) |
| `rightward` | EE axis dot arm_base_Y ≤ cos(angle) |
| `upward` | EE axis dot arm_base_Z ≥ cos(angle) |
| `downward` | EE axis dot arm_base_Z ≤ cos(angle) |

### Object Alignment Constraint

Additional constraint to align pick object axis with place container axis:

```yaml
align_pick_obj_axis: [0, 0, 1]      # Axis on pick object (e.g., height axis)
align_place_obj_axis: [0, 0, 1]      # Target axis on place container
align_obj_tol: 15                     # Alignment tolerance (degrees)
```

This ensures that a specific axis on the held object (e.g., bottle height) aligns with a target axis on the container (e.g., cup opening direction).

## Design Philosophy

<div class="custom-important">
<p class="custom-important-title">Note</p>
<p class="custom-important-content">

**Random Generation + Filter**: The place skill uses a random generation and filtering strategy rather than delicate construction. This approach is chosen for three key reasons:

1. **Intuitive Position Control**: Specifying place position based on target EE activity direction and object bounding box range is intuitive and easy to configure.

2. **Simple Rotation Sampling**: Randomly generating 3x3 rotation matrices and filtering them is computationally simple. With sufficient samples, valid orientations that pass planning constraints are always found.

3. **Container Diversity**: Different place containers have varying volumes, shapes, and opening directions. Delicate construction of place poses for each container type is difficult. The filtering approach is general and adaptable.

</p>
</div>

## Configuration Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `objects` | `list` | required | `[pick_object, place_container]` |
| `place_part_prim_path` | `string` | `None` | Sub-path within place container prim |
| `place_direction` | `string` | `"vertical"` | `"vertical"` or `"horizontal"` |
| `position_constraint` | `string` | `"gripper"` | `"gripper"` or `"object"` |
| `pre_place_z_offset` | `float` | `0.2` | Approach height above container |
| `place_z_offset` | `float` | `0.1` | Final placement height |
| `x_ratio_range` | `[float, float]` | `[0.4, 0.6]` | X-position sampling range |
| `y_ratio_range` | `[float, float]` | `[0.4, 0.6]` | Y-position sampling range |
| `z_ratio_range` | `[float, float]` | `[0.4, 0.6]` | Z-position sampling range (horizontal) |
| `align_place_obj_axis` | `[float, float, float]` | `None` | Insertion axis on place container (horizontal) |
| `offset_place_obj_axis` | `[float, float, float]` | `None` | Offset axis on place container (horizontal) |
| `pre_place_align` | `float` | `0.2` | Pre-place offset along alignment axis |
| `pre_place_offset` | `float` | `0.2` | Pre-place offset along offset axis |
| `place_align` | `float` | `0.1` | Place offset along alignment axis |
| `place_offset` | `float` | `0.1` | Place offset along offset axis |
| `filter_x_dir` | `list` | `None` | EE X-axis direction filter |
| `filter_y_dir` | `list` | `None` | EE Y-axis direction filter |
| `filter_z_dir` | `list` | `None` | EE Z-axis direction filter |
| `align_pick_obj_axis` | `[float, float, float]` | `None` | Axis on pick object to align |
| `align_place_obj_axis` | `[float, float, float]` | `None` | Target axis on place container |
| `align_obj_tol` | `float` | `None` | Alignment tolerance (degrees) |
| `align_plane_x_axis` | `[float, float, float]` | `None` | X-axis alignment plane |
| `align_plane_y_axis` | `[float, float, float]` | `None` | Y-axis alignment plane |
| `pre_place_hold_vec_weight` | `list` | `None` | Hold vector weight at pre-place |
| `post_place_hold_vec_weight` | `list` | `None` | Hold vector weight at place |
| `gripper_change_steps` | `int` | `10` | Steps for gripper open action |
| `hesitate_steps` | `int` | `0` | Pause steps before release |
| `post_place_vector` | `[float, float, float]` | `None` | Retreat direction after placement |
| `ignore_substring` | `list` | `[]` | Collision filter substrings |
| `test_mode` | `string` | `"forward"` | Motion test mode: `"forward"` or `"ik"` |
| `t_eps` | `float` | `1e-3` | Translation tolerance (meters) |
| `o_eps` | `float` | `5e-3` | Orientation tolerance (radians) |
| `success_mode` | `string` | `"3diou"` | Success evaluation mode |
| `success_th` | `float` | `0.0` | IoU threshold for success |
| `threshold` | `float` | `0.03` | Distance threshold for left/right modes |

## Example Configuration

### Vertical Place on Container

```yaml
skills:
  - lift2:
      - left:
          - name: place
            objects: [pick_object, container]
            place_direction: "vertical"
            x_ratio_range: [0.4, 0.6]
            y_ratio_range: [0.4, 0.6]
            pre_place_z_offset: 0.15
            place_z_offset: 0.05
            filter_z_dir: ["downward", 140]
            gripper_change_steps: 10
            success_mode: "xybbox"
```

### Horizontal Insertion

```yaml
skills:
  - franka:
      - left:
          - name: place
            objects: [peg, hole]
            place_direction: "horizontal"
            position_constraint: "object"
            align_place_obj_axis: [1, 0, 0]
            offset_place_obj_axis: [0, 0, 1]
            pre_place_align: 0.15
            place_align: 0.02
            filter_x_dir: ["forward", 30]
            success_mode: "3diou"
```

### Place with Retreat

```yaml
skills:
  - split_aloha:
      - left:
          - name: place
            objects: [item, shelf]
            place_direction: "vertical"
            post_place_vector: [-0.05, 0.0, 0.1]
            gripper_change_steps: 15
```
