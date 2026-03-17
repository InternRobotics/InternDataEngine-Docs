---
title: Skills
description: Manipulation skills for robotic tasks in InternDataEngine
---

# Skills

Skills are the fundamental building blocks of robotic manipulation in InternDataEngine. Each skill defines an atomic action that a robot can perform, from simple gripper operations to complex manipulation sequences.

## Quick Navigation

| Category | Description |
|----------|-------------|
| [Overview](/concepts/skills/overview) | Skill architecture and available skills |
| [Pick Skill](/concepts/skills/pick) | Grasping and lifting objects |
| [Place Skill](/concepts/skills/place) | Placing objects at target locations |
| [Articulation Skill](/concepts/skills/articulation) | Operating articulated objects (doors, drawers) |

## What is a Skill?

A skill encapsulates:

- **Motion Planning**: Trajectory generation using CuRobo
- **Execution Control**: Step-by-step command execution
- **State Monitoring**: Success/failure evaluation
- **Gripper Actions**: Open/close operations

## Skill Categories

### Manipulation Skills

Skills for interacting with objects in the environment:

- **Pick**: Grasp and lift objects using sampled grasp poses
- **Place**: Position objects at target locations
- **Articulation**: Operate doors, drawers, and other articulated objects

### Motion Skills

Skills for robot movement:

- `goto_pose` - Move to a target end-effector pose
- `move` - Cartesian motion in a direction
- `rotate` - Rotate the end-effector

### Utility Skills

Helper skills for common operations:

- `home` - Return to home configuration
- `open` / `close` - Gripper control
- `wait` - Pause execution

## Getting Started

1. Read the [Skills Overview](/concepts/skills/overview) to understand the architecture
2. Learn about [Pick Skill](/concepts/skills/pick) for grasping objects
3. Explore [Place Skill](/concepts/skills/place) for placing operations
4. Check [Articulation Skill](/concepts/skills/articulation) for operating doors and drawers

## Related Topics

- [Tasks](/concepts/tasks/) - Combine skills into complete workflows
- [Controllers](/concepts/controllers/) - Understand motion control
- [Custom Skill](/custom/skill/) - Create your own skills