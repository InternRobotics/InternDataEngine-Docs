---
title: Cameras
description: Camera configuration for simulation in InternDataEngine
---

# Cameras

Cameras capture visual data from the simulation. InternDataEngine uses a unified `CustomCamera` class that can be fully configured via YAML.

## Camera Architecture

```
CustomCamera
├── Pose Configuration
│   ├── Translation
│   └── Orientation
├── Intrinsics
│   ├── Focal length
│   ├── Principal point
│   └── Resolution
├── Lens Settings
│   ├── f-number
│   ├── Focus distance
│   └── Aperture
└── Outputs
    ├── RGB image
    └── Camera pose
```

## Camera Configuration

Camera configuration is split into two parts: **pose configuration** (in task YAML) and **intrinsic parameters** (in separate camera YAML files).

### Part 1: Pose Configuration (Task YAML)

Configure camera pose and randomization in task YAML files:

```yaml
cameras:
  - name: lift2_hand_left                  # Unique camera name
    translation: [0.07, 0.01, 0.08]        # Position offset [x, y, z] in meters
    orientation: [0.62, 0.33, -0.33, -0.62] # Quaternion [w, x, y, z]
    camera_axes: usd                       # Coordinate system (usd/ros/opencv)
    camera_file: workflows/simbox/core/configs/cameras/realsense_d405.yaml  # Path to intrinsic config
    parent: "lift2/lift2/lift2/fl/link6"   # Parent prim path (robot link or empty for world)
    apply_randomization: True              # Enable pose randomization
    max_translation_noise: 0.02            # Max position noise (meters)
    max_orientation_noise: 2.5             # Max rotation noise (degrees)
```

### Part 2: Intrinsic Parameters (Camera YAML)

Define camera intrinsics in a separate YAML file (e.g., `workflows/simbox/core/configs/cameras/realsense_d405.yaml`):

```yaml
camera_type: "RealSense"                   # Camera model type
camera_params: [433.89, 433.38, 322.79, 243.14]  # [fx, fy, cx, cy] intrinsic parameters
resolution_width: 640                      # Image width in pixels
resolution_height: 480                     # Image height in pixels
frequency: 30                              # Capture frequency (Hz)
pixel_size: 3                              # Physical pixel size (μm)
f_number: 2.0                              # Lens aperture f-number
focus_distance: 0.6                        # Focus distance (meters)
```
## Understanding Camera Parameters

### Intrinsic Matrix

The camera intrinsic matrix K:

```
K = | fx  0  cx |
    |  0 fy  cy |
    |  0  0   1 |

fx, fy = focal lengths (pixels)
cx, cy = principal point (pixels)
```

### Sensor Settings

- **resolution_width** (<span class="param-type">int</span>): Image width in pixels. Typical value: 640 - 1920.
- **resolution_height** (<span class="param-type">int</span>): Image height in pixels. Typical value: 480 - 1080.
- **pixel_size** (<span class="param-type">float</span>): Physical pixel size (μm). Typical value: 1.4 - 3.0.
- **f_number** (<span class="param-type">float</span>): Lens aperture. Typical value: 1.8 - 4.0.
- **focus_distance** (<span class="param-type">float</span>): Focus distance (m). Typical value: 0.3 - 1.0.
- **frequency** (<span class="param-type">int</span>): Capture frequency (Hz). Typical value: 15 - 60.

## Camera Mounting

### Robot-Mounted

Attach to robot link:

```yaml
parent: "lift2/lift2/lift2/fl/link6"  # End-effector link
translation: [0.07, 0.01, 0.08]       # Offset from link
```

### World-Fixed

Fixed in world frame:

```yaml
parent: ""
translation: [0.5, 0.5, 1.2]
orientation: [0.707, 0.707, 0, 0]  # Looking down
```

## Domain Randomization

Enable camera pose randomization with the `_perturb_camera()` method defined in `workflows/simbox/core/tasks/banana.py`:

```yaml
cameras:
  - name: head_camera
    apply_randomization: true
    max_translation_noise: 0.03   # ±3 cm
    max_orientation_noise: 5.0    # ±5 degrees
```

## Camera Outputs

`CustomCamera.get_observations()` returns:

- **color_image** (<span class="param-type">ndarray</span>): RGB image with shape H×W×3 (float32).
- **camera2env_pose** (<span class="param-type">ndarray</span>): Camera to environment transform matrix with shape 4×4.
- **camera_params** (<span class="param-type">ndarray</span>): Intrinsic matrix K with shape 3×3.

## Key Files

| File | Purpose |
|------|---------|
| `cameras/custom_camera.py` | CustomCamera implementation |
| `cameras/__init__.py` | Camera registry |

## References

- [Isaac Sim Camera Sensors Documentation](https://docs.isaacsim.omniverse.nvidia.com/4.5.0/sensors/isaacsim_sensors_camera.html)
- [Intel RealSense D415 Product Brief](https://simplecore.intel.com/realsensehub/wp-content/uploads/sites/63/D415_Series_ProductBrief_010718.pdf)
- [Intel RealSense D435 Product Brief](https://simplecore.intel.com/realsensehub/wp-content/uploads/sites/63/D435_Series_ProductBrief_010718.pdf)
- [Camera Frame Axes Reference](https://www.researchgate.net/figure/Axes-of-the-camera-frame-on-the-camera-CCD-and-lens_fig3_225025509)