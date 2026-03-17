---
title: 机器人
description: InternDataEngine 支持的机器人平台
---

# 机器人

InternDataEngine 支持多种机器人平台进行操作任务。每个机器人都有专门的封装类用于关节控制和状态管理。

## 支持的机器人

| 机器人 | 类型 | 自由度 | 夹爪 (DOF) | 手臂型号 |
|--------|------|--------|------------|----------|
| **ARX Lift-2** | 双臂 | 6+6 | 平行夹爪 (2) | R5a |
| **AgiLEx Split Aloha** | 双臂 | 6+6 | 平行夹爪 (2) | Piper 100 |
| **Genie-1** | 双臂 | 7+7 | 平行夹爪 (2) | G1-120s |
| **Franka FR3** | 单臂 | 7 | Panda (1) | Franka |
| **Franka Robotiq85** | 单臂 | 7 | Robotiq 2F-85 (2) | Franka |

## 机器人配置

### 双臂机器人

双臂机器人（Lift2、Split Aloha、Genie1）需要两个 CuRobo 配置文件：

```yaml
robots:
  - name: "lift2"
    target_class: Lift2
    path: "lift2/robot_invisible.usd"
    euler: [0.0, 0.0, 90.0]
    robot_file:
      - workflows/simbox/curobo/src/curobo/content/configs/robot/r5a_left_arm.yml
      - workflows/simbox/curobo/src/curobo/content/configs/robot/r5a_right_arm.yml
    left_joint_home: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    right_joint_home: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    left_joint_home_std: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
    right_joint_home_std: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
    left_gripper_home: [0.044]
    right_gripper_home: [0.044]
    tcp_offset: 0.125
    ignore_substring: ["material", "table"]
```

### 单臂机器人

单臂机器人（Franka FR3、Franka Robotiq85）使用一个配置：

```yaml
robots:
  - name: "franka"
    target_class: FR3
    path: "franka/fr3.usd"
    euler: [0.0, 0.0, 0.0]
    robot_file:
      - workflows/simbox/curobo/src/curobo/content/configs/robot/panda.yml
    left_joint_home: [0, -0.785, 0, -2.356, 0, 1.571, 0.785]
    left_joint_home_std: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    left_gripper_home: [0.04]
    tcp_offset: 0.1043
    ignore_substring: ["table"]
```

## 机器人配置字段

| 字段 | 描述 |
|------|------|
| `name` | 技能和相机中使用的机器人标识符 |
| `target_class` | 机器人封装的 Python 类（如 `Lift2`、`FR3`） |
| `path` | 相对于资产根目录的 USD 文件路径 |
| `euler` | 初始机器人方向，单位为度 [roll, pitch, yaw] |
| `robot_file` | CuRobo 运动学配置文件（每个手臂一个） |
| `left_joint_home` | 左臂默认关节位置（弧度） |
| `right_joint_home` | 右臂默认关节位置（弧度） |
| `left_joint_home_std` | 左臂初始位置随机化的标准差 |
| `right_joint_home_std` | 右臂初始位置随机化的标准差 |
| `left_gripper_home` | 左夹爪默认宽度（米） |
| `right_gripper_home` | 右夹爪默认宽度（米） |
| `tcp_offset` | 工具中心点相对于末端执行器的偏移（米） |
| `ignore_substring` | 碰撞过滤时要忽略的子字符串 |

## 机器人封装

机器人封装（`workflows/simbox/core/robots/`）提供关节控制、夹爪接口和状态管理。

::: details Lift2 示例

```python
from copy import deepcopy

import numpy as np
import torch
from core.robots.base_robot import register_robot
from omni.isaac.core.robots.robot import Robot
from omni.isaac.core.utils.prims import create_prim, get_prim_at_path
from omni.isaac.core.utils.transformations import (
    get_relative_transform,
    tf_matrix_from_pose,
)


@register_robot
class Lift2(Robot):
    # ========================================
    # __init__: 从 USD 初始化机器人并设置路径
    # - 加载 USD 资源并创建 prim
    # - 设置夹爪宽度限制
    # - 配置物理求解器参数
    # - 定义手臂路径（fl=左前, fr=右前）
    # - 设置手臂、夹爪和升降的关节索引
    # - 配置碰撞过滤路径
    # ========================================
    def __init__(self, asset_root, root_prim_path, cfg, *args, **kwargs):
        self.asset_root = asset_root
        self.cfg = cfg

        usd_path = f"{asset_root}/{cfg['path']}"
        prim_path = f"{root_prim_path}/{cfg['name']}"
        create_prim(
            usd_path=usd_path,
            prim_path=prim_path,
        )
        super().__init__(prim_path, cfg["name"], *args, **kwargs)

        self.gripper_max_width = 0.088
        self.gripper_min_width = 0.00

        self.robot_prim_path = prim_path
        self.set_solver_position_iteration_count(128)
        self.set_stabilization_threshold(0.005)
        self.set_solver_velocity_iteration_count(4)

        fl_forlan = "lift2/lift2/fl/link6"
        fr_forlan = "lift2/lift2/fr/link6"
        self.fl_forlan_prim_path = f"{self.robot_prim_path}/{fl_forlan}"
        self.fr_forlan_prim_path = f"{self.robot_prim_path}/{fr_forlan}"
        self.fl_base_path = f"{self.robot_prim_path}/lift2/lift2/fl/base_link"
        self.fr_base_path = f"{self.robot_prim_path}/lift2/lift2/fr/base_link"
        self.fl_hand_path = f"{self.robot_prim_path}/{fl_forlan}"
        self.fr_hand_path = f"{self.robot_prim_path}/{fr_forlan}"
        self.fl_ee_path = f"{self.robot_prim_path}/{fl_forlan}"
        self.fr_ee_path = f"{self.robot_prim_path}/{fr_forlan}"
        self.fl_gripper_keypoints = {
            "tool_head": np.array([0.135, 0.0, 0.0, 1]),
            "tool_tail": np.array([0.085, 0.0, 0.0, 1]),
            "tool_side": np.array([0.135, -0.044, 0.0, 1]),
        }
        self.fr_gripper_keypoints = {
            "tool_head": np.array([0.135, 0.0, 0.0, 1]),
            "tool_tail": np.array([0.085, 0.0, 0.0, 1]),
            "tool_side": np.array([0.135, -0.044, 0.0, 1]),
        }
        self.left_joint_indices = [10, 12, 14, 16, 18, 20]
        self.right_joint_indices = [9, 11, 13, 15, 17, 19]
        self.left_ee_indices = [23]
        self.right_ee_indices = [21]
        self.lift_indices = [6]

        self.fl_filter_paths_expr = [
            f"{self.robot_prim_path}/lift2/lift2/fl/link7",
            f"{self.robot_prim_path}/lift2/lift2/fl/link8",
        ]
        self.fr_filter_paths_expr = [
            f"{self.robot_prim_path}/lift2/lift2/fr/link7",
            f"{self.robot_prim_path}/lift2/lift2/fr/link8",
        ]
        self.fl_forbid_collision_paths = [
            f"{self.robot_prim_path}/lift2/lift2/fl/link2",
            f"{self.robot_prim_path}/lift2/lift2/fl/link3",
            f"{self.robot_prim_path}/lift2/lift2/fl/link4",
            f"{self.robot_prim_path}/lift2/lift2/fl/link5",
        ]
        self.fr_forbid_collision_paths = [
            f"{self.robot_prim_path}/lift2/lift2/fr/link2",
            f"{self.robot_prim_path}/lift2/lift2/fr/link3",
            f"{self.robot_prim_path}/lift2/lift2/fr/link4",
            f"{self.robot_prim_path}/lift2/lift2/fr/link5",
        ]

    # ========================================
    # initialize: 物理就绪后设置关节位置
    # - 从配置加载初始位置并添加随机化
    # - 设置夹爪状态（1.0=打开, -1.0=关闭）
    # - 配置最大关节速度
    # - 应用初始关节位置
    # ========================================
    def initialize(self, *args, **kwargs):
        super().initialize()
        self._articulation_view.initialize()
        self.left_joint_home = self.cfg.get("left_joint_home", [0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
        self.right_joint_home = self.cfg.get("right_joint_home", [0.0, 0.0, 0.0, 0.0, 0.0, 0.0])

        left_joint_noise = np.random.normal(0, self.cfg.get("left_joint_home_std", [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]))
        self.left_joint_home = (np.array(self.left_joint_home) + left_joint_noise).tolist()

        right_joint_noise = np.random.normal(0, self.cfg.get("right_joint_home_std", [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]))
        self.right_joint_home = (np.array(self.right_joint_home) + right_joint_noise).tolist()

        self.left_gripper_home = self.cfg.get("left_gripper_home", [0.044])
        self.left_gripper_state = 1.0 if self.left_gripper_home[0] == 0.044 else -1.0  # 1.0 open, -1.0 close
        self.right_gripper_home = self.cfg.get("right_gripper_home", [0.044])
        self.right_gripper_state = 1.0 if self.right_gripper_home[0] == 0.044 else -1.0  # 1.0 open, -1.0 close
        self.lift_home = self.cfg.get("lift_home", [0.46])
        self.tcp_offset = self.cfg.get("tcp_offset", 0.125)

        self._articulation_view.set_max_joint_velocities(
            np.array([500.0 for i in range(13)]),
            joint_indices=np.array(self.lift_indices + self.left_joint_indices + self.right_joint_indices),
        )
        self._articulation_view.set_joint_positions(
            np.array(
                self.lift_home
                + self.left_joint_home
                + self.right_joint_home
                + self.left_gripper_home
                + self.right_gripper_home
            ).reshape(1, -1),
            joint_indices=np.array(
                self.lift_indices
                + self.left_joint_indices
                + self.right_joint_indices
                + self.left_ee_indices
                + self.right_ee_indices
            ),
        )

    # ========================================
    # apply_action: 发送关节命令到机器人
    # - 设置关节位置目标用于运动规划
    # - 可选的夹爪速度控制实现更平滑的夹爪运动
    # ========================================
    def apply_action(self, joint_positions, joint_indices, *args, gripper_vel=None, **kwargs):
        self._articulation_view.set_joint_position_targets(joint_positions, joint_indices=joint_indices)
        if gripper_vel is not None:
            gripper_velocities = []
            gripper_indices = []
            if gripper_vel[0]:
                for idx in [6]:  # gripper idx in joint_positions
                    target_qpos = joint_positions[idx]
                    if target_qpos == 0.0:  # close
                        gripper_velocities.append(gripper_vel[0])
                        gripper_indices.append(joint_indices[idx])
                    elif target_qpos == 1.0:  # open
                        gripper_velocities.append(gripper_vel[0])
                        gripper_indices.append(joint_indices[idx])

            if gripper_velocities and gripper_indices:
                if self._backend == "numpy":
                    self._articulation_view.set_joint_velocity_targets(
                        np.array(gripper_velocities), joint_indices=np.array(gripper_indices)
                    )
                elif self._backend == "torch":
                    self._articulation_view.set_joint_velocity_targets(
                        torch.tensor(np.array(gripper_velocities), dtype=torch.float, device="cpu"),
                        joint_indices=torch.tensor(np.array(gripper_indices), dtype=torch.float, device="cpu"),
                    )

    # ========================================
    # get_observations: 收集机器人状态用于策略
    # - 双臂的关节位置和速度
    # - 夹爪位置（乘以2以兼容）
    # - 末端执行器相对于机器人基座的位姿
    # - 机器人在环境坐标系中的位姿
    # ========================================
    def get_observations(self):
        joint_state = self.get_joints_state()
        qpos, qvel = joint_state.positions, joint_state.velocities
        fl_forlan2robot_pose = get_relative_transform(
            get_prim_at_path(self.fl_forlan_prim_path), get_prim_at_path(self.fl_base_path)
        )
        fr_forlan2robot_pose = get_relative_transform(
            get_prim_at_path(self.fr_forlan_prim_path), get_prim_at_path(self.fr_base_path)
        )
        robot2env_pose = tf_matrix_from_pose(*self.get_local_pose())
        obs = {
            "states.left_joint.position": qpos[self.left_joint_indices],
            "states.right_joint.position": qpos[self.right_joint_indices],
            "states.left_gripper.position": qpos[self.left_ee_indices] * 2,
            "states.right_gripper.position": qpos[self.right_ee_indices] * 2,
            "qvel": qvel,
            "fl_forlan2robot_pose": fl_forlan2robot_pose,
            "fr_forlan2robot_pose": fr_forlan2robot_pose,
            "robot2env_pose": robot2env_pose,
        }
        return obs

    # ========================================
    # pose_post_process_fn: 将抓取位姿转换为末端执行器位姿
    # - 将抓取标注转换为机器人特定的 TCP 位姿
    # - 应用 TCP 偏移以获取工具中心点
    # - 可选地按空间约束过滤位姿
    # - 生成带有 180° X 旋转的位姿变体
    # ========================================
    def pose_post_process_fn(
        self, poses, *args, lr_arm="left", grasp_scale=1, tcp_offset=None, constraints=None, **kwargs
    ):
        if poses.shape[-2:] == (4, 4):
            return poses
        R1 = np.array([[1.0, 0.0, 0.0], [0.0, -1.0, 0.0], [0.0, 0.0, -1.0]])
        n_grasps = poses.shape[0]
        unit_mat = np.eye(4)[np.newaxis, :, :]
        T_g2o = np.repeat(unit_mat, n_grasps, axis=0)
        T_g2o[:, :3, :3] = np.matmul(poses[:, 4:13].reshape(-1, 3, 3), R1.T)
        T_g2o[:, :3, 3] = poses[:, 13:16] * grasp_scale
        scores = poses[:, 0]
        widths = poses[:, 1:2]
        widths = np.clip(widths, self.gripper_min_width, self.gripper_max_width)
        depths = poses[:, 3:4]
        if tcp_offset is None:
            tcp_offset = self.tcp_offset
        tcp_center = T_g2o[:, 0:3, 3]
        x_axis = T_g2o[:, 0:3, 0]
        ee_center = tcp_center + x_axis * (depths - tcp_offset)
        T_ee2o = T_g2o.copy()
        T_ee2o[:, 0:3, 3] = ee_center

        if constraints is not None:
            axis_map = {"x": 0, "y": 1, "z": 2}
            axis, min_ratio, max_ratio = constraints
            selective_pose_axis = axis_map[axis]

            max_pose = max(T_g2o[:, selective_pose_axis, 3])
            min_pose = min(T_g2o[:, selective_pose_axis, 3])
            min_threshold = min_pose + min_ratio * (max_pose - min_pose)
            max_threshold = min_pose + max_ratio * (max_pose - min_pose)

            flag1 = T_g2o[:, selective_pose_axis, 3] >= min_threshold
            flag2 = T_g2o[:, selective_pose_axis, 3] <= max_threshold
            flag = np.logical_and(flag1, flag2)

            T_ee2o = T_ee2o[flag]
            scores = scores[flag]

        T_ee2o_rx = deepcopy(T_ee2o)
        rot_x = np.array(
            [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, -1.0, 0.0, 0.0],
                [0.0, 0.0, -1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ]
        ).reshape(1, 4, 4)
        T_ee2o_rx = np.matmul(T_ee2o_rx, rot_x)

        return np.concatenate([T_ee2o, T_ee2o_rx], axis=0), np.concatenate([scores, scores], axis=0)
```

:::

### 关键方法

#### `__init__(asset_root, root_prim_path, cfg, *args, **kwargs)`

从 USD 文件初始化机器人，配置手臂路径、关节索引、夹爪限制和碰撞过滤器。

**参数：**
- `asset_root` (str): 机器人资源的根路径。
- `root_prim_path` (str): USD 场景中的父级 prim 路径。
- `cfg` (dict): 机器人配置，包含路径、名称、关节初始位置、夹爪初始位置等。
- `*args, **kwargs`: 传递给父类 Robot 的额外参数。

**返回值：**
- 无

---

#### `initialize(*args, **kwargs)`

物理就绪后设置初始关节位置，应用配置中的随机化，配置速度限制。

**参数：**
- `*args, **kwargs`: 额外参数（未使用，用于兼容性）。

**返回值：**
- 无

---

#### `apply_action(joint_positions, joint_indices, *args, gripper_vel=None, **kwargs)`

发送关节位置命令到机器人，可选控制夹爪速度实现更平滑运动。

**参数：**
- `joint_positions` (np.ndarray): 目标关节位置。
- `joint_indices` (np.ndarray): 要控制的关节索引。
- `*args`: 额外参数（未使用）。
- `gripper_vel` (float, 可选): 夹爪速度，用于更平滑的开合运动。
- `**kwargs`: 额外关键字参数。

**返回值：**
- 无

---

#### `get_observations()`

收集机器人状态，包括关节位置/速度、夹爪状态、末端执行器位姿，用于策略输入。

**参数：**
- 无

**返回值：**
- `dict`: 观测字典，包含：
  - `states.left_joint.position`: 左臂关节位置。
  - `states.right_joint.position`: 右臂关节位置。
  - `states.left_gripper.position`: 左夹爪位置。
  - `states.right_gripper.position`: 右夹爪位置。
  - `qvel`: 关节速度。
  - `fl_forlan2robot_pose`: 左前末端执行器到机器人的变换矩阵。
  - `fr_forlan2robot_pose`: 右前末端执行器到机器人的变换矩阵。
  - `robot2env_pose`: 机器人到环境的变换矩阵。

---

#### `pose_post_process_fn(poses, *args, lr_arm="left", grasp_scale=1, tcp_offset=None, constraints=None, **kwargs)`

将抓取标注转换为末端执行器位姿，应用 TCP 偏移，按空间约束过滤。

**参数：**
- `poses` (np.ndarray): 输入抓取位姿，形状为 (N, 16)，包含旋转和平移。
- `*args`: 额外参数（未使用）。
- `lr_arm` (str): 左臂或右臂选择（"left" 或 "right"）。
- `grasp_scale` (float): 抓取位置的缩放因子。
- `tcp_offset` (float, 可选): 工具中心点偏移。默认使用配置值。
- `constraints` (list, 可选): 过滤位姿的空间约束。格式：`[axis, min_ratio, max_ratio]`，其中 axis 为 'x'、'y' 或 'z'。
- `**kwargs`: 额外关键字参数。

**返回值：**
- `tuple`: (T_ee2o, scores)，其中：
  - `T_ee2o` (np.ndarray): 处理后的变换矩阵，形状为 (2N, 4, 4)，包含旋转变体。
  - `scores` (np.ndarray): 位姿得分，形状为 (2N,)。

## 参考资料

- [Isaac Sim 机器人操作器文档](https://docs.isaacsim.omniverse.nvidia.com/5.1.0/py/source/extensions/isaacsim.robot.manipulators/docs/index.html)