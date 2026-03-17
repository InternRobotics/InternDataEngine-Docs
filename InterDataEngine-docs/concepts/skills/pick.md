---
title: Pick Skill
description: Standard pick operation for grasping objects
---

# Pick Skill

The `Pick` skill performs a standard pick operation with grasp pose selection. It loads pre-annotated grasp poses from `.npy` files, filters them based on orientation constraints, and executes the pick motion.

```python
# Source workflows/simbox/core/skills/pick.py
import os
import random
from copy import deepcopy

import numpy as np
from core.skills.base_skill import BaseSkill, register_skill
from core.utils.constants import CUROBO_BATCH_SIZE
from core.utils.plan_utils import (
    select_index_by_priority_dual,
    select_index_by_priority_single,
)
from core.utils.transformation_utils import poses_from_tf_matrices
from omegaconf import DictConfig
from omni.isaac.core.controllers import BaseController
from omni.isaac.core.robots.robot import Robot
from omni.isaac.core.tasks import BaseTask
from omni.isaac.core.utils.prims import get_prim_at_path
from omni.isaac.core.utils.transformations import (
    get_relative_transform,
    tf_matrix_from_pose,
)

@register_skill
class Pick(BaseSkill):
    def __init__(self, robot: Robot, controller: BaseController, task: BaseTask, cfg: DictConfig, *args, **kwargs):
        super().__init__()
        self.robot = robot
        self.controller = controller
        self.task = task
        self.skill_cfg = cfg
        object_name = self.skill_cfg["objects"][0]
        self.pick_obj = task.objects[object_name]

        # Get grasp annotation
        usd_path = [obj["path"] for obj in task.cfg["objects"] if obj["name"] == object_name][0]
        usd_path = os.path.join(self.task.asset_root, usd_path)
        grasp_pose_path = usd_path.replace(
            "Aligned_obj.usd", self.skill_cfg.get("npy_name", "Aligned_grasp_sparse.npy")
        )
        sparse_grasp_poses = np.load(grasp_pose_path)
        lr_arm = "right" if "right" in self.controller.robot_file else "left"
        self.T_obj_ee, self.scores = self.robot.pose_post_process_fn(
            sparse_grasp_poses,
            lr_arm=lr_arm,
            grasp_scale=self.skill_cfg.get("grasp_scale", 1),
            tcp_offset=self.skill_cfg.get("tcp_offset", self.robot.tcp_offset),
            constraints=self.skill_cfg.get("constraints", None),
        )

        # Keyposes should be generated after previous skill is done
        self.manip_list = []
        self.pickcontact_view = task.pickcontact_views[robot.name][lr_arm][object_name]
        self.process_valid = True
        self.obj_init_trans = deepcopy(self.pick_obj.get_local_pose()[0])
        final_gripper_state = self.skill_cfg.get("final_gripper_state", -1)
        if final_gripper_state == 1:
            self.gripper_cmd = "open_gripper"
        elif final_gripper_state == -1:
            self.gripper_cmd = "close_gripper"
        else:
            raise ValueError(f"final_gripper_state must be 1 or -1, got {final_gripper_state}")
        self.fixed_orientation = self.skill_cfg.get("fixed_orientation", None)
        if self.fixed_orientation is not None:
            self.fixed_orientation = np.array(self.fixed_orientation)

    def simple_generate_manip_cmds(self):
        manip_list = []

        # Update
        p_base_ee_cur, q_base_ee_cur = self.controller.get_ee_pose()
        cmd = (p_base_ee_cur, q_base_ee_cur, "update_pose_cost_metric", {"hold_vec_weight": None})
        manip_list.append(cmd)

        ignore_substring = deepcopy(self.controller.ignore_substring + self.skill_cfg.get("ignore_substring", []))
        ignore_substring.append(self.pick_obj.name)
        cmd = (
            p_base_ee_cur,
            q_base_ee_cur,
            "update_specific",
            {"ignore_substring": ignore_substring, "reference_prim_path": self.controller.reference_prim_path},
        )
        manip_list.append(cmd)

        # Pre grasp
        T_base_ee_grasps = self.sample_ee_pose()  # (N, 4, 4)
        T_base_ee_pregrasps = deepcopy(T_base_ee_grasps)
        self.controller.update_specific(
            ignore_substring=ignore_substring, reference_prim_path=self.controller.reference_prim_path
        )

        if "r5a" in self.controller.robot_file:
            T_base_ee_pregrasps[:, :3, 3] -= T_base_ee_pregrasps[:, :3, 0] * self.skill_cfg.get("pre_grasp_offset", 0.1)
        else:
            T_base_ee_pregrasps[:, :3, 3] -= T_base_ee_pregrasps[:, :3, 2] * self.skill_cfg.get("pre_grasp_offset", 0.1)

        p_base_ee_pregrasps, q_base_ee_pregrasps = poses_from_tf_matrices(T_base_ee_pregrasps)
        p_base_ee_grasps, q_base_ee_grasps = poses_from_tf_matrices(T_base_ee_grasps)

        if self.controller.use_batch:
            # Check if the input arrays are exactly the same
            if np.array_equal(p_base_ee_pregrasps, p_base_ee_grasps) and np.array_equal(
                q_base_ee_pregrasps, q_base_ee_grasps
            ):
                # Inputs are identical, compute only once to avoid redundant computation
                result = self.controller.test_batch_forward(p_base_ee_grasps, q_base_ee_grasps)
                index = select_index_by_priority_single(result)
            else:
                # Inputs are different, compute separately
                pre_result = self.controller.test_batch_forward(p_base_ee_pregrasps, q_base_ee_pregrasps)
                result = self.controller.test_batch_forward(p_base_ee_grasps, q_base_ee_grasps)
                index = select_index_by_priority_dual(pre_result, result)
        else:
            for index in range(T_base_ee_grasps.shape[0]):
                p_base_ee_pregrasp, q_base_ee_pregrasp = p_base_ee_pregrasps[index], q_base_ee_pregrasps[index]
                p_base_ee_grasp, q_base_ee_grasp = p_base_ee_grasps[index], q_base_ee_grasps[index]
                test_mode = self.skill_cfg.get("test_mode", "forward")
                if test_mode == "forward":
                    result_pre = self.controller.test_single_forward(p_base_ee_pregrasp, q_base_ee_pregrasp)
                elif test_mode == "ik":
                    result_pre = self.controller.test_single_ik(p_base_ee_pregrasp, q_base_ee_pregrasp)
                else:
                    raise NotImplementedError
                if self.skill_cfg.get("pre_grasp_offset", 0.1) > 0:
                    if test_mode == "forward":
                        result = self.controller.test_single_forward(p_base_ee_grasp, q_base_ee_grasp)
                    elif test_mode == "ik":
                        result = self.controller.test_single_ik(p_base_ee_grasp, q_base_ee_grasp)
                    else:
                        raise NotImplementedError
                    if result == 1 and result_pre == 1:
                        print("pick plan success")
                        break
                else:
                    if result_pre == 1:
                        print("pick plan success")
                        break

        if self.fixed_orientation is not None:
            q_base_ee_pregrasps[index] = self.fixed_orientation
            q_base_ee_grasps[index] = self.fixed_orientation

        # Pre-grasp
        cmd = (p_base_ee_pregrasps[index], q_base_ee_pregrasps[index], "open_gripper", {})
        manip_list.append(cmd)
        if self.skill_cfg.get("pre_grasp_hold_vec_weight", None) is not None:
            cmd = (
                p_base_ee_pregrasps[index],
                q_base_ee_pregrasps[index],
                "update_pose_cost_metric",
                {"hold_vec_weight": self.skill_cfg.get("pre_grasp_hold_vec_weight", None)},
            )
            manip_list.append(cmd)

        # Grasp
        cmd = (p_base_ee_grasps[index], q_base_ee_grasps[index], "open_gripper", {})
        manip_list.append(cmd)
        cmd = (p_base_ee_grasps[index], q_base_ee_grasps[index], self.gripper_cmd, {})
        manip_list.extend(
            [cmd] * self.skill_cfg.get("gripper_change_steps", 40)
        )  # Default we use 40 steps to make sure the gripper is fully closed
        ignore_substring = deepcopy(self.controller.ignore_substring + self.skill_cfg.get("ignore_substring", []))
        cmd = (
            p_base_ee_grasps[index],
            q_base_ee_grasps[index],
            "update_specific",
            {"ignore_substring": ignore_substring, "reference_prim_path": self.controller.reference_prim_path},
        )
        manip_list.append(cmd)
        cmd = (
            p_base_ee_grasps[index],
            q_base_ee_grasps[index],
            "attach_obj",
            {"obj_prim_path": self.pick_obj.mesh_prim_path},
        )
        manip_list.append(cmd)

        # Post-grasp
        post_grasp_offset = np.random.uniform(
            self.skill_cfg.get("post_grasp_offset_min", 0.05), self.skill_cfg.get("post_grasp_offset_max", 0.05)
        )
        if post_grasp_offset:
            p_base_ee_postgrasps = deepcopy(p_base_ee_grasps)
            p_base_ee_postgrasps[index][2] += post_grasp_offset
            cmd = (p_base_ee_postgrasps[index], q_base_ee_grasps[index], self.gripper_cmd, {})
            manip_list.append(cmd)

        # Whether return to pre-grasp
        if self.skill_cfg.get("return_to_pregrasp", False):
            cmd = (p_base_ee_pregrasps[index], q_base_ee_pregrasps[index], self.gripper_cmd, {})
            manip_list.append(cmd)

        self.manip_list = manip_list

    def sample_ee_pose(self, max_length=CUROBO_BATCH_SIZE):
        T_base_ee = self.get_ee_poses("armbase")

        num_pose = T_base_ee.shape[0]
        flags = {
            "x": np.ones(num_pose, dtype=bool),
            "y": np.ones(num_pose, dtype=bool),
            "z": np.ones(num_pose, dtype=bool),
            "direction_to_obj": np.ones(num_pose, dtype=bool),
        }
        filter_conditions = {
            "x": {
                "forward": (0, 0, 1),  # (row, col, direction)
                "backward": (0, 0, -1),
                "upward": (2, 0, 1),
                "downward": (2, 0, -1),
            },
            "y": {"forward": (0, 1, 1), "backward": (0, 1, -1), "downward": (2, 1, -1), "upward": (2, 1, 1)},
            "z": {"forward": (0, 2, 1), "backward": (0, 2, -1), "downward": (2, 2, -1), "upward": (2, 2, 1)},
        }
        for axis in ["x", "y", "z"]:
            filter_list = self.skill_cfg.get(f"filter_{axis}_dir", None)
            if filter_list is not None:
                # direction, value = filter_list
                direction = filter_list[0]
                row, col, sign = filter_conditions[axis][direction]
                if len(filter_list) == 2:
                    value = filter_list[1]
                    cos_val = np.cos(np.deg2rad(value))
                    flags[axis] = T_base_ee[:, row, col] >= cos_val if sign > 0 else T_base_ee[:, row, col] <= cos_val
                elif len(filter_list) == 3:
                    value1, value2 = filter_list[1:]
                    cos_val1 = np.cos(np.deg2rad(value1))
                    cos_val2 = np.cos(np.deg2rad(value2))
                    if sign > 0:
                        flags[axis] = np.logical_and(
                            T_base_ee[:, row, col] >= cos_val1, T_base_ee[:, row, col] <= cos_val2
                        )
                    else:
                        flags[axis] = np.logical_and(
                            T_base_ee[:, row, col] <= cos_val1, T_base_ee[:, row, col] >= cos_val2
                        )
        if self.skill_cfg.get("direction_to_obj", None) is not None:
            direction_to_obj = self.skill_cfg["direction_to_obj"]
            T_world_obj = tf_matrix_from_pose(*self.pick_obj.get_local_pose())
            T_base_world = get_relative_transform(
                get_prim_at_path(self.task.root_prim_path), get_prim_at_path(self.controller.reference_prim_path)
            )
            T_base_obj = T_base_world @ T_world_obj
            if direction_to_obj == "right":
                flags["direction_to_obj"] = T_base_ee[:, 1, 3] <= T_base_obj[1, 3]
            elif direction_to_obj == "left":
                flags["direction_to_obj"] = T_base_ee[:, 1, 3] > T_base_obj[1, 3]
            else:
                raise NotImplementedError

        combined_flag = np.logical_and.reduce(list(flags.values()))
        if sum(combined_flag) == 0:
            # idx_list = [i for i in range(max_length)]
            idx_list = list(range(max_length))
        else:
            tmp_scores = self.scores[combined_flag]
            tmp_idxs = np.arange(num_pose)[combined_flag]
            combined = list(zip(tmp_scores, tmp_idxs))
            combined.sort()
            idx_list = [idx for (score, idx) in combined[:max_length]]
            score_list = self.scores[idx_list]
            weights = 1.0 / (score_list + 1e-8)
            weights = weights / weights.sum()

            sampled_idx = random.choices(idx_list, weights=weights, k=max_length)
            sampled_scores = self.scores[sampled_idx]

            # Sort indices by their scores (ascending)
            sorted_pairs = sorted(zip(sampled_scores, sampled_idx))
            idx_list = [idx for _, idx in sorted_pairs]

        print(self.scores[idx_list])
        # print((T_base_ee[idx_list])[:, 0, 1])
        return T_base_ee[idx_list]

    def get_ee_poses(self, frame: str = "world"):
        # get grasp poses at specific frame
        if frame not in ["world", "body", "armbase"]:
            raise ValueError(
                f"poses in {frame} frame is not supported: accepted values are [world, body, armbase] only"
            )

        if frame == "body":
            return self.T_obj_ee

        T_world_obj = tf_matrix_from_pose(*self.pick_obj.get_local_pose())
        T_world_ee = T_world_obj[None] @ self.T_obj_ee

        if frame == "world":
            return T_world_ee

        if frame == "armbase":  # arm base frame
            T_world_base = get_relative_transform(
                get_prim_at_path(self.controller.reference_prim_path), get_prim_at_path(self.task.root_prim_path)
            )
            T_base_world = np.linalg.inv(T_world_base)
            T_base_ee = T_base_world[None] @ T_world_ee
            return T_base_ee

    def get_contact(self, contact_threshold=0.0):
        contact = np.abs(self.pickcontact_view.get_contact_force_matrix()).squeeze()
        contact = np.sum(contact, axis=-1)
        indices = np.where(contact > contact_threshold)[0]
        return contact, indices

    def is_feasible(self, th=5):
        return self.controller.num_plan_failed <= th

    def is_subtask_done(self, t_eps=1e-3, o_eps=5e-3):
        assert len(self.manip_list) != 0
        p_base_ee_cur, q_base_ee_cur = self.controller.get_ee_pose()
        p_base_ee, q_base_ee, *_ = self.manip_list[0]
        diff_trans = np.linalg.norm(p_base_ee_cur - p_base_ee)
        diff_ori = 2 * np.arccos(min(abs(np.dot(q_base_ee_cur, q_base_ee)), 1.0))
        pose_flag = np.logical_and(
            diff_trans < t_eps,
            diff_ori < o_eps,
        )
        self.plan_flag = self.controller.num_last_cmd > 10
        return np.logical_or(pose_flag, self.plan_flag)

    def is_done(self):
        if len(self.manip_list) == 0:
            return True
        if self.is_subtask_done(t_eps=self.skill_cfg.get("t_eps", 1e-3), o_eps=self.skill_cfg.get("o_eps", 5e-3)):
            self.manip_list.pop(0)
        return len(self.manip_list) == 0

    def is_success(self):
        flag = True

        _, indices = self.get_contact()
        if self.gripper_cmd == "close_gripper":
            flag = len(indices) >= 1

        if self.skill_cfg.get("process_valid", True):
            self.process_valid = np.max(np.abs(self.robot.get_joints_state().velocities)) < 5 and (
                np.max(np.abs(self.pick_obj.get_linear_velocity())) < 5
            )
        flag = flag and self.process_valid

        if self.skill_cfg.get("lift_th", 0.0) > 0.0:
            p_world_obj = deepcopy(self.pick_obj.get_local_pose()[0])
            flag = flag and ((p_world_obj[2] - self.obj_init_trans[2]) > self.skill_cfg.get("lift_th", 0.0))

        return flag
```

<p class="method-name">__init__(self, robot, controller, task, cfg, *args, **kwargs)</p>
<div class="method-block">

Initialize the pick skill and load grasp annotations.

<p class="method-section">Parameters:</p>

- **robot** (<span class="param-type">Robot</span>): Robot instance for state queries and actions.
- **controller** (<span class="param-type">BaseController</span>): Controller for motion planning.
- **task** (<span class="param-type">BaseTask</span>): Task instance containing scene objects.
- **cfg** (<span class="param-type">DictConfig</span>): Skill configuration from task YAML.

<p class="method-section">Key Operations:</p>

1. Extract target object name from `cfg["objects"][0]`
2. Load sparse grasp poses from `Aligned_grasp_sparse.npy`
3. Transform grasp poses to EE frame via `robot.pose_post_process_fn()`
4. Initialize `manip_list` for command sequence

</div>

<p class="method-name">simple_generate_manip_cmds(self)</p>
<div class="method-block">

Generate the full pick motion sequence. This is the core method that defines the pick behavior.

<p class="method-section">Steps:</p>

1. **Update planning settings** — Reset cost metrics and collision settings
2. **Sample EE poses** — Call `sample_ee_pose()` to filter valid grasp candidates
3. **Generate pre-grasp poses** — Offset grasp poses along approach direction
4. **Test motion feasibility** — Use CuRobo to check which candidates are reachable
5. **Build manip_list** — Construct command sequence:
   - Move to pre-grasp pose with open gripper
   - Move to grasp pose
   - Close gripper
   - Attach object to gripper (physics)
   - Lift object (post-grasp offset)

</div>

<p class="method-name">sample_ee_pose(self, max_length=CUROBO_BATCH_SIZE)</p>
<div class="method-block">

Filter grasp poses based on end-effector orientation constraints.

<p class="method-section">Parameters:</p>

- **max_length** (<span class="param-type">int</span>): Maximum number of poses to return.

<p class="method-section">Returns:</p>

- <span class="param-type">np.ndarray</span>: Filtered grasp poses as transformation matrices `(N, 4, 4)`.

<p class="method-section">Filtering Logic:</p>

1. Transform all candidate grasp poses to arm base frame
2. Apply `filter_x_dir`, `filter_y_dir`, `filter_z_dir` constraints
3. Sort remaining poses by grasp quality score
4. Sample top candidates weighted by inverse score

</div>

<p class="method-name">is_success(self)</p>
<div class="method-block">

Check if the pick operation succeeded.

<p class="method-section">Success Conditions:</p>

1. **Contact check**: Gripper is in contact with at least one object (when closing gripper)
2. **Motion validity**: Joint velocities < 5 rad/s, object velocity < 5 m/s
3. **Lift check** (optional): Object lifted above initial height by `lift_th` threshold

<p class="method-section">Returns:</p>

- <span class="param-type">bool</span>: `True` if all conditions are satisfied.

</div>

## Grasp Orientation Filtering

The pick skill uses a **direction-based filtering strategy** to select valid grasp poses. Instead of constructing specific poses, we filter pre-annotated grasp candidates based on the desired end-effector orientation.

### Coordinate System

All arm base frames follow this convention:

- **X-axis**: Forward (toward the table/workspace)
- **Y-axis**: Right (when facing the table)
- **Z-axis**: Upward

**Arm Base Frame Examples:**

| Franka | ARX Lift-2 | Agilex Split Aloha |
|--------|-------|-------------|
| ![Franka Arm Base](/arm_base/franka.jpg) | ![Lift2 Arm Base](/arm_base/lift2.jpg) | ![Split-ALOHA Arm Base](/arm_base/split_aloha.jpg) |

The end-effector frame has its own local X, Y, Z axes. The filter constraints control how these EE axes align with the arm base frame.

### Filter Parameters

| Parameter | Description |
|-----------|-------------|
| `filter_x_dir` | Filter based on EE's X-axis direction in arm base frame |
| `filter_y_dir` | Filter based on EE's Y-axis direction in arm base frame |
| `filter_z_dir` | Filter based on EE's Z-axis direction in arm base frame |

**Format**: `[direction, angle]` or `[direction, angle_min, angle_max]`

- **direction**: Target direction (`"forward"`, `"backward"`, `"upward"`, `"downward"`)
- **angle**: Minimum angle (degrees) between EE axis and arm base's positive direction

### Direction Mapping

| Direction | Condition |
|-----------|-----------|
| `forward` | EE axis dot arm_base_X ≥ cos(angle) |
| `backward` | EE axis dot arm_base_X ≤ cos(angle) |
| `upward` | EE axis dot arm_base_Z ≥ cos(angle) |
| `downward` | EE axis dot arm_base_Z ≤ cos(angle) |

**Positive sign**: Use `≥ cos(angle)` when direction is positive (forward/upward)

**Negative sign**: Use `≤ cos(angle)` when direction is negative (backward/downward)


## Examples

### Example 1: Franka Research 3

Config Example:

```yaml
# Source: workflows/simbox/core/configs/tasks/pick_and_place/franka/single_pick/omniobject3d-banana.yaml
skills:
  - franka:
      - left:
          - name: pick
            objects: [pick_object_left]
            filter_x_dir: ["forward", 90]
            filter_z_dir: ["downward", 140]
```
Figure Example:
![Franka Pick Visualization](/pick/franka_pick_vis.jpg)

**Analysis**:

For Franka, the gripper's approach direction (toward fingers) is the **Z-axis** of the end-effector frame.

- **`filter_z_dir: ["downward", 140]`**: We want the gripper to approach **vertically downward**. The EE's Z-axis should form an angle ≥ 140° with the arm base's Z-axis (upward). Since 140° > 90°, the EE's Z-axis points downward.

- **`filter_x_dir: ["forward", 90]`**: We want the gripper to face **forward** (no reverse grasping). The EE's X-axis should form an angle ≤ 90° with the arm base's X-axis (forward), ensuring the gripper doesn't rotate backward.

Result: Gripper approaches from above with fingers pointing down, facing forward.

---

### Example 2: Agilex Split Aloha with Piper-100 arm

Config Example:

```yaml
# Source: workflows/simbox/core/configs/tasks/pick_and_place/split_aloha/single_pick/left/omniobject3d-banana.yaml
skills:
  - split_aloha:
      - left:
          - name: pick
            objects: [pick_object_left]
            filter_y_dir: ["forward", 90]
            filter_z_dir: ["downward", 140]
```
Figure Example:
![Piper Pick Visualization](/pick/piper_pick_vis.jpg)

**Analysis**:

For Agilex Split Aloha's left arm, the gripper approach direction is still the **Z-axis**, but the forward-facing direction is the **Y-axis**.

- **`filter_z_dir: ["downward", 140]`**: Same as Franka — gripper approaches vertically **downward**.

- **`filter_y_dir: ["forward", 90]`**: The EE's Y-axis should form an angle ≤ 90° with the arm base's X-axis (forward). This ensures the gripper faces **forward**.

Result: Same grasp orientation as Franka, but using Y-axis for forward direction control.

---

### Example 3: ARX Lift-2 with R5a arm

Config Example:

```yaml
# Source: workflows/simbox/core/configs/tasks/pick_and_place/lift2/single_pick/left/omniobject3d-banana.yaml
skills:
  - lift2:
      - left:
          - name: pick
            objects: [pick_object_left]
            filter_z_dir: ["forward", 90]
            filter_x_dir: ["downward", 140]
```
Figure Example:
![R5A Pick Visualization](/pick/r5a_pick_vis.jpg)

**Analysis**:

For Lift2 with R5A gripper, the approach direction (toward fingers) is the **X-axis** of the end-effector frame.

- **`filter_x_dir: ["downward", 140]`**: The EE's X-axis (approach direction) should form an angle ≥ 140° with the arm base's Z-axis, meaning the gripper approaches **downward**.

- **`filter_z_dir: ["forward", 90]`**: The EE's Z-axis (gripper facing direction) should form an angle ≤ 90° with the arm base's X-axis (forward), ensuring the gripper faces **forward**.

Result: Gripper approaches from above, facing forward — same physical outcome as Franka, but using different axes.

## Design Philosophy

<div class="custom-important">
<p class="custom-important-title">Note</p>
<p class="custom-important-content">

**Filtering vs. Construction**: We use a filtering strategy rather than constructing specific grasp poses. This approach:

1. **Leverages existing annotations**: Pre-computed grasp poses from `Aligned_grasp_sparse.npy` already contain valid grasp configurations.

2. **Aligns with human intuition**: Specifying "gripper should approach downward and face forward" is more intuitive than computing exact rotation matrices.

3. **Provides flexibility**: Different robots with different EE frame conventions can achieve the same physical grasp by filtering different axes.

4. **Maintains diversity**: Multiple valid grasp poses remain after filtering, allowing the planner to select based on reachability and collision constraints.

</p>
</div>

## Configuration Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `objects` | `list` | required | Target object names |
| `npy_name` | `string` | `"Aligned_grasp_sparse.npy"` | Grasp annotation file name |
| `grasp_scale` | `float` | `1` | Scale factor for grasp poses |
| `tcp_offset` | `float` | `robot.tcp_offset` | TCP offset override |
| `constraints` | `dict` | `None` | Additional grasp constraints |
| `final_gripper_state` | `int` | `-1` | Gripper state after pick: `1` (open) or `-1` (close) |
| `fixed_orientation` | `list` | `None` | Fixed quaternion `[w, x, y, z]` if specified |
| `filter_x_dir` | `list` | `None` | EE X-axis filter: `[direction, angle]` |
| `filter_y_dir` | `list` | `None` | EE Y-axis filter: `[direction, angle]` |
| `filter_z_dir` | `list` | `None` | EE Z-axis filter: `[direction, angle]` |
| `direction_to_obj` | `string` | `None` | Filter by object position: `"left"` or `"right"` |
| `pre_grasp_offset` | `float` | `0.1` | Distance to offset before grasp (meters) |
| `pre_grasp_hold_vec_weight` | `list` | `None` | Hold vector weight at pre-grasp |
| `gripper_change_steps` | `int` | `40` | Steps to close gripper |
| `post_grasp_offset_min` | `float` | `0.05` | Minimum lift distance (meters) |
| `post_grasp_offset_max` | `float` | `0.05` | Maximum lift distance (meters) |
| `return_to_pregrasp` | `bool` | `False` | Return to pre-grasp pose after lift |
| `lift_th` | `float` | `0.0` | Lift threshold for success check (meters) |
| `ignore_substring` | `list` | `[]` | Collision filter substrings |
| `test_mode` | `string` | `"forward"` | Motion test mode: `"forward"` or `"ik"` |
| `t_eps` | `float` | `1e-3` | Translation tolerance (meters) |
| `o_eps` | `float` | `5e-3` | Orientation tolerance (radians) |
| `process_valid` | `bool` | `True` | Check motion validity for success |
