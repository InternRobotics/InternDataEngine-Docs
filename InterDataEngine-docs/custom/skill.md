---
title: New Skill
description: Add a new manipulation skill to InternDataEngine
---

# New Skill

This guide explains how to create a new manipulation skill for robot task execution.

## Overview

Skills define atomic manipulation actions (e.g., pick, place, articulation). Each skill generates a sequence of manipulation commands (`manip_list`) that the controller executes sequentially.

## Skill Template

Create a new file in `workflows/simbox/core/skills/`:

```python
"""NewSkill implementation."""

from copy import deepcopy
import numpy as np
from core.skills.base_skill import BaseSkill, register_skill
from omegaconf import DictConfig
from omni.isaac.core.controllers import BaseController
from omni.isaac.core.robots.robot import Robot
from omni.isaac.core.tasks import BaseTask


@register_skill
class NewSkill(BaseSkill):
    """New manipulation skill."""

    def __init__(
        self,
        robot: Robot,
        controller: BaseController,
        task: BaseTask,
        cfg: DictConfig,
        *args,
        **kwargs
    ):
        """Initialize the skill.

        Args:
            robot: Robot instance for getting state and applying actions
            controller: Controller instance for motion planning
            task: Task instance containing scene information
            cfg: Skill configuration from task YAML
        """
        super().__init__()
        self.robot = robot
        self.controller = controller
        self.task = task
        self.skill_cfg = cfg

        # Get target object from config
        object_name = self.skill_cfg["objects"][0]
        self.target_obj = task.objects[object_name]

        # Initialize manip_list (will be filled in simple_generate_manip_cmds)
        self.manip_list = []

        # Initialize other skill-specific variables
        self.process_valid = True

    def simple_generate_manip_cmds(self):
        """
        Generate the manipulation command list.

        This is the MOST IMPORTANT method! It generates a list of manipulation
        commands (manip_list) that define the sequence of waypoint poses and
        intermediate states for the skill execution.
        """
        manip_list = []

        # ... generate commands ...

        self.manip_list = manip_list

    def is_feasible(self, th=5):
        """Check if the skill is still feasible to execute."""
        return self.controller.num_plan_failed <= th

    def is_subtask_done(self, t_eps=1e-3, o_eps=5e-3):
        """Check if the current waypoint is reached."""
        pass

    def is_done(self):
        """Check if the entire skill is completed."""
        pass

    def is_success(self):
        """Check if the skill executed successfully."""
        pass
```


<p class="method-name">__init__(self, robot, controller, task, cfg, *args, **kwargs)</p>
<div class="method-block">

Initialize the skill and store all required references and configuration.

<p class="method-section">Parameters: </p>

- **robot** (<span class="param-type">Robot</span>): Robot instance used to query state and apply actions.
- **controller** (<span class="param-type">BaseController</span>): Controller instance that handles motion planning and execution.
- **task** (<span class="param-type">BaseTask</span>): Task instance that owns scene objects and environment information.
- **cfg** (<span class="param-type">DictConfig</span>): Skill configuration loaded from the task YAML file.

</div>

<p class="method-name">simple_generate_manip_cmds(self)</p>
<div class="method-block">

<span style="color: red; font-weight: bold;">This is the MOST IMPORTANT method of the skill.</span> It constructs the full sequence of manipulation commands that defines how the robot executes this skill.

**Command tuple format:**

```python
(p_base_ee_tgt, q_base_ee_tgt, function_name, params)
```

**Components:**

- **p_base_ee_tgt** (<span class="param-type">np.ndarray</span>, shape `(3,)`): Target end-effector position in the arm base frame.
- **q_base_ee_tgt** (<span class="param-type">np.ndarray</span>, shape `(4,)`): Target end-effector quaternion `(w, x, y, z)` in the arm base frame.
- **function_name** (<span class="param-type">str</span>): Name of the action function to execute.
- **params** (<span class="param-type">dict</span>): Keyword arguments passed to the action function.

**Execution flow:**

1. Controller pops commands from `manip_list` one by one.
2. For each command, the target pose is passed to CuRobo for motion planning.
3. The specified action function is applied using `params` during or after the motion.
4. When the waypoint is reached (see `is_subtask_done`), the next command is processed.

**Common function names:**

- **update_pose_cost_metric** – update planning cost and constraint weights:

```python
cmd = (
    p_base_ee_cur,
    q_base_ee_cur,
    "update_pose_cost_metric",
    {"hold_vec_weight": [1, 1, 1, 0, 0, 0]},  # Hold orientation, free translation
)
manip_list.append(cmd)
```

`hold_vec_weight` format: `[angular-x, angular-y, angular-z, linear-x, linear-y, linear-z]`.

- **update_specific** – update collision-avoidance settings:

```python
cmd = (
    p_base_ee_cur,
    q_base_ee_cur,
    "update_specific",
    {
        "ignore_substring": ignore_substring,
        "reference_prim_path": self.controller.reference_prim_path,
    },
)
manip_list.append(cmd)
```

- **open_gripper** / **close_gripper** – control gripper state:

```python
cmd = (p_base_ee_pregrasp, q_base_ee_pregrasp, "open_gripper", {})
manip_list.append(cmd)

cmd = (p_base_ee_grasp, q_base_ee_grasp, "close_gripper", {})
manip_list.extend([cmd] * 40)  # Repeat for duration
```

- **attach_obj** / **detach_obj** – attach or detach objects in the physics scene:

```python
cmd = (
    p_base_ee_grasp,
    q_base_ee_grasp,
    "attach_obj",
    {"obj_prim_path": self.target_obj.mesh_prim_path},
)
manip_list.append(cmd)
```

- **dummy_forward** – apply actions directly without calling the planner:

```python
cmd = (
    p_base_ee_cur,
    q_base_ee_cur,
    "dummy_forward",
    {"arm_action": arm_action, "gripper_state": gripper_state},
)
manip_list.append(cmd)
```

</div>

<p class="method-name">is_feasible(self, th=5)</p>
<div class="method-block">

Check whether the skill should continue execution based on recent motion-planning failures.

<p class="method-section">Parameters: </p>

- **th** (<span class="param-type">int</span>, optional): Maximum number of allowed planning failures before the skill is considered infeasible. Default is `5`.

<p class="method-section">Returns:</p>

- **bool**: `True` if the skill is still feasible; `False` if too many failures occurred and the episode should terminate.

Code Example: 
```python
def is_feasible(self, th=5):
    return self.controller.num_plan_failed <= th
```

<div class="custom-warning">
<p class="custom-warning-title">Warning</p>
<p class="custom-warning-content">Typical reasons to return False: too many planning failures, unrecoverable robot state, or clearly unreachable target.</p>
</div>

</div>

<p class="method-name">is_subtask_done(self, t_eps=1e-3, o_eps=5e-3)</p>
<div class="method-block">

Check whether the robot has reached the current waypoint defined by the first command in `manip_list`.

<p class="method-section">Parameters: </p>

- **t_eps** (<span class="param-type">float</span>, optional): Translation tolerance in meters (default: `1e-3`, about 1 mm).
- **o_eps** (<span class="param-type">float</span>, optional): Orientation tolerance in radians (default: `5e-3`, about 0.3°).

<p class="method-section">Returns:</p>

- **bool**: `True` if the current waypoint is considered reached; `False` otherwise.

Code Example:
```python
def is_subtask_done(self, t_eps=1e-3, o_eps=5e-3):
    assert len(self.manip_list) != 0

    p_base_ee_cur, q_base_ee_cur = self.controller.get_ee_pose()
    p_base_ee, q_base_ee, *_ = self.manip_list[0]

    diff_trans = np.linalg.norm(p_base_ee_cur - p_base_ee)
    diff_ori = 2 * np.arccos(min(abs(np.dot(q_base_ee_cur, q_base_ee)), 1.0))

    pose_flag = np.logical_and(diff_trans < t_eps, diff_ori < o_eps)
    self.plan_flag = self.controller.num_last_cmd > 10

    return np.logical_or(pose_flag, self.plan_flag)
```

</div>

<p class="method-name">is_done(self)</p>
<div class="method-block">

Determine whether the entire skill has finished executing all planned commands.


<p class="method-section">Returns:</p>

- **bool**: `True` if all commands have been executed and `manip_list` is empty; `False` otherwise.

Code Example:
```python
def is_done(self):
    if len(self.manip_list) == 0:
        return True

    t_eps = self.skill_cfg.get("t_eps", 1e-3)
    o_eps = self.skill_cfg.get("o_eps", 5e-3)

    if self.is_subtask_done(t_eps=t_eps, o_eps=o_eps):
        self.manip_list.pop(0)

    return len(self.manip_list) == 0
```

**Logic**: if the list is empty, the skill is done; otherwise, when the current waypoint is done, pop it and check again.

</div>

---

<p class="method-name">is_success(self)</p>
<div class="method-block">

Evaluate task-specific success conditions at the end of the skill. This method defines what "success" means for the given manipulation skill.

<p class="method-section">Returns:</p>

- **bool**: `True` if all success conditions are satisfied; `False` otherwise.

Code Example:
```python
def is_success(self):
    flag = True

    # Check object contact
    _, indices = self.get_contact()
    if self.gripper_cmd == "close_gripper":
        flag = len(indices) >= 1

    # Check motion validity
    self.process_valid = (
        np.max(np.abs(self.robot.get_joints_state().velocities)) < 5
        and np.max(np.abs(self.target_obj.get_linear_velocity())) < 5
    )
    flag = flag and self.process_valid

    return flag
```

<div class="custom-warning">
<p class="custom-warning-title">Warning</p>
<p class="custom-warning-content">For pick skills, the object is in stable contact and lifted; for place skills, the object is near the target pose and released; for articulation skills, the articulated joints reach the desired configuration.</p>
</div>

</div>


## Registration

Add to `workflows/simbox/core/skills/__init__.py`:

```python
from core.skills.new_skill import NewSkill

__all__ = [
    # ... existing skills
    "NewSkill",
]
```

## Usage

```yaml
skills:
  - lift2:
      - left:
          - name: new_skill
            objects: [target_object]
            custom_param: 0.1
```

## Checklist

- [ ] Create skill file in `workflows/simbox/core/skills/`
- [ ] Implement `__init__`
- [ ] Implement `simple_generate_manip_cmds()`
- [ ] Implement `is_feasible()`
- [ ] Implement `is_subtask_done()`
- [ ] Implement `is_done()`
- [ ] Implement `is_success()`
- [ ] Register in `__init__.py`
- [ ] Test with task config