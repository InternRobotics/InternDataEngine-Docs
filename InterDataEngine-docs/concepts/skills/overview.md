---
title: Skills Overview
description: Manipulation skills for robotic tasks in InternDataEngine
---

# Skills Overview

Skills define **atomic manipulation actions** that robots can perform, such as picking, placing, or moving objects. Each skill encapsulates a specific behavior and generates a sequence of manipulation commands for the controller to execute.

## Architecture

All skills inherit from `BaseSkill` defined in `workflows/simbox/core/skills/base_skill.py`.

```
workflows/simbox/core/skills/
├── base_skill.py           # Abstract base class
├── __init__.py             # Skill registry
│
├── Pick-and-Place Skills
│   ├── pick.py             # Standard pick operation
│   ├── place.py            # Standard place operation
│   ├── dexpick.py          # Dex-style pick with approach
│   ├── dexplace.py         # Dex-style place with constraints
│   ├── manualpick.py       # Manual grasp pose specification
│   ├── dynamicpick.py      # Dynamic grasp selection
│   └── failpick.py         # Failure case pick
│
├── Articulation-Related Skills
│   ├── open.py             # Open gripper/articulation
│   ├── close.py            # Close gripper/articulation
│   ├── rotate.py           # Rotate articulation joint
│   └── artpreplan.py       # Articulation pre-planning
│
├── Heuristic Skills
│   ├── goto_pose.py        # Move to target pose
│   ├── gripper_action.py   # Generic gripper action
│   ├── heuristic_skill.py  # Configurable heuristic actions
│   ├── joint_ctrl.py       # Joint-level control
│   └── wait.py             # Wait for duration
│
└── Task-Specific Skills
    ├── move.py             # Cartesian motion
    ├── track.py            # Trajectory tracking
    ├── approach_rotate.py  # Approach with rotation
    ├── flip.py             # Flip object
    ├── scan.py             # Scan motion
    └── pour_water_succ.py  # Pouring action
```

## Skill Template

All skills inherit from `BaseSkill` and implement a standard interface:

```python
from core.skills.base_skill import BaseSkill, register_skill

@register_skill
class MySkill(BaseSkill):
    """Custom manipulation skill."""

    def __init__(self, robot, controller, task, cfg, *args, **kwargs):
        super().__init__()
        self.robot = robot
        self.controller = controller
        self.task = task
        self.skill_cfg = cfg
        self.manip_list = []

    def simple_generate_manip_cmds(self):
        """Generate the manipulation command list (REQUIRED)."""
        # Build manip_list with (position, quaternion, function, params) tuples
        pass

    def is_feasible(self, th=5):
        """Check if skill can continue based on planning failures."""
        return self.controller.num_plan_failed <= th

    def is_subtask_done(self, t_eps=1e-3, o_eps=5e-3):
        """Check if current waypoint is reached."""
        pass

    def is_done(self):
        """Check if all commands are executed."""
        return len(self.manip_list) == 0

    def is_success(self):
        """Check if skill succeeded."""
        pass
```

For detailed implementation instructions, see the [Custom Skill Guide](/custom/skill/).

## Core Concepts

### Manipulation Command List

Each skill generates a `manip_list` — a sequence of command tuples defining waypoint poses and actions:

```python
manip_list = [
    (p_base_ee_tgt, q_base_ee_tgt, function_name, params),
    # ... more commands
]
```

**Command tuple structure:**

| Component | Type | Description |
|-----------|------|-------------|
| `p_base_ee_tgt` | `np.ndarray (3,)` | Target end-effector position in arm base frame |
| `q_base_ee_tgt` | `np.ndarray (4,)` | Target end-effector quaternion `(w, x, y, z)` |
| `function_name` | `str` | Action function to execute |
| `params` | `dict` | Parameters for the action function |

**Common action functions:**

- `open_gripper` / `close_gripper` — Gripper control
- `attach_obj` / `detach_obj` — Physics attachment
- `update_pose_cost_metric` — Planning weight adjustment
- `update_specific` — Collision avoidance settings
- `dummy_forward` — Direct action without planning


### Execution Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Skill Execution Pipeline                  │
├──────────────────────────────────────────────────────────────┤
│  1. Initialize skill with YAML config                        │
│  2. Generate manip_list via simple_generate_manip_cmds()     │
│  3. Pop next command from manip_list                         │
│  4. Plan motion trajectory with CuRobo controller            │
│  5. Execute motion and apply action function                 │
│  6. Check is_subtask_done() → if True, pop next command      │
│  7. Repeat until is_done() returns True                      │
│  8. Evaluate is_success() for final task status              │
└──────────────────────────────────────────────────────────────┘
```
