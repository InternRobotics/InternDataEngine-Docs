---
title: Robots
description: Supported robot platforms in InternDataEngine
---

# Robots

InternDataEngine supports multiple robot platforms for manipulation tasks. Each robot has a dedicated wrapper class for articulation control and state management.

## Supported Robots

| Robot | Type | DOF | Gripper (DOF) | Arm Model |
|-------|------|-----|---------------|-----------|
| **ARX Lift-2** | Dual-arm | 6+6 | Parallel (2) | R5a |
| **Agilex Split Aloha** | Dual-arm | 6+6 | Parallel (2) | Piper-100 |
| **Genie-1** | Dual-arm | 7+7 | Parallel (2) | G1-120s |
| **Franka FR3** | Single-arm | 7 | Panda (1) | Franka |
| **Franka Robotiq85** | Single-arm | 7 | Robotiq 2F-85 (2) | Franka |

### Robot End Effector and TCP Frame Visualizations

<details>
<summary>FR3 (Single-arm, Franka Panda Gripper)</summary>

<p align="center">
  <a href="/franka/ee_head_vis.png" target="_blank">
    <img src="/franka/ee_head_vis.png" alt="FR3 EE Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>FR3 end-effector head frame visualization</em></p>

<p align="center">
  <a href="/franka/tcp_head_vis.png" target="_blank">
    <img src="/franka/tcp_head_vis.png" alt="FR3 TCP Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>FR3 TCP (Tool Center Point) head frame visualization</em></p>

<p align="center">
  <a href="/franka/tcp_hand_vis.png" target="_blank">
    <img src="/franka/tcp_hand_vis.png" alt="FR3 TCP Hand" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>FR3 TCP hand frame visualization</em></p>

</details>

<details>
<summary>Franka Robotiq85 (Single-arm, Robotiq 2F-85 Gripper)</summary>

<p align="center">
  <a href="/frankarobotiq/ee_head_vis.png" target="_blank">
    <img src="/frankarobotiq/ee_head_vis.png" alt="Franka Robotiq85 EE Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Franka Robotiq85 end-effector head frame visualization</em></p>

<p align="center">
  <a href="/frankarobotiq/tcp_head_vis.png" target="_blank">
    <img src="/frankarobotiq/tcp_head_vis.png" alt="Franka Robotiq85 TCP Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Franka Robotiq85 TCP (Tool Center Point) head frame visualization</em></p>

<p align="center">
  <a href="/frankarobotiq/tcp_hand_vis.png" target="_blank">
    <img src="/frankarobotiq/tcp_hand_vis.png" alt="Franka Robotiq85 TCP Hand" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Franka Robotiq85 TCP hand frame visualization</em></p>

</details>

<details>
<summary>Genie-1 (Dual-arm, G1-120s)</summary>

<p align="center">
  <a href="/genie1/leftee_head_left_vis.png" target="_blank">
    <img src="/genie1/leftee_head_left_vis.png" alt="Genie-1 Left EE Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Genie-1 left arm end-effector head frame visualization</em></p>

<p align="center">
  <a href="/genie1/lefttcp_head_vis.png" target="_blank">
    <img src="/genie1/lefttcp_head_vis.png" alt="Genie-1 Left TCP Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Genie-1 left arm TCP head frame visualization</em></p>

<p align="center">
  <a href="/genie1/lefttcp_hand_left_vis.png" target="_blank">
    <img src="/genie1/lefttcp_hand_left_vis.png" alt="Genie-1 Left TCP Hand" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Genie-1 left arm TCP hand frame visualization</em></p>

<p align="center">
  <a href="/genie1/rightee_head_vis.png" target="_blank">
    <img src="/genie1/rightee_head_vis.png" alt="Genie-1 Right EE Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Genie-1 right arm end-effector head frame visualization</em></p>

<p align="center">
  <a href="/genie1/righttcp_head_vis.png" target="_blank">
    <img src="/genie1/righttcp_head_vis.png" alt="Genie-1 Right TCP Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Genie-1 right arm TCP head frame visualization</em></p>

<p align="center">
  <a href="/genie1/righttcp_hand_right_vis.png" target="_blank">
    <img src="/genie1/righttcp_hand_right_vis.png" alt="Genie-1 Right TCP Hand" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Genie-1 right arm TCP hand frame visualization</em></p>

</details>

<details>
<summary>ARX Lift-2 (Dual-arm, R5a)</summary>

<p align="center">
  <a href="/lift2/leftee_head_left_vis.jpeg" target="_blank">
    <img src="/lift2/leftee_head_left_vis.jpeg" alt="Lift-2 Left EE Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Lift-2 left arm end-effector head frame visualization</em></p>

<p align="center">
  <a href="/lift2/lefttcp_head_vis.jpeg" target="_blank">
    <img src="/lift2/lefttcp_head_vis.jpeg" alt="Lift-2 Left TCP Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Lift-2 left arm TCP head frame visualization</em></p>

<p align="center">
  <a href="/lift2/lefttcp_hand_left_vis.jpeg" target="_blank">
    <img src="/lift2/lefttcp_hand_left_vis.jpeg" alt="Lift-2 Left TCP Hand" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Lift-2 left arm TCP hand frame visualization</em></p>

<p align="center">
  <a href="/lift2/rightee_head_vis.jpeg" target="_blank">
    <img src="/lift2/rightee_head_vis.jpeg" alt="Lift-2 Right EE Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Lift-2 right arm end-effector head frame visualization</em></p>

<p align="center">
  <a href="/lift2/righttcp_head_vis.jpeg" target="_blank">
    <img src="/lift2/righttcp_head_vis.jpeg" alt="Lift-2 Right TCP Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Lift-2 right arm TCP head frame visualization</em></p>

<p align="center">
  <a href="/lift2/righttcp_hand_right_vis.jpeg" target="_blank">
    <img src="/lift2/righttcp_hand_right_vis.jpeg" alt="Lift-2 Right TCP Hand" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Lift-2 right arm TCP hand frame visualization</em></p>

</details>

<details>
<summary>Agilex Split Aloha (Dual-arm, Piper-100)</summary>

<p align="center">
  <a href="/split_aloha/rightee_head_vis.png" target="_blank">
    <img src="/split_aloha/rightee_head_vis.png" alt="Split Aloha Right EE Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Split Aloha right arm end-effector head frame visualization</em></p>

<p align="center">
  <a href="/split_aloha/righttcp_head_vis.png" target="_blank">
    <img src="/split_aloha/righttcp_head_vis.png" alt="Split Aloha Right TCP Head" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Split Aloha right arm TCP head frame visualization</em></p>

<p align="center">
  <a href="/split_aloha/righttcp_hand_right_vis.png" target="_blank">
    <img src="/split_aloha/righttcp_hand_right_vis.png" alt="Split Aloha Right TCP Hand" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Split Aloha right arm TCP hand frame visualization</em></p>

</details>

## Robot Configuration

Robot configuration is split into two parts: **task-level configuration** (in task YAML) and **robot-specific parameters** (in separate robot YAML files).

### Part 1: Task-Level Configuration (Task YAML)

Configure robot instance in task YAML files:
```yaml
robots:
  - name: "lift2"                          # Robot identifier
    robot_config_file: workflows/simbox/core/configs/robots/lift2.yaml  # Path to robot-specific config
    euler: [0.0, 0.0, 90.0]                # Initial orientation [roll, pitch, yaw] in degrees
    ignore_substring: ["material", "table", "gso_box"]  # Collision filter substrings
```

### Part 2: Robot-Specific Parameters (Robot YAML)

Define robot hardware parameters in a separate YAML file (e.g., `workflows/simbox/core/configs/robots/lift2.yaml`):

```yaml
# Robot info
target_class: Lift2                        # Python class for robot wrapper
path: "lift2/robot_invisible.usd"          # USD file path relative to asset root

# CuRobo kinematics config files (one per arm for dual-arm robots)
robot_file:
  - workflows/simbox/curobo/src/curobo/content/configs/robot/r5a_left_arm.yml
  - workflows/simbox/curobo/src/curobo/content/configs/robot/r5a_right_arm.yml

# Gripper parameters
gripper_max_width: 0.088                   # Maximum gripper opening width (meters)
gripper_min_width: 0.0                     # Minimum gripper closing width (meters)
tcp_offset: 0.125                          # Tool center point offset from end-effector (meters)

# Solver parameters for physics simulation
solver_position_iteration_count: 128       # Position solver iterations
solver_velocity_iteration_count: 4         # Velocity solver iterations
stabilization_threshold: 0.005             # Stabilization threshold

# Joint indices in articulation
left_joint_indices: [10, 12, 14, 16, 18, 20]   # Left arm joint indices
right_joint_indices: [9, 11, 13, 15, 17, 19]   # Right arm joint indices
left_gripper_indices: [23]                      # Left end-effector (gripper) joint index
right_gripper_indices: [21]                     # Right end-effector (gripper) joint index
lift_indices: [6]                          # Lift joint index

# End-effector paths
fl_ee_path: "lift2/lift2/fl/link6"     # Front-left end-effector prim path
fr_ee_path: "lift2/lift2/fr/link6"     # Front-right end-effector prim path
fl_base_path: "lift2/lift2/fl/base_link"   # Front-left base prim path
fr_base_path: "lift2/lift2/fr/base_link"   # Front-right base prim path

# Gripper keypoints for visualization
fl_gripper_keypoints:
  tool_head: [0.135, 0.0, 0.0, 1]
  tool_tail: [0.085, 0.0, 0.0, 1]
  tool_side: [0.135, -0.044, 0.0, 1]
fr_gripper_keypoints:
  tool_head: [0.135, 0.0, 0.0, 1]
  tool_tail: [0.085, 0.0, 0.0, 1]
  tool_side: [0.135, -0.044, 0.0, 1]

# Collision filter paths
fl_filter_paths:                           # Paths to filter from collision (gripper fingers)
  - "lift2/lift2/fl/link7"
  - "lift2/lift2/fl/link8"
fr_filter_paths:
  - "lift2/lift2/fr/link7"
  - "lift2/lift2/fr/link8"
fl_forbid_collision_paths:                 # Paths forbidden for self-collision
  - "lift2/lift2/fl/link2"
  - "lift2/lift2/fl/link3"
  - "lift2/lift2/fl/link4"
  - "lift2/lift2/fl/link5"
fr_forbid_collision_paths:
  - "lift2/lift2/fr/link2"
  - "lift2/lift2/fr/link3"
  - "lift2/lift2/fr/link4"
  - "lift2/lift2/fr/link5"

# Pose processing parameters
R_ee_graspnet: [[1.0, 0.0, 0.0], [0.0, -1.0, 0.0], [0.0, 0.0, -1.0]]  # Grasp rotation correction
ee_axis: "x"                               # End-effector approach axis (x/y/z)

# Default joint home positions (radians)
left_joint_home: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
right_joint_home: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
left_joint_home_std: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]   # Randomization std for left arm
right_joint_home_std: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]  # Randomization std for right arm
left_gripper_home: [0.044]                 # Left gripper default width (meters)
right_gripper_home: [0.044]                # Right gripper default width (meters)
lift_home: [0.46]                          # Lift joint default position (meters)
```

## Understanding Robot Parameters

### Task-Level Fields

| Field | Description |
|-------|-------------|
| `name` | Robot identifier used in skills and cameras |
| `robot_config_file` | Path to robot-specific YAML configuration file |
| `euler` | Initial robot orientation in degrees [roll, pitch, yaw] |
| `ignore_substring` | Collision filter substrings to ignore during simulation |

### Robot-Specific Fields

Some fields require detailed explanation due to their importance in grasp pose processing and robot kinematics:

<p class="method-name">R_ee_graspnet</p>
<div class="method-block">

A 3×3 rotation matrix that transforms the grasp pose orientation from the pre-defined graspnet frame to the robot's end-effector frame. Our generated grasp pose follows the frame definition from GraspNet.

<p align="center">
  <a href="/graspnet_def.png" target="_blank">
    <img src="/graspnet_def.png" alt="GraspNet Gripper Frame Definition" style="width: 400px; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>GraspNet gripper frame definition (source: graspnetAPI)</em></p>

*Source: [graspnet/graspnetAPI](https://github.com/graspnet/graspnetAPI?tab=readme-ov-file)*

The following examples illustrate how `R_ee_graspnet` is configured for different robots. You can verify these values by comparing the GraspNet frame definition with each robot's end-effector orientation shown in the visualizations above.

Config Example:
```yaml
# FR3
R_ee_graspnet: [[0.0, 0.0, -1.0], [0.0, 1.0, 0.0], [1.0, 0.0, 0.0]]

# Genie-1
R_ee_graspnet: [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]]

# ARX Lift-2
R_ee_graspnet: [[1.0, 0.0, 0.0], [0.0, -1.0, 0.0], [0.0, 0.0, -1.0]]

# Agilex Split Aloha
R_ee_graspnet: [[0.0, -1.0, 0.0], [0.0, 0.0, -1.0], [1.0, 0.0, 0.0]]
```

</div>


<p class="method-name">fl_ee_path / fr_ee_path</p>
<div class="method-block">

The USD prim path to the end-effector link (typically the last link of the arm **<span style="color: red;">before</span>** the TCP).

<div class="custom-warning">
<p class="custom-warning-title">Warning</p>
<p class="custom-warning-content">This link frame has a fixed transformation to the TCP frame. This path should be <strong>aligned with the <code>ee_link</code> in the CuRobo config file</strong>.</p>
</div>

<p class="method-section">Usage:</p>

- Compute the end-effector pose relative to the robot base via `get_relative_transform`
- Define where gripper keypoints are attached
- Serve as the reference frame for TCP (Tool Center Point) calculations

Config Example:
```yaml
# FR3
fl_ee_path: "fr3/panda_hand" # relative to root robot prim path

# Franka Robotiq
fl_ee_path: "arm/panda_link8" 

# Agilex Split Aloha
fl_ee_path: "split_aloha_mid_360_with_piper/split_aloha_mid_360_with_piper/fl/link6"
fr_ee_path: "split_aloha_mid_360_with_piper/split_aloha_mid_360_with_piper/fr/link6"
```

</div>


<p class="method-name">ee_axis</p>
<div class="method-block">

The axis along from end-effector origin to gripper TCP. Valid values are `"x"`, `"y"`, or `"z"`.

<p class="method-section">Usage:</p>

- Used in `pose_post_process_fn` to calculate the actual EE position from TCP
- Affects the 180° rotation variant generation for grasp pose diversity


Config Example:
```yaml
# FR3
ee_axis: "z"

# ARX Lift-2
ee_axis: "x"

# Agilex Split Aloha
ee_axis: "z"
```

</div>


<p class="method-name">tcp_offset</p>
<div class="method-block">

The distance from the end-effector frame origin to the Tool Center Point (TCP). The TCP is the point where the gripper fingertips meet when closed, which is the actual grasping point.

<p class="method-section">Usage:</p>

- During grasp pose processing, the EE position is calculated as: `ee_center = tcp_center + approach_axis * (depth - tcp_offset)`
- This offset accounts for the physical distance between the robot's end-effector frame and the actual grasping point

</div>


<p class="method-name">fl_gripper_keypoints / fr_gripper_keypoints</p>
<div class="method-block">

3D keypoints defined in the end-effector frame for articulated object manipulation planning.

Assume the gripper is oriented upright facing the user. The keypoints are defined as follows:

- **`tool_head`**: The point at the midpoint of the gripper fingertips, along the approach direction.
- **`tool_tail`**: The point at the midpoint of the gripper finger bases, along the same approach direction.
- **`tool_side`**: A point on the side of the right fingertip, used to indicate the gripper width.

<p align="center">
  <a href="/gripper_kps.jpg" target="_blank">
    <img src="/gripper_kps.jpg" alt="Gripper Keypoints Visualization" style="width: 100%; cursor: zoom-in;">
  </a>
</p>
<p align="center"><em>Gripper keypoints visualization showing tool_head, tool_tail, and tool_side</em></p>

Config Example:
```yaml
# ARX Lift-2
fl_gripper_keypoints:
  tool_head: [0.135, 0.0, 0.0, 1]   # Gripper fingertip (approach direction)
  tool_tail: [0.085, 0.0, 0.0, 1]   # Gripper base
  tool_side: [0.135, -0.044, 0.0, 1] # Side point for width visualization
```

</div>


### Other Fields

| Field | Description |
|-------|-------------|
| `target_class` | Python class for robot wrapper (e.g., `Lift2`, `FR3`) |
| `path` | USD file path relative to asset root |
| `robot_file` | CuRobo kinematics config file(s) - one per arm |
| `gripper_max_width` | Maximum gripper opening width (meters) |
| `gripper_min_width` | Minimum gripper closing width (meters) |
| `solver_position_iteration_count` | Physics solver position iterations |
| `solver_velocity_iteration_count` | Physics solver velocity iterations |
| `stabilization_threshold` | Physics stabilization threshold |
| `left_joint_indices` | Joint indices for left arm in articulation |
| `right_joint_indices` | Joint indices for right arm in articulation |
| `left_gripper_indices` | Gripper joint index for left arm |
| `right_gripper_indices` | Gripper joint index for right arm |
| `lift_indices` | Lift joint indices (for robots with lift mechanism) |
| `fl_base_path` | Left arm base prim path |
| `fr_base_path` | Right arm base prim path |
| `fl_filter_paths` | Collision filter prims' paths for left arm |
| `fr_filter_paths` | Collision filter prims' paths for right arm |
| `fl_forbid_collision_paths` | Forbidden collision prims' paths for left arm |
| `fr_forbid_collision_paths` | Forbidden collision prims' paths for right arm |
| `left_joint_home` | Default joint positions for left arm (radians) |
| `right_joint_home` | Default joint positions for right arm (radians) |
| `left_joint_home_std` | Standard deviation for randomizing left arm home position |
| `right_joint_home_std` | Standard deviation for randomizing right arm home position |
| `left_gripper_home` | Default gripper joint value for left gripper (Isaac) |
| `right_gripper_home` | Default gripper joint value for right gripper (Isaac) |
| `lift_home` | Default lift joint position (meters) |


## Robot Wrappers

Robot wrappers (`workflows/simbox/core/robots/`) provide a unified interface for:

- Articulation control
- Gripper interface
- State / observation management
- Grasp pose post-processing

All concrete robots (e.g., `FR3`, `FrankaRobotiq`, `Genie1`, `Lift2`, `SplitAloha`) share the same `TemplateRobot` implementation, with differences configured through YAML files and minimal subclass code.

Template Code Example:
```python
from copy import deepcopy

import numpy as np
from core.robots.base_robot import register_robot
from omni.isaac.core.robots.robot import Robot
from omni.isaac.core.utils.prims import create_prim, get_prim_at_path
from omni.isaac.core.utils.transformations import (
    get_relative_transform,
    tf_matrix_from_pose,
)
from scipy.interpolate import interp1d


@register_robot
class TemplateRobot(Robot):
    """
    Template class for manipulator robots.

    All important parameters should be prepared in cfg before instantiation.
    The cfg is merged from: robot_config_file -> task_config_robots
    """

    def __init__(self, asset_root: str, root_prim_path: str, cfg: dict, *args, **kwargs):
        self.asset_root = asset_root
        self.cfg = cfg

        # Create prim from USD
        usd_path = f"{asset_root}/{cfg['path']}"
        prim_path = f"{root_prim_path}/{cfg['name']}"
        create_prim(usd_path=usd_path, prim_path=prim_path)
        super().__init__(prim_path, cfg["name"], *args, **kwargs)

        self.robot_prim_path = prim_path

        # Gripper parameters (from cfg)
        self.gripper_max_width = cfg["gripper_max_width"]
        self.gripper_min_width = cfg["gripper_min_width"]

        # Solver parameters
        self.set_solver_position_iteration_count(cfg["solver_position_iteration_count"])
        self.set_stabilization_threshold(cfg["stabilization_threshold"])
        self.set_solver_velocity_iteration_count(cfg["solver_velocity_iteration_count"])

        # Setup from config
        self._setup_joint_indices()
        self._setup_paths()
        self._setup_gripper_keypoints()
        self._setup_collision_paths()
        self._load_extra_depth(usd_path)

    def initialize(self, *args, **kwargs):
        super().initialize()
        self._articulation_view.initialize()
        self._setup_joint_velocities()
        self._setup_joint_homes()
        self._set_initial_positions()

    def apply_action(self, joint_positions, joint_indices, *args, **kwargs):
        self._articulation_view.set_joint_position_targets(joint_positions, joint_indices=joint_indices)

    def get_observations(self) -> dict:
        joint_state = self.get_joints_state()
        qpos, qvel = joint_state.positions, joint_state.velocities

        T_base_ee_fl = get_relative_transform(
            get_prim_at_path(self.fl_ee_path), get_prim_at_path(self.fl_base_path)
        )
        T_world_base = tf_matrix_from_pose(*self.get_local_pose())

        obs = self._build_observations(qpos, qvel, T_base_ee_fl, T_world_base)
        return obs

    def pose_post_process_fn(
        self, poses, *args, lr_arm="left", grasp_scale=1, tcp_offset=None, constraints=None, **kwargs
    ):
        if poses.shape[-2:] == (4, 4):
            return poses

        R_ee_graspnet = self._get_R_ee_graspnet()
        n_grasps = poses.shape[0]
        T_obj_tcp = np.repeat(np.eye(4)[np.newaxis, :, :], n_grasps, axis=0)
        R_ee_graspnet = np.array(R_ee_graspnet)
        T_obj_tcp[:, :3, :3] = np.matmul(poses[:, 4:13].reshape(-1, 3, 3), R_ee_graspnet.T)
        T_obj_tcp[:, :3, 3] = poses[:, 13:16] * grasp_scale
        scores = poses[:, 0]
        widths = np.clip(poses[:, 1:2], self.gripper_min_width, self.gripper_max_width)
        depths = poses[:, 3:4]

        if tcp_offset is None:
            tcp_offset = self.tcp_offset

        if self._gripper_ed_func is not None:
            depths = depths + self._gripper_ed_func(widths)

        # ... see full implementation in workflows/simbox/core/robots/template_robot.py
```

<p class="method-name">__init__(self, asset_root: <span class="param-type">str</span>, root_prim_path: <span class="param-type">str</span>, cfg: <span class="param-type">dict</span>, *args, **kwargs)</p>
<div class="method-block">

Create a robot instance from USD and initialize all geometry and dynamics-related paths/parameters based on configuration.

<p class="method-section">Parameters: </p>

- **asset_root** (<span class="param-type">str</span>): Root directory for robot assets.
- **root_prim_path** (<span class="param-type">str</span>): Root prim path where the robot is mounted in the USD stage.
- **cfg** (<span class="param-type">dict</span>): Merged robot configuration (from robot YAML + task YAML).
- ***args, **kwargs**: Passed to the `Robot` base class.

</div>

<p class="method-name">initialize(self, *args, **kwargs)</p>
<div class="method-block">

Perform one-time initialization after the physics engine is ready, including joint velocity limits, home poses, and initial joint positions.

</div>

<p class="method-name">apply_action(self, joint_positions, joint_indices, *args, **kwargs)</p>
<div class="method-block">

Send joint position targets to the Isaac articulation. This is one of the main interfaces between upper-level controllers/policies and the robot.

<p class="method-section">Parameters: </p>

- **joint_positions** (<span class="param-type">np.ndarray</span>): Target joint positions.
- **joint_indices** (<span class="param-type">np.ndarray</span>): Joint indices to control.
- ***args, **kwargs**: Reserved for future extensions (e.g., velocity, torque control).

</div>

<p class="method-name">get_observations(self)</p>
<div class="method-block">

Collect the robot's current state for use as observation input by upper-level policies/planning modules.

<p class="method-section">Returns: </p>

- **dict**: Observation dictionary for policy/planning.

</div>

<p class="method-name">pose_post_process_fn(self, poses, *args, lr_arm="left", grasp_scale=1, tcp_offset=None, constraints=None, **kwargs)</p>
<div class="method-block">

Convert grasp poses from a graspnet-style annotations (e.g., `(score, width, depth, R, t)`) to robot-specific end-effector pose sets, including TCP offset, grasp width clipping, and optional spatial constraints.

<p class="method-section">Core Logic: </p>

- If `poses` is already a transformation matrix of shape `(N, 4, 4)`, return directly.
- Use `R_ee_graspnet = self._get_R_ee_graspnet()` to correct the grasp rotation and construct `T_obj_tcp`:
  - Rotation: `R_tcp = poses_rot @ R_ee_graspnet^T`.
  - Translation: `t_tcp = poses[:, 13:16] * grasp_scale`.
- Clip grasp widths `widths` to `[gripper_min_width, gripper_max_width]`, and optionally correct insertion depth `depths` using `_gripper_ed_func`.
- Use `tcp_offset` and the end-effector axis (determined by `ee_axis`) to transform TCP to actual EE transform `T_obj_ee`.
- If `constraints = [axis, min_ratio, max_ratio]` is provided, filter grasps along the specified axis, keeping only those within the given range.
- Call `_apply_rotation_variant` to generate a 180° rotation variant around the grasp axis, returning two sets of candidate grasp poses and their scores.

<p class="method-section">Parameters: </p>

- **poses** (<span class="param-type">np.ndarray</span>): Raw grasp annotations, typically shape `(N, 16)`.
- **lr_arm** (<span class="param-type">str</span>): Left/right arm marker ("left" or "right", currently mainly used by upper layers).
- **grasp_scale** (<span class="param-type">float</span>): Grasp position scale factor.
- **tcp_offset** (<span class="param-type">float</span>, optional): TCP offset relative to EE; defaults to `self.tcp_offset` from config.
- **constraints** (<span class="param-type">list</span>, optional): Spatial filtering constraint of the form `[axis, min_ratio, max_ratio]`.
- ***args, **kwargs**: Reserved for extensions.

<p class="method-section">Returns: </p>

- **tuple**: 
  - First item: `np.ndarray` of EE poses, shape approximately `(2N_filtered, 4, 4)`.
  - Second item: `np.ndarray` of corresponding scores, shape approximately `(2N_filtered,)`.

</div>

## References

- [Isaac Sim Robot Manipulators Documentation](https://docs.isaacsim.omniverse.nvidia.com/5.1.0/py/source/extensions/isaacsim.robot.manipulators/docs/index.html)