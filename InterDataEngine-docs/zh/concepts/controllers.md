---
title: 控制器
description: InternDataEngine 中用于机器人运动规划的控制器
---

# 控制器

控制器是 InternDataEngine 中负责机器人运动规划的核心组件。它们使用 CuRobo 提供**GPU 加速的无碰撞轨迹生成**，同时处理夹爪动作。

## 概述

每个控制器管理单个机器人臂的运动规划。对于双臂机器人（如 Lift2、Genie1、Split Aloha），会创建两个控制器实例——每个手臂一个。

控制器的主要职责包括：

1. **无碰撞运动规划**：使用 CuRobo 的 GPU 加速运动生成生成避开场景中障碍物的安全轨迹
2. **逆运动学**：求解 IK 查询以找到所需末端执行器位姿的关节配置
3. **夹爪控制**：处理与手臂运动集成的夹爪开合命令
4. **碰撞世界管理**：从仿真场景更新和维护碰撞世界

### CuRobo 配置文件

每个机器人臂需要一个 CuRobo 配置文件来定义运动学、碰撞几何和运动生成参数：

- **YAML 配置**：`workflows/simbox/curobo/src/curobo/content/configs/robot/`
- **URDF 文件**：`workflows/simbox/curobo/src/curobo/content/assets/robot/`

可用的机器人配置包括：
- `r5a_left_arm.yml` / `r5a_right_arm.yml` - ARX Lift-2 (R5a 机械臂)
- `piper100_left_arm.yml` / `piper100_right_arm.yml` - AgiLEx Split Aloha
- `G1_120s_left_arm_parallel_gripper.yml` / `G1_120s_right_arm_parallel_gripper.yml` - Genie-1
- `fr3_left_arm.yml` - Franka FR3
- `frankarobotiq_left_arm.yml` - Franka 配合 Robotiq 2F-85 夹爪

## 控制器架构

所有控制器都继承自 `TemplateController`，并通过方法重写自定义行为。

```
TemplateController (基类)
├── FR3Controller
├── FrankaRobotiq85Controller
├── Genie1Controller
├── Lift2Controller
└── SplitAlohaController
```

## 控制器封装

控制器封装（位于 `workflows/simbox/core/controllers/`）为运动规划提供统一接口。基类 `TemplateController` 实现所有核心功能，子类通过重写特定方法来配置特定机器人。

::: details TemplateController 实现

```python
"""
用于机器人运动规划的模板控制器基类。

从 FR3、FrankaRobotiq85、Genie1、Lift2、SplitAloha 提取的通用功能。
子类实现 _get_default_ignore_substring() 和 _configure_joint_indices()。
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
    """基于 CuRobo 的运动规划基类控制器。支持单目标和批量规划。"""

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

:::

### 关键方法

#### `__init__(name, robot_file, task, world, constrain_grasp_approach, collision_activation_distance, ignore_substring, use_batch, **kwargs)`

初始化控制器，加载机器人配置，并设置 CuRobo 运动生成器。

**参数：**
- `name` (str): 控制器名称，与任务中的机器人名称匹配。
- `robot_file` (str): CuRobo 机器人 YAML 配置文件路径。
- `task` (BaseTask): 包含机器人和场景的任务实例。
- `world` (World): Isaac Sim 世界实例。
- `constrain_grasp_approach` (bool, 可选): 是否添加抓取接近约束。默认为 `False`。
- `collision_activation_distance` (float, 可选): 碰撞激活距离阈值。默认为 `0.03`。
- `ignore_substring` (List[str], 可选): 在碰撞检查中要忽略的对象子字符串。
- `use_batch` (bool, 可选): 启用批量规划模式以处理多个目标。默认为 `False`。
- `**kwargs`: 额外的关键字参数。

**返回值：**
- 无

---

#### `reset(ignore_substring=None)`

重置控制器状态，更新碰撞世界，并初始化末端执行器位姿。

**参数：**
- `ignore_substring` (List[str], 可选): 要使用的新碰撞过滤子字符串。

**返回值：**
- 无

---

#### `update_pose_cost_metric(hold_vec_weight=None)`

更新约束运动规划的位姿成本度量。用于在运动过程中保持特定方向或位置。

**参数：**
- `hold_vec_weight` (List[float], 可选): 6-DOF 约束权重 `[angular-x, angular-y, angular-z, linear-x, linear-y, linear-z]`。例如，`[1, 1, 1, 0, 0, 0]` 保持工具方向同时允许平移。`None` 移除所有约束。

**返回值：**
- 无

---

#### `update_specific(ignore_substring, reference_prim_path)`

使用特定的忽略子字符串和参考 prim 路径更新碰撞世界。用于技能执行期间的细粒度碰撞过滤。

**参数：**
- `ignore_substring` (List[str]): 要在碰撞检查中忽略的对象子字符串列表。
- `reference_prim_path` (str): 用于相对变换计算的参考 prim 路径。

**返回值：**
- 无

---

#### `plan(ee_translation_goal, ee_orientation_goal, sim_js, js_names)`

从当前关节状态生成到目标末端执行器位姿的无碰撞轨迹。

**参数：**
- `ee_translation_goal` (torch.Tensor | np.ndarray): 目标末端执行器位置 `[x, y, z]`。
- `ee_orientation_goal` (torch.Tensor | np.ndarray): 目标末端执行器方向，四元数格式 `[w, x, y, z]`。
- `sim_js` (JointState): 来自仿真的当前关节状态。
- `js_names` (list): 仿真顺序中的关节名称列表。

**返回值：**
- `MotionGenResult`: CuRobo 规划结果，包含成功状态、轨迹和错误。

---

#### `forward(manip_cmd, eps=5e-3)`

执行操作命令。这是技能调用的主要入口点，用于执行运动。

**参数：**
- `manip_cmd` (tuple): 命令元组 `(ee_trans, ee_ori, gripper_fn, params)`：
  - `ee_trans`: 目标末端执行器平移。
  - `ee_ori`: 目标末端执行器方向。
  - `gripper_fn`: 要调用的夹爪函数名称（例如，`"open_gripper"`、`"close_gripper"`）。
  - `params`: 夹爪函数的参数。
- `eps` (float, 可选): 触发新规划的位置/方向阈值。默认为 `5e-3`。

**返回值：**
- `dict`: 动作字典，包含：
  - `joint_positions`: 包括夹爪的完整关节位置。
  - `joint_indices`: 要控制的关节索引。
  - `lr_name`: 左/右臂标识符。
  - `arm_action`: 仅手臂关节位置。
  - `gripper_action`: 仅夹爪关节位置。

## 示例：Lift2Controller

`Lift2Controller` 演示了如何通过重写 `TemplateController` 的关键方法来创建特定机器人的控制器。该控制器管理配备 R5a 手臂的 ARX Lift-2 双臂机器人。

::: details Lift2Controller 实现

```python
"""Lift2 移动操作控制器 – 基于模板。"""

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
        """Lift2 使用 x 轴 (0) 进行抓取接近。"""
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

:::

### 重写的方法

以下四个方法必须重写才能创建特定机器人的控制器：

#### `_get_default_ignore_substring()`

返回在碰撞检查期间要忽略的对象子字符串列表。这些通常包括仅视觉对象、场景元素和机器人特定部分。

**参数：**
- 无

**返回值：**
- `List[str]`: 要过滤碰撞对象的子字符串列表。对于 Lift2，这包括 `"material"`、`"Plane"`、`"conveyor"`、`"scene"`、`"table"` 和 `"fluid"`。

---

#### `_configure_joint_indices(robot_file)`

配置 CuRobo 规划器关节名称与仿真关节名称之间的映射。这对于将规划的轨迹转换为仿真命令至关重要。

**参数：**
- `robot_file` (str): CuRobo 机器人配置文件的路径。用于确定双臂机器人的左/右臂。

**返回值：**
- 无

**设置以下属性：**
- `raw_js_names` (List[str]): CuRobo 规划器顺序中的关节名称。
- `cmd_js_names` (List[str]): 仿真顺序中的关节名称。
- `arm_indices` (np.ndarray): 仿真中手臂关节的索引。
- `gripper_indices` (np.ndarray): 仿真中夹爪关节的索引。
- `reference_prim_path` (str): 用于碰撞参考的机器人基座 prim 路径。
- `lr_name` (str): 双臂机器人的 "left" 或 "right"。

---

#### `_get_grasp_approach_linear_axis()`

返回用于约束抓取接近运动的轴。这定义了末端执行器在接近过程中应该与哪个轴对齐。

**参数：**
- 无

**返回值：**
- `int`: 轴索引 (0=x, 1=y, 2=z)。`TemplateController` 中的默认值是 2（z 轴）。Lift2 使用 0（x 轴），因为其夹爪方向的原因。

---

#### `get_gripper_action()`

将内部夹爪状态转换为实际的夹爪关节位置命令。不同的机器人具有不同的夹爪机制和范围。

**参数：**
- 无

**返回值：**
- `np.ndarray`: 夹爪关节位置。该值被裁剪到机器人的有效夹爪范围。对于 Lift2，范围是 `[0.0, 0.1]`。

## 参考资料

- [CuRobo 文档](https://curobo.org/)
- [Genie Sim 3.0 - Motion Generator](https://github.com/AgibotTech/genie_sim/tree/main/source/data_collection/server/motion_generator)