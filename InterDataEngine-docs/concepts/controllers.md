---
title: Controllers
description: Robot arm controllers for motion planning in InternDataEngine
---

# Controllers

Controllers are the core component responsible for robot arm motion planning in InternDataEngine. They provide **GPU-accelerated collision-free trajectory generation** using CuRobo, while simultaneously handling gripper actions.

## Overview

Each controller manages motion planning for a single robot arm. For dual-arm robots (like Lift2, Genie1, Split Aloha), two controller instances are created - one for each arm.

The controller's primary responsibilities include:

1. **Collision-Free Motion Planning**: Generate safe trajectories that avoid obstacles in the scene using CuRobo's GPU-accelerated motion generation
2. **Inverse Kinematics**: Solve IK queries to find joint configurations for desired end-effector poses
3. **Gripper Control**: Handle gripper open/close commands integrated with arm motion
4. **Collision World Management**: Update and maintain the collision world from the simulation scene

### CuRobo Configuration Files

Each robot arm requires a CuRobo configuration file that defines kinematics, collision geometry, and motion generation parameters:

- **YAML Configs**: `workflows/simbox/curobo/src/curobo/content/configs/robot/`
- **URDF Files**: `workflows/simbox/curobo/src/curobo/content/assets/robot/`

Available robot configs include:
- `r5a_left_arm.yml` / `r5a_right_arm.yml` - ARX Lift-2 (R5a arms)
- `piper100_left_arm.yml` / `piper100_right_arm.yml` - AgiLEx Split Aloha
- `G1_120s_left_arm_parallel_gripper.yml` / `G1_120s_right_arm_parallel_gripper.yml` - Genie-1
- `fr3_left_arm.yml` - Franka FR3
- `frankarobotiq_left_arm.yml` - Franka with Robotiq 2F-85 gripper

## Controller Architecture

All controllers inherit from `TemplateController` and customize behavior via method overrides.

```
TemplateController (base class)
├── FR3Controller
├── FrankaRobotiq85Controller
├── Genie1Controller
├── Lift2Controller
└── SplitAlohaController
```

## Controller Wrappers

Controller wrappers (located in `workflows/simbox/core/controllers/`) provide a unified interface for motion planning. The base class `TemplateController` implements all core functionality, with subclasses overriding specific methods for robot-specific configurations.

Template Code Example:
```python
"""
Template Controller base class for robot motion planning.

Common functionality extracted from FR3, FrankaRobotiq85, Genie1, Lift2, SplitAloha.
Subclasses implement _get_default_ignore_substring() and _configure_joint_indices().
"""

import random
import time
from copy import deepcopy
from typing import List, Optional

import numpy as np
import torch
from core.utils.constants import CUROBO_BATCH_SIZE
from core.utils.plan_utils import (
    filter_paths_by_position_error,
    filter_paths_by_rotation_error,
    sort_by_difference_js,
)
from curobo.cuda_robot_model.cuda_robot_model import CudaRobotModel
from curobo.geom.sdf.world import CollisionCheckerType
from curobo.geom.sphere_fit import SphereFitType
from curobo.geom.types import WorldConfig
from curobo.types.base import TensorDeviceType
from curobo.types.math import Pose
from curobo.types.robot import JointState, RobotConfig
from curobo.util.usd_helper import UsdHelper
from curobo.util_file import get_world_configs_path, join_path, load_yaml
from curobo.wrap.reacher.ik_solver import IKSolver, IKSolverConfig
from curobo.wrap.reacher.motion_gen import (
    MotionGen,
    MotionGenConfig,
    MotionGenPlanConfig,
    PoseCostMetric,
)
from omni.isaac.core import World
from omni.isaac.core.controllers import BaseController
from omni.isaac.core.tasks import BaseTask
from omni.isaac.core.utils.prims import get_prim_at_path
from omni.isaac.core.utils.transformations import (
    get_relative_transform,
    pose_from_tf_matrix,
)
from omni.isaac.core.utils.types import ArticulationAction


class TemplateController(BaseController):
    """Base controller for CuRobo-based motion planning. Supports single and batch planning."""

    def __init__(
        self,
        name: str,
        robot_file: str,
        task: BaseTask,
        world: World,
        constrain_grasp_approach: bool = False,
        collision_activation_distance: float = 0.03,
        ignore_substring: Optional[List[str]] = None,
        use_batch: bool = False,
        **kwargs,
    ) -> None:
        super().__init__(name=name)
        self.name = name
        self.world = world
        self.task = task
        self.robot = self.task.robots[name]
        self.ignore_substring = self._get_default_ignore_substring()
        if ignore_substring is not None:
            self.ignore_substring = ignore_substring
        self.ignore_substring.append(name)
        self.use_batch = use_batch
        self.constrain_grasp_approach = constrain_grasp_approach
        self.collision_activation_distance = collision_activation_distance
        self.usd_help = UsdHelper()
        self.tensor_args = TensorDeviceType()
        self.init_curobo = False
        self.robot_file = robot_file
        self.num_plan_failed = 0
        self.raw_js_names = []
        self.cmd_js_names = []
        self.arm_indices = np.array([])
        self.gripper_indices = np.array([])
        self.reference_prim_path = None
        self.lr_name = None
        self._ee_trans = 0.0
        self._ee_ori = 0.0
        self._gripper_state = 1.0
        self._gripper_joint_position = np.array([1.0])
        self.idx_list = None

        self._configure_joint_indices(robot_file)
        self._load_robot(robot_file)
        self._load_kin_model()
        self._load_world()
        self._init_motion_gen()

        self.usd_help.load_stage(self.world.stage)
        self.cmd_plan = None
        self.cmd_idx = 0
        self._step_idx = 0
        self.num_last_cmd = 0
        self.ds_ratio = 1

    def _get_default_ignore_substring(self) -> List[str]:
        return ["material", "Plane", "conveyor", "scene", "table"]

    def _configure_joint_indices(self, robot_file: str) -> None:
        raise NotImplementedError

    def _load_robot(self, robot_file: str) -> None:
        self.robot_cfg = load_yaml(robot_file)["robot_cfg"]

    def _load_kin_model(self) -> None:
        urdf_file = self.robot_cfg["kinematics"]["urdf_path"]
        base_link = self.robot_cfg["kinematics"]["base_link"]
        ee_link = self.robot_cfg["kinematics"]["ee_link"]
        robot_cfg = RobotConfig.from_basic(urdf_file, base_link, ee_link, self.tensor_args)
        self.kin_model = CudaRobotModel(robot_cfg.kinematics)

    def _load_world(self, use_default: bool = True) -> None:
        if use_default:
            self.world_cfg = WorldConfig()
        else:
            world_cfg_table = WorldConfig.from_dict(
                load_yaml(join_path(get_world_configs_path(), "collision_table.yml"))
            )
            self._world_cfg_table = world_cfg_table
            self._world_cfg_table.cuboid[0].pose[2] -= 10.5
            world_cfg1 = WorldConfig.from_dict(
                load_yaml(join_path(get_world_configs_path(), "collision_table.yml"))
            ).get_mesh_world()
            world_cfg1.mesh[0].name += "_mesh"
            world_cfg1.mesh[0].pose[2] = -10.5
            self.world_cfg = WorldConfig(cuboid=world_cfg_table.cuboid, mesh=world_cfg1.mesh)

    def _get_motion_gen_collision_cache(self):
        return {"obb": 700, "mesh": 700}

    def _get_grasp_approach_linear_axis(self) -> int:
        return 2

    def _get_sort_path_weights(self) -> Optional[List[float]]:
        return None

    def _init_motion_gen(self) -> None:
        pose_metric = None
        if self.constrain_grasp_approach:
            pose_metric = PoseCostMetric.create_grasp_approach_metric(
                offset_position=0.1,
                linear_axis=self._get_grasp_approach_linear_axis(),
            )
        if self.use_batch:
            self.plan_config = MotionGenPlanConfig(
                enable_graph=True,
                enable_opt=True,
                need_graph_success=True,
                enable_graph_attempt=4,
                max_attempts=4,
                enable_finetune_trajopt=True,
                parallel_finetune=True,
                time_dilation_factor=1.0,
            )
        else:
            self.plan_config = MotionGenPlanConfig(
                enable_graph=False,
                enable_graph_attempt=7,
                max_attempts=10,
                pose_cost_metric=pose_metric,
                enable_finetune_trajopt=True,
                time_dilation_factor=1.0,
            )
        motion_gen_config = MotionGenConfig.load_from_robot_config(
            self.robot_cfg,
            self.world_cfg,
            self.tensor_args,
            interpolation_dt=0.01,
            collision_activation_distance=self.collision_activation_distance,
            trajopt_tsteps=32,
            collision_checker_type=CollisionCheckerType.MESH,
            use_cuda_graph=True,
            self_collision_check=True,
            collision_cache=self._get_motion_gen_collision_cache(),
            num_trajopt_seeds=12,
            num_graph_seeds=12,
            optimize_dt=True,
            trajopt_dt=None,
            trim_steps=None,
            project_pose_to_goal_frame=False,
        )
        ik_config = IKSolverConfig.load_from_robot_config(
            self.robot_cfg,
            self.world_cfg,
            rotation_threshold=0.05,
            position_threshold=0.005,
            num_seeds=20,
            self_collision_check=True,
            self_collision_opt=True,
            tensor_args=self.tensor_args,
            use_cuda_graph=True,
            collision_checker_type=CollisionCheckerType.MESH,
            collision_cache={"obb": 700, "mesh": 700},
        )
        self.ik_solver = IKSolver(ik_config)
        self.motion_gen = MotionGen(motion_gen_config)
        print("warming up..")
        if self.use_batch:
            self.motion_gen.warmup(parallel_finetune=True, batch=CUROBO_BATCH_SIZE)
        else:
            self.motion_gen.warmup(enable_graph=True, warmup_js_trajopt=False)
        self.world_model = self.motion_gen.world_collision
        self.motion_gen.clear_world_cache()
        self.motion_gen.reset(reset_seed=False)
        self.motion_gen.update_world(self.world_cfg)

    def update_pose_cost_metric(self, hold_vec_weight: Optional[List[float]] = None) -> None:
        if hold_vec_weight:
            pose_cost_metric = PoseCostMetric(
                hold_partial_pose=True,
                hold_vec_weight=self.motion_gen.tensor_args.to_device(hold_vec_weight),
            )
        else:
            pose_cost_metric = None
        self.plan_config.pose_cost_metric = pose_cost_metric

    def update(self) -> None:
        obstacles = self.usd_help.get_obstacles_from_stage(
            ignore_substring=self.ignore_substring, reference_prim_path=self.reference_prim_path
        ).get_collision_check_world()
        if self.motion_gen is not None:
            self.motion_gen.update_world(obstacles)
        self.world_cfg = obstacles

    def reset(self, ignore_substring: Optional[str] = None) -> None:
        if ignore_substring:
            self.ignore_substring = ignore_substring
        self.update()
        self.init_curobo = True
        self.cmd_plan = None
        self.cmd_idx = 0
        self.num_plan_failed = 0
        if self.lr_name == "left":
            self._gripper_state = 1.0 if self.robot.left_gripper_state == 1.0 else -1.0
        elif self.lr_name == "right":
            self._gripper_state = 1.0 if self.robot.right_gripper_state == 1.0 else -1.0
        if self.lr_name == "left":
            self.robot_ee_path = self.robot.fl_ee_path
            self.robot_base_path = self.robot.fl_base_path
        else:
            self.robot_ee_path = self.robot.fr_ee_path
            self.robot_base_path = self.robot.fr_base_path
        self.T_base_ee_init = get_relative_transform(
            get_prim_at_path(self.robot_ee_path), get_prim_at_path(self.robot_base_path)
        )
        self.T_world_base_init = get_relative_transform(
            get_prim_at_path(self.robot_base_path), get_prim_at_path(self.task.root_prim_path)
        )
        self.T_world_ee_init = self.T_world_base_init @ self.T_base_ee_init
        self._ee_trans, self._ee_ori = self.get_ee_pose()
        self._ee_trans = self.tensor_args.to_device(self._ee_trans)
        self._ee_ori = self.tensor_args.to_device(self._ee_ori)
        self.update_pose_cost_metric()

    def update_specific(self, ignore_substring, reference_prim_path):
        obstacles = self.usd_help.get_obstacles_from_stage(
            ignore_substring=ignore_substring, reference_prim_path=reference_prim_path
        ).get_collision_check_world()
        if self.motion_gen is not None:
            self.motion_gen.update_world(obstacles)
        self.world_cfg = obstacles

    def plan(self, ee_translation_goal, ee_orientation_goal, sim_js: JointState, js_names: list):
        if self.use_batch:
            ik_goal = Pose(
                position=self.tensor_args.to_device(ee_translation_goal.unsqueeze(0).expand(CUROBO_BATCH_SIZE, -1)),
                quaternion=self.tensor_args.to_device(ee_orientation_goal.unsqueeze(0).expand(CUROBO_BATCH_SIZE, -1)),
                batch=CUROBO_BATCH_SIZE,
            )
            cu_js = JointState(
                position=self.tensor_args.to_device(np.tile((sim_js.positions)[np.newaxis, :], (CUROBO_BATCH_SIZE, 1))),
                velocity=self.tensor_args.to_device(np.tile((sim_js.positions)[np.newaxis, :], (CUROBO_BATCH_SIZE, 1)))
                * 0.0,
                acceleration=self.tensor_args.to_device(
                    np.tile((sim_js.positions)[np.newaxis, :], (CUROBO_BATCH_SIZE, 1))
                )
                * 0.0,
                jerk=self.tensor_args.to_device(np.tile((sim_js.positions)[np.newaxis, :], (CUROBO_BATCH_SIZE, 1)))
                * 0.0,
                joint_names=js_names,
            )
            cu_js = cu_js.get_ordered_joint_state(self.cmd_js_names)
            return self.motion_gen.plan_batch(cu_js, ik_goal, self.plan_config.clone())
        ik_goal = Pose(
            position=self.tensor_args.to_device(ee_translation_goal),
            quaternion=self.tensor_args.to_device(ee_orientation_goal),
        )
        cu_js = JointState(
            position=self.tensor_args.to_device(sim_js.positions),
            velocity=self.tensor_args.to_device(sim_js.velocities) * 0.0,
            acceleration=self.tensor_args.to_device(sim_js.velocities) * 0.0,
            jerk=self.tensor_args.to_device(sim_js.velocities) * 0.0,
            joint_names=js_names,
        )
        cu_js = cu_js.get_ordered_joint_state(self.cmd_js_names)
        return self.motion_gen.plan_single(cu_js.unsqueeze(0), ik_goal, self.plan_config.clone())

    def forward(self, manip_cmd, eps=5e-3):
        ee_trans, ee_ori = manip_cmd[0:2]
        gripper_fn = manip_cmd[2]
        params = manip_cmd[3]
        assert hasattr(self, gripper_fn)
        method = getattr(self, gripper_fn)
        if gripper_fn in ["in_plane_rotation", "mobile_move", "dummy_forward"]:
            return method(**params)
        elif gripper_fn in ["update_pose_cost_metric", "update_specific"]:
            method(**params)
            return self.ee_forward(ee_trans, ee_ori, eps=eps, skip_plan=True)
        else:
            method(**params)
            return self.ee_forward(ee_trans, ee_ori, eps)

    def ee_forward(
        self,
        ee_trans: torch.Tensor | np.ndarray,
        ee_ori: torch.Tensor | np.ndarray,
        eps=1e-4,
        skip_plan=False,
    ):
        ee_trans = self.tensor_args.to_device(ee_trans)
        ee_ori = self.tensor_args.to_device(ee_ori)
        sim_js = self.robot.get_joints_state()
        js_names = self.robot.dof_names
        plan_flag = torch.logical_or(
            torch.norm(self._ee_trans - ee_trans) > eps,
            torch.norm(self._ee_ori - ee_ori) > eps,
        )
        if not skip_plan:
            if plan_flag:
                self.cmd_idx = 0
                self._step_idx = 0
                self.num_last_cmd = 0
                result = self.plan(ee_trans, ee_ori, sim_js, js_names)
                if self.use_batch:
                    if result.success.any():
                        self._ee_trans = ee_trans
                        self._ee_ori = ee_ori
                        paths = result.get_successful_paths()
                        position_filter_res = filter_paths_by_position_error(
                            paths, result.position_error[result.success]
                        )
                        rotation_filter_res = filter_paths_by_rotation_error(
                            paths, result.rotation_error[result.success]
                        )
                        filtered_paths = [
                            p for i, p in enumerate(paths) if position_filter_res[i] and rotation_filter_res[i]
                        ]
                        if len(filtered_paths) == 0:
                            filtered_paths = paths
                        sort_weights = self._get_sort_path_weights()
                        weights_arg = self.tensor_args.to_device(sort_weights) if sort_weights is not None else None
                        sorted_indices = sort_by_difference_js(filtered_paths, weights=weights_arg)
                        cmd_plan = self.motion_gen.get_full_js(paths[sorted_indices[0]])
                        self.idx_list = list(range(len(self.raw_js_names)))
                        self.cmd_plan = cmd_plan.get_ordered_joint_state(self.raw_js_names)
                        self.num_plan_failed = 0
                    else:
                        print("Plan did not converge to a solution.")
                        self.num_plan_failed += 1
                else:
                    succ = result.success.item()
                    if succ:
                        self._ee_trans = ee_trans
                        self._ee_ori = ee_ori
                        cmd_plan = result.get_interpolated_plan()
                        self.idx_list = list(range(len(self.raw_js_names)))
                        self.cmd_plan = cmd_plan.get_ordered_joint_state(self.raw_js_names)
                        self.num_plan_failed = 0
                    else:
                        print("Plan did not converge to a solution.")
                        self.num_plan_failed += 1
            if self.cmd_plan and self._step_idx % 1 == 0:
                cmd_state = self.cmd_plan[self.cmd_idx]
                art_action = ArticulationAction(
                    cmd_state.position.cpu().numpy(),
                    cmd_state.velocity.cpu().numpy() * 0.0,
                    joint_indices=self.idx_list,
                )
                self.cmd_idx += self.ds_ratio
                if self.cmd_idx >= len(self.cmd_plan):
                    self.cmd_idx = 0
                    self.cmd_plan = None
            else:
                self.num_last_cmd += 1
                art_action = ArticulationAction(joint_positions=sim_js.positions[self.arm_indices])
        else:
            art_action = ArticulationAction(joint_positions=sim_js.positions[self.arm_indices])
        self._step_idx += 1
        arm_action = art_action.joint_positions
        gripper_action = self.get_gripper_action()
        joint_positions = np.concatenate([arm_action, gripper_action])
        self._action = {
            "joint_positions": joint_positions,
            "joint_indices": np.concatenate([self.arm_indices, self.gripper_indices]),
            "lr_name": self.lr_name,
            "arm_action": arm_action,
            "gripper_action": gripper_action,
        }
        return self._action

    def get_gripper_action(self):
        return np.clip(self._gripper_state * self._gripper_joint_position, 0.0, 0.04)

    def get_ee_pose(self):
        sim_js = self.robot.get_joints_state()
        q_state = torch.tensor(sim_js.positions[self.arm_indices], **self.tensor_args.as_torch_dict()).reshape(1, -1)
        ee_pose = self.kin_model.get_state(q_state)
        return ee_pose.ee_position[0].cpu().numpy(), ee_pose.ee_quaternion[0].cpu().numpy()

    def get_armbase_pose(self):
        armbase_pose = get_relative_transform(
            get_prim_at_path(self.robot_base_path), get_prim_at_path(self.task.root_prim_path)
        )
        return pose_from_tf_matrix(armbase_pose)

    def forward_kinematic(self, q_state: np.ndarray):
        q_state = q_state.reshape(1, -1)
        q_state = self.tensor_args.to_device(q_state)
        out = self.kin_model.get_state(q_state)
        return out.ee_position[0].cpu().numpy(), out.ee_quaternion[0].cpu().numpy()

    def close_gripper(self):
        self._gripper_state = -1.0

    def open_gripper(self):
        self._gripper_state = 1.0

    def attach_obj(self, obj_prim_path: str, link_name="attached_object"):
        sim_js = self.robot.get_joints_state()
        js_names = self.robot.dof_names
        cu_js = JointState(
            position=self.tensor_args.to_device(sim_js.positions),
            velocity=self.tensor_args.to_device(sim_js.velocities) * 0.0,
            acceleration=self.tensor_args.to_device(sim_js.velocities) * 0.0,
            jerk=self.tensor_args.to_device(sim_js.velocities) * 0.0,
            joint_names=js_names,
        )
        self.motion_gen.attach_objects_to_robot(
            cu_js,
            [obj_prim_path],
            link_name=link_name,
            sphere_fit_type=SphereFitType.VOXEL_VOLUME_SAMPLE_SURFACE,
            world_objects_pose_offset=Pose.from_list([0, 0, 0.01, 1, 0, 0, 0], self.tensor_args),
        )

    def detach_obj(self):
        self.motion_gen.detach_object_from_robot()
```


<p class="method-name">__init__(self, name, robot_file, task, world, constrain_grasp_approach, collision_activation_distance, ignore_substring, use_batch, **kwargs)</p>
<div class="method-block">

Initialize the controller, load robot configuration, and set up CuRobo motion generator.

<p class="method-section">Parameters: </p>

- **name** (<span class="param-type">str</span>): Controller name, matching the robot name in task.
- **robot_file** (<span class="param-type">str</span>): Path to CuRobo robot YAML configuration file.
- **task** (<span class="param-type">BaseTask</span>): The task instance containing robots and scene.
- **world** (<span class="param-type">World</span>): Isaac Sim world instance.
- **constrain_grasp_approach** (<span class="param-type">bool</span>, optional): Whether to add grasp approach constraint. Default is `False`.
- **collision_activation_distance** (<span class="param-type">float</span>, optional): Distance threshold for collision activation. Default is `0.03`.
- **ignore_substring** (<span class="param-type">List[str]</span>, optional): Substrings for objects to ignore in collision checking.
- **use_batch** (<span class="param-type">bool</span>, optional): Enable batch planning mode for multiple goals. Default is `False`.
- ****kwargs**: Additional keyword arguments.

</div>

<p class="method-name">reset(self, ignore_substring=None)</p>
<div class="method-block">

Reset controller state, update collision world, and initialize end-effector pose.

<p class="method-section">Parameters: </p>

- **ignore_substring** (<span class="param-type">List[str]</span>, optional): New collision filter substrings to use.

</div>


<p class="method-name">update_pose_cost_metric(self, hold_vec_weight=None)</p>
<div class="method-block">

Update the pose cost metric for constrained motion planning. This method is used to hold specific orientations or positions during robot motion, which is useful for tasks like keeping a container upright while moving.

<p class="method-section">Parameters: </p>

- **hold_vec_weight** (<span class="param-type">List[float]</span>, optional): A 6-element weight vector `[angular-x, angular-y, angular-z, linear-x, linear-y, linear-z]` that controls constraint costs. Defaults to `None`, which corresponds to `[0, 0, 0, 0, 0, 0]` (no constraints). For example, `[1, 1, 1, 0, 0, 0]` holds the tool orientation fixed during motion.

<p class="method-section">Reference: </p>

- [CuRobo Constrained Planning](https://curobo.org/advanced_examples/3_constrained_planning.html)

</div>


<p class="method-name">update_specific(self, ignore_substring, reference_prim_path)</p>
<div class="method-block">

Update collision world with specific ignore substrings and reference prim path. Used for fine-grained collision filtering during skill execution.

<p class="method-section">Parameters: </p>

- **ignore_substring** (<span class="param-type">List[str]</span>): List of substrings for objects to ignore in collision checking.
- **reference_prim_path** (<span class="param-type">str</span>): Reference prim path for relative transform calculations.

</div>

<p class="method-name">plan(self, ee_translation_goal, ee_orientation_goal, sim_js, js_names)</p>
<div class="method-block">

Generate a collision-free trajectory from current joint state to target end-effector pose.

<p class="method-section">Parameters: </p>

- **ee_translation_goal** (<span class="param-type">torch.Tensor | np.ndarray</span>): Target end-effector position `[x, y, z]`.
- **ee_orientation_goal** (<span class="param-type">torch.Tensor | np.ndarray</span>): Target end-effector orientation as quaternion `[w, x, y, z]`.
- **sim_js** (<span class="param-type">JointState</span>): Current joint state from simulation.
- **js_names** (<span class="param-type">list</span>): List of joint names in simulation order.

<p class="method-section">Returns:</p>

- **MotionGenResult**: CuRobo planning result containing success status, trajectory, and errors.

</div>

<p class="method-name">forward(self, manip_cmd, eps=5e-3)</p>
<div class="method-block">

Execute a manipulation command. This is the main entry point called by skills to execute motions.

<p class="method-section">Parameters: </p>

- **manip_cmd** (<span class="param-type">tuple</span>): Command tuple `(ee_trans, ee_ori, gripper_fn, params)`:
  - `ee_trans`: Target end-effector translation.
  - `ee_ori`: Target end-effector orientation.
  - `gripper_fn`: Name of gripper function to call (e.g., `"open_gripper"`, `"close_gripper"`).
  - `params`: Parameters for the gripper function.
- **eps** (<span class="param-type">float</span>, optional): Position/orientation threshold to trigger new planning. Default is `5e-3`.

<p class="method-section">Returns:</p>

- **dict**: Action dictionary containing:
  - `joint_positions`: Full joint positions including gripper.
  - `joint_indices`: Indices of joints to command.
  - `lr_name`: Left/right arm identifier.
  - `arm_action`: Arm joint positions only.
  - `gripper_action`: Gripper joint positions only.

</div>

## Example: Lift2Controller

The `Lift2Controller` demonstrates how to create a robot-specific controller by overriding key methods from `TemplateController`. This controller manages the ARX Lift-2 dual-arm robot with R5a arms.

```python
"""Lift2 mobile manipulator controller – template-based."""

import numpy as np
from core.controllers.base_controller import register_controller
from core.controllers.template_controller import TemplateController


@register_controller
class Lift2Controller(TemplateController):
    def _get_default_ignore_substring(self):
        return ["material", "Plane", "conveyor", "scene", "table", "fluid"]

    def _configure_joint_indices(self, robot_file: str) -> None:
        self.raw_js_names = ["joint1", "joint2", "joint3", "joint4", "joint5", "joint6"]
        if "left" in robot_file:
            self.cmd_js_names = ["fl_joint1", "fl_joint2", "fl_joint3", "fl_joint4", "fl_joint5", "fl_joint6"]
            self.arm_indices = np.array([10, 12, 14, 16, 18, 20])
            self.gripper_indices = np.array([23])
            self.reference_prim_path = self.task.robots[self.name].fl_base_path
            self.lr_name = "left"
            self._gripper_state = 1.0 if self.robot.left_gripper_state == 1.0 else -1.0
        elif "right" in robot_file:
            self.cmd_js_names = ["fr_joint1", "fr_joint2", "fr_joint3", "fr_joint4", "fr_joint5", "fr_joint6"]
            self.arm_indices = np.array([9, 11, 13, 15, 17, 19])
            self.gripper_indices = np.array([21])
            self.reference_prim_path = self.task.robots[self.name].fr_base_path
            self.lr_name = "right"
            self._gripper_state = 1.0 if self.robot.right_gripper_state == 1.0 else -1.0
        else:
            raise NotImplementedError("robot_file must contain 'left' or 'right'")
        self._gripper_joint_position = np.array([1.0])

    def _get_grasp_approach_linear_axis(self) -> int:
        """Lift2 uses x-axis (0) for grasp approach."""
        return 0

    def get_gripper_action(self):
        return np.clip(self._gripper_state * self._gripper_joint_position, 0.0, 0.1)

    def forward(self, manip_cmd, eps=5e-3):
        ee_trans, ee_ori = manip_cmd[0:2]
        gripper_fn = manip_cmd[2]
        params = manip_cmd[3]
        gripper_vel = manip_cmd[4] if len(manip_cmd) > 4 else None
        assert hasattr(self, gripper_fn)
        method = getattr(self, gripper_fn)
        if gripper_fn in ["in_plane_rotation", "mobile_move", "dummy_forward", "joint_ctrl"]:
            return method(**params)
        elif gripper_fn in ["update_pose_cost_metric", "update_specific"]:
            method(**params)
            return self.ee_forward(ee_trans, ee_ori, eps=eps, gripper_vel=gripper_vel, skip_plan=True)
        else:
            method(**params)
            return self.ee_forward(ee_trans, ee_ori, eps=eps, gripper_vel=gripper_vel)

    def ee_forward(
        self,
        ee_trans,
        ee_ori,
        eps=1e-4,
        skip_plan=False,
        gripper_vel=None,
    ):
        super().ee_forward(ee_trans, ee_ori, eps=eps, skip_plan=skip_plan)
        self._action["gripper_vel"] = gripper_vel
        return self._action
```

### Overridden Methods

The following four methods must be overridden to create a robot-specific controller:

<p class="method-name">_get_default_ignore_substring(self)</p>
<div class="method-block">

Return a list of substrings for objects to ignore during collision checking. These typically include visual-only objects, scene elements, and robot-specific parts.

<p class="method-section">Returns:</p>

- **List[str]**: List of substrings to filter out collision objects. For Lift2, this includes `"material"`, `"Plane"`, `"conveyor"`, `"scene"`, `"table"`, and `"fluid"`.

</div>

<p class="method-name">_configure_joint_indices(self, robot_file)</p>
<div class="method-block">

Configure the mapping between CuRobo planner joint names and simulation joint names. This is critical for translating planned trajectories into simulation commands.

<p class="method-section">Parameters: </p>

- **robot_file** (<span class="param-type">str</span>): Path to the CuRobo robot configuration file. Used to determine left/right arm for dual-arm robots.

<p class="method-section">Sets the following attributes: </p>

- **raw_js_names** (<span class="param-type">List[str]</span>): Joint names in CuRobo planner order.
- **cmd_js_names** (<span class="param-type">List[str]</span>): Joint names in simulation order.
- **arm_indices** (<span class="param-type">np.ndarray</span>): Indices of arm joints in simulation.
- **gripper_indices** (<span class="param-type">np.ndarray</span>): Indices of gripper joints in simulation.
- **reference_prim_path** (<span class="param-type">str</span>): Path to robot base prim for collision reference.
- **lr_name** (<span class="param-type">str</span>): "left" or "right" for dual-arm robots.

</div>

<p class="method-name">_get_grasp_approach_linear_axis(self)</p>
<div class="method-block">

Return the axis used for constrained grasp approach motion. This defines which axis the end-effector should align with during approach.

<p class="method-section">Returns:</p>

- **int**: Axis index (0=x, 1=y, 2=z). Default in `TemplateController` is 2 (z-axis). Lift2 uses 0 (x-axis) due to its gripper orientation.

</div>

<p class="method-name">get_gripper_action(self)</p>
<div class="method-block">

Convert internal gripper state to actual gripper joint position command. Different robots have different gripper mechanisms and ranges.

<p class="method-section">Returns:</p>

- **np.ndarray**: Gripper joint position(s). The value is clipped to the robot's valid gripper range. For Lift2, the range is `[0.0, 0.1]`.

</div>

## References

- [CuRobo Documentation](https://curobo.org/)
- [Genie Sim 3.0 - Motion Generator](https://github.com/AgibotTech/genie_sim/tree/main/source/data_collection/server/motion_generator)