---
title: Skills API
description: Skills module API reference
---

# Skills API Reference

This page provides API documentation for the skills module.

## BaseSkill

Base class for all manipulation skills.

### Constructor

```python
BaseSkill(cfg, task, controller, **kwargs)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cfg` | DictConfig | Skill configuration |
| `task` | BananaBaseTask | Task instance |
| `controller` | TemplateController | Controller instance |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `skill_cfg` | dict | Skill-specific configuration |
| `task` | BananaBaseTask | Reference to task |
| `controller` | TemplateController | Reference to controller |

### Methods

#### `run() -> bool`

Execute the skill. **Must be implemented by subclass.**

**Returns:** `bool` - Success status

---

## Dexpick

Dex-style picking skill with approach planning.

```python
class Dexpick(BaseSkill):
    def __init__(self, cfg, task, controller, **kwargs)
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `objects` | List[str] | required | Objects to pick |
| `pick_pose_idx` | int | 0 | Pick pose group index |
| `pre_grasp_offset` | float | 0.0 | Pre-grasp approach offset |
| `post_grasp_offset` | float | 0.1 | Post-grasp lift offset |

---

## Dexplace

Dex-style placing skill with constraints.

```python
class Dexplace(BaseSkill):
    def __init__(self, cfg, task, controller, **kwargs)
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `objects` | List[str] | required | [object, target] |
| `camera_axis_filter` | dict | None | Camera constraint |

---

## Pick

Standard pick skill.

```python
class Pick(BaseSkill):
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `objects` | List[str] | required | Objects to pick |

---

## Place

Standard place skill.

```python
class Place(BaseSkill):
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `objects` | List[str] | required | [object, target] |

---

## GotoPose

Move to target pose skill.

```python
class GotoPose(BaseSkill):
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `target_pose` | tuple | required | (position, orientation) |

---

## Home

Return to home configuration.

```python
class Home(BaseSkill):
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | str | "default" | Home configuration mode |

---

## Open / Close

Gripper control skills.

```python
class Open(BaseSkill):
    def run(self) -> bool
        self.controller.set_gripper_state(1.0)

class Close(BaseSkill):
    def run(self) -> bool
        self.controller.set_gripper_state(-1.0)
```

---

## PourWaterSucc

Pouring skill for liquid simulation.

```python
class PourWaterSucc(BaseSkill):
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `objects` | List[str] | required | [container, target] |
| `pour_angle` | float | 90.0 | Pouring angle (degrees) |

---

## Rotate

Rotation skill.

```python
class Rotate(BaseSkill):
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `axis` | str | "z" | Rotation axis |
| `angle` | float | 90.0 | Rotation angle (degrees) |

---

## Wait

Wait skill for timing control.

```python
class Wait(BaseSkill):
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `duration` | float | 1.0 | Wait duration (seconds) |

---

## HeuristicSkill

Configurable skill for simple actions.

```python
class HeuristicSkill(BaseSkill):
    def run(self) -> bool
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | str | "home" | Action mode |
| `gripper_state` | float | None | Gripper state to set |