---
title: New Controller
description: Add a new robot controller to InternDataEngine
---

# New Controller

This guide explains how to create a new robot controller for motion planning with CuRobo.

## Part 1: Create CuRobo Configuration Files

Our controller uses a separate CuRobo config file for each arm. You need to:

1. **Prepare URDF files for each arm** - Extract single-arm URDF from your robot's full URDF
2. **Create CuRobo config files** - Follow the official CuRobo tutorial

### Step 1.1: Prepare URDF Files

For dual-arm robots, create separate URDF files for left and right arms. Save them in:

```
workflows/simbox/curobo/src/curobo/content/assets/robot/
├── your_robot_left_arm.urdf
├── your_robot_right_arm.urdf
└── meshes/
```

<div class="custom-tip">
<p class="custom-tip-title">Hint</p>
<p class="custom-tip-content">Each arm URDF should be a standalone file containing only that arm's links and joints. Make sure mesh paths in the URDF are correct relative to the assets folder.</p>
</div>

### Step 1.2: Create CuRobo Config Files

Follow the official CuRobo tutorial: [Configuring a New Robot](https://curobo.org/tutorials/1_robot_configuration.html)

Key steps:
1. Convert URDF to USD using Isaac Sim
2. Use Lula Robot Description Editor to generate collision spheres
3. Configure self-collision parameters

Save config files in:

```
workflows/simbox/curobo/src/curobo/content/configs/robot/
├── your_robot_left_arm.yml
└── your_robot_right_arm.yml
```

<div class="custom-warning">
<p class="custom-warning-title">Warning</p>
<p class="custom-warning-content">Isaac Sim's Lula Robot Description Editor is only available in <strong>Isaac Sim 4.0.0</strong>. Later versions have removed this feature. If you're using a newer version, you may need to manually create the collision sphere configuration or use Isaac Sim 4.0.0 for this step.</p>
</div>

### Example CuRobo Config Structure

```yaml
# your_robot_left_arm.yml
robot_cfg:
  kinematics:
    usd_path: "robot/your_robot_left_arm.usd"
    usd_robot_root: "/robot"
    urdf_path: "robot/your_robot_left_arm.urdf"
    asset_root_path: "robot"
    base_link: "base_link"
    ee_link: "link6"              # End-effector link (must match fl_ee_path in robot.yaml)

    collision_link_names:
      - link1
      - link2
      # ...

    collision_spheres:
      link1:
        - center: [0.0, 0.0, 0.0]
          radius: 0.05
      # ...

    self_collision_ignore:
      link1: ["link2", "link3"]
      # ...

    cspace:
      joint_names: ["joint1", "joint2", "joint3", "joint4", "joint5", "joint6"]
      retract_config: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
      null_space_weight: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
      cspace_distance_weight: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
      max_jerk: 500.0
      max_acceleration: 15.0
```

## Part 2: Update Robot YAML Configuration

In your `new_robot.yaml` (see [New Robot](/custom/robot.md)), fill in the `robot_file` field:

### For Dual-Arm Robots

```yaml
# CuRobo kinematics config files (one per arm)
robot_file:
  - workflows/simbox/curobo/src/curobo/content/configs/robot/your_robot_left_arm.yml
  - workflows/simbox/curobo/src/curobo/content/configs/robot/your_robot_right_arm.yml
```

### For Single-Arm Robots

For single-arm robots, we conventionally name it as the "left" arm:

```yaml
# CuRobo kinematics config file
robot_file:
  - workflows/simbox/curobo/src/curobo/content/configs/robot/your_robot_left_arm.yml
```


## Part 3: Create Controller Python Class

Create a new controller file in `workflows/simbox/core/controllers/`. Here's a new controller template:

```python
"""NewRobot controller implementation."""

import numpy as np
from core.controllers.base_controller import register_controller
from core.controllers.template_controller import TemplateController


@register_controller
class NewRobotController(TemplateController):
    """Controller for NewRobot."""

    def _get_default_ignore_substring(self):
        """Return default collision ignore substrings."""
        return ["material", "table", "floor", "scene"]

    def _configure_joint_indices(self, robot_file: str) -> None:
        """
        Configure joint names and indices for motion planning.

        This method maps between CuRobo's joint names and the robot USD's joint names.
        """
        # Raw joint names from CuRobo config (must match cspace.joint_names in yaml)
        self.raw_js_names = ["joint1", "joint2", "joint3", "joint4", "joint5", "joint6"]

        if "left" in robot_file:
            # Command joint names in robot USD (with prefix)
            self.cmd_js_names = ["fl_joint1", "fl_joint2", "fl_joint3",
                                 "fl_joint4", "fl_joint5", "fl_joint6"]
            # Joint indices from robot config
            self.arm_indices = np.array(self.robot.cfg["left_joint_indices"])
            self.gripper_indices = np.array(self.robot.cfg["left_gripper_indices"])
            self.reference_prim_path = self.task.robots[self.name].fl_base_path
            self.lr_name = "left"
            self._gripper_state = 1.0 if self.robot.left_gripper_state == 1.0 else -1.0

        elif "right" in robot_file:
            # Command joint names in robot USD (with prefix)
            self.cmd_js_names = ["fr_joint1", "fr_joint2", "fr_joint3",
                                 "fr_joint4", "fr_joint5", "fr_joint6"]
            self.arm_indices = np.array(self.robot.cfg["right_joint_indices"])
            self.gripper_indices = np.array(self.robot.cfg["right_gripper_indices"])
            self.reference_prim_path = self.task.robots[self.name].fr_base_path
            self.lr_name = "right"
            self._gripper_state = 1.0 if self.robot.right_gripper_state == 1.0 else -1.0

        else:
            raise ValueError("robot_file must contain 'left' or 'right'")

        # Gripper joint position for open/close
        # Adjust based on your gripper's joint values
        self._gripper_joint_position = np.array([0.044])  # Example: 44mm for open

    def get_gripper_action(self):
        """
        Map gripper state to joint positions.

        Returns:
            np.ndarray: Joint positions for gripper.

        State mapping:
            - _gripper_state = 1.0  -> Gripper OPEN
            - _gripper_state = -1.0 -> Gripper CLOSED
        """
        # When _gripper_state is 1.0, gripper opens (joint value = positive)
        # When _gripper_state is -1.0, gripper closes (joint value = 0 or negative)
        return np.clip(self._gripper_state * self._gripper_joint_position, 0.0, 0.1)
```

<p class="method-name">_configure_joint_indices(self, robot_file: <span class="param-type">str</span>)</p>
<div class="method-block">

Configure joint names and indices for motion planning. This method maps between CuRobo's joint names and the robot USD's joint names.

<p class="method-section">Parameters: </p>

- **robot_file** (<span class="param-type">str</span>): Path to the CuRobo config file, used to determine left/right arm.

<p class="method-section">Key Variables: </p>

- **raw_js_names** (<span class="param-type">list</span>): Joint names in CuRobo config (from `cspace.joint_names` in yaml).
- **cmd_js_names** (<span class="param-type">list</span>): Joint names in robot USD (must match actual USD joint names).
- **arm_indices** (<span class="param-type">np.ndarray</span>): Joint indices for arm in articulation.
- **gripper_indices** (<span class="param-type">np.ndarray</span>): Joint indices for gripper in articulation.

<div class="custom-warning">
<p class="custom-warning-title">Warning</p>
<p class="custom-warning-content">The order of <code>raw_js_names</code> and <code>cmd_js_names</code> must correspond! The i-th element in <code>raw_js_names</code> maps to the i-th element in <code>cmd_js_names</code>.</p>
</div>

</div>

---

<p class="method-name">get_gripper_action(self)</p>
<div class="method-block">

Convert `_gripper_state` to actual gripper joint positions.

<p class="method-section">Returns: </p>

- **np.ndarray**: Joint positions for gripper.

<p class="method-section">State Mapping: </p>

- **_gripper_state = 1.0**: Gripper OPEN (joint value that fingers open)
- **_gripper_state = -1.0**: Gripper CLOSED (joint value that fingers close)


Code Example:
```python
# Parallel gripper (single joint)
def get_gripper_action(self):
    return np.clip(self._gripper_state * self._gripper_joint_position, 0.0, 0.1)

# Two-finger gripper (two joints, e.g., Franka Panda)
def get_gripper_action(self):
    finger1 = np.clip(self._gripper_state * 0.04, 0.0, 0.04)
    finger2 = np.clip(-self._gripper_state * 0.04, -0.04, 0.0)
    return np.array([finger1, finger2])
```

</div>

---

### Register the Controller

Add your controller to `workflows/simbox/core/controllers/__init__.py`:

```python
from core.controllers.newrobot_controller import NewRobotController

__all__ = [
    # ... existing controllers
    "NewRobotController",
]
```

## Checklist

- [ ] Prepare single-arm URDF files for each arm
- [ ] Create CuRobo config YAML files using Isaac Sim 4.0.0 (Lula)
- [ ] Update `robot_file` in robot YAML configuration
- [ ] Create controller Python class
- [ ] Implement `_get_default_ignore_substring()`
- [ ] Implement `_configure_joint_indices()` with correct joint name mapping
- [ ] Implement `get_gripper_action()` with correct open/close mapping
- [ ] Register controller in `__init__.py`
- [ ] Test with task configuration

## References

- [CuRobo Robot Configuration Tutorial](https://curobo.org/tutorials/1_robot_configuration.html)
- [Controllers API Reference](/api/controllers)
- [Template Controller Source](https://github.com/your-org/DataEngine/blob/main/workflows/simbox/core/controllers/template_controller.py)