---
title: Controllers API
description: Controller module API reference
---

# Controllers API Reference

This page provides API documentation for the controller module.

## TemplateController

Base class for all robot arm controllers.

### Constructor

```python
TemplateController(cfg, task, robot_file: str, **kwargs)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cfg` | DictConfig | Controller configuration |
| `task` | BananaBaseTask | Task instance |
| `robot_file` | str | Path to CuRobo robot config |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `raw_js_names` | List[str] | Joint names in CuRobo order |
| `cmd_js_names` | List[str] | Joint names in simulation order |
| `arm_indices` | np.ndarray | Arm joint indices |
| `gripper_indices` | np.ndarray | Gripper joint indices |
| `_gripper_state` | float | Gripper state (1.0=open, -1.0=closed) |

### Methods

#### `_configure_joint_indices(robot_file: str)`

Configure joint names and indices. **Must be implemented by subclass.**

#### `_get_default_ignore_substring() -> List[str]`

Return default collision filter substrings. **Must be implemented by subclass.**

#### `get_gripper_action() -> np.ndarray`

Map gripper state to joint targets. **Must be implemented by subclass.**

#### `_load_world(use_default: bool = True)`

Load world configuration for motion planning.

**Returns:** `WorldConfig`

#### `_get_motion_gen_collision_cache() -> dict`

Return collision cache sizes.

**Returns:** `{"obb": int, "mesh": int}`

#### `_get_grasp_approach_linear_axis() -> int`

Return grasp approach axis (0=x, 1=y, 2=z).

**Returns:** `int` (default: 2)

#### `_get_sort_path_weights() -> Optional[List[float]]`

Return weights for path selection.

**Returns:** `List[float]` or `None`

#### `plan_to_pose(target_pose)`

Plan motion to target pose.

**Parameters:**
- `target_pose`: Tuple of (position, orientation)

**Returns:** `bool` - Success status

#### `execute_plan()`

Execute the planned trajectory.

#### `set_gripper_state(state: float)`

Set gripper state.

**Parameters:**
- `state`: 1.0 for open, -1.0 for closed

#### `get_current_joint_state() -> np.ndarray`

Get current joint positions.

**Returns:** `np.ndarray` of joint positions

---

## Lift2Controller

Controller for ARX-Lift2 dual-arm robot.

```python
@register_controller
class Lift2Controller(TemplateController):
    def _get_grasp_approach_linear_axis(self) -> int:
        return 0  # x-axis
```

**Features:**
- Dual-arm support
- Custom world configuration
- X-axis grasp approach

---

## SplitAlohaController

Controller for Agilex Split Aloha dual-arm robot.

```python
@register_controller
class SplitAlohaController(TemplateController):
    def _get_grasp_approach_linear_axis(self) -> int:
        return 2  # z-axis
```

**Features:**
- Dual-arm support
- Z-axis grasp approach
- Optional joint control

---

## Genie1Controller

Controller for Genie1 dual-arm robot.

```python
@register_controller
class Genie1Controller(TemplateController):
    def _get_sort_path_weights(self) -> List[float]:
        return [1, 1, 1, 1, 3, 3, 1]
```

**Features:**
- 7-DOF per arm
- Path selection weights
- Custom world configuration

---

## FR3Controller

Controller for Franka FR3 single-arm robot.

```python
@register_controller
class FR3Controller(TemplateController):
    def _get_motion_gen_collision_cache(self):
        return {"obb": 1000, "mesh": 1000}
```

**Features:**
- Single-arm support
- Panda gripper
- Larger collision cache

---

## FrankaRobotiq85Controller

Controller for Franka with Robotiq 2F-85 gripper.

```python
@register_controller
class FrankaRobotiq85Controller(TemplateController):
    def get_gripper_action(self):
        return np.clip(
            -self._gripper_state * self._gripper_joint_position,
            0.0, 5.0
        )
```

**Features:**
- Single-arm support
- Robotiq 2F-85 gripper
- Inverted gripper mapping