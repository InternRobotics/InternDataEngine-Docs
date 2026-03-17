---
title: 域随机化
description: InternDataEngine 域随机化设置
---

# 域随机化

域随机化通过变化仿真参数生成多样化的训练数据，帮助弥合仿真到真实的差距并提高模型泛化能力。

## 随机化类型

### 1. 环境贴图随机化

**配置示例**

```yaml
# 源文件：configs/manip/simbox/pick_and_place/lift2/single_pick/left/omniobject3d-banana.yaml
env_map:
  envmap_lib: envmap_lib
  apply_randomization: True
  intensity_range: [4000, 7000]
  rotation_range: [0, 180]
```

**代码示例**

```python
# 源文件：workflows/simbox/core/tasks/banana.py
def _set_envmap(self):
    """随机化或重置环境贴图（HDR 穹顶光）。"""
    cfg = self.cfg["env_map"]
    if cfg.get("light_type", "DomeLight") == "DomeLight":
        envmap_hdr_path_list = glob.glob(os.path.join(self.asset_root, cfg["envmap_lib"], "*.hdr"))
        envmap_hdr_path_list.sort()
        if cfg.get("apply_randomization", False):
            envmap_id = random.randint(0, len(envmap_hdr_path_list) - 1)
            intensity = random.uniform(cfg["intensity_range"][0], cfg["intensity_range"][1])
            rotation = [random.uniform(cfg["rotation_range"][0], cfg["rotation_range"][1]) for _ in range(3)]
        else:
            envmap_id = 0
            intensity = 1000.0
            rotation = [0.0, 0.0, 0.0]
        dome_prim_path = f"{self.root_prim_path}/DomeLight"
        envmap_hdr_path = envmap_hdr_path_list[envmap_id]

        if not is_prim_path_valid(dome_prim_path):
            self.dome_light_prim = UsdLux.DomeLight.Define(self.stage, dome_prim_path)
            UsdGeom.Xformable(self.dome_light_prim).AddRotateXYZOp().Set((rotation[0], rotation[1], rotation[2]))
        else:
            self.dome_light_prim.GetOrderedXformOps()[0].Set((rotation[0], rotation[1], rotation[2]))
        self.dome_light_prim.GetIntensityAttr().Set(intensity)
        self.dome_light_prim.GetTextureFileAttr().Set(envmap_hdr_path)
```

---

### 2. 纹理随机化

**配置示例**

```yaml
# 源文件：workflows/simbox/core/configs/arenas/pick_randomized_arena.yaml
fixtures:
  -
    name: table
    path: table0/instance.usd
    target_class: GeometryObject
    translation: [0.0, 0.0, 0.375]
    scale: [0.001, 0.001053, 0.001056]
    texture:
      texture_lib: "table_textures"
      apply_randomization: True
      texture_id: 0
      texture_scale: [0.001, 0.001]
```

**代码示例**

```python
# 源文件：workflows/simbox/core/objects/plane_object.py
def apply_texture(self, asset_root, cfg):
    texture_name = cfg["texture_lib"]
    texture_path_list = glob.glob(os.path.join(asset_root, texture_name, "*"))
    texture_path_list.sort()
    if cfg.get("apply_randomization", False):
        texture_id = random.randint(0, len(texture_path_list) - 1)
    else:
        texture_id = cfg["texture_id"]
    texture_path = texture_path_list[texture_id]
    mat_prim_path = f"{self.prim_path}/Looks/Material"
    if not is_prim_path_valid(mat_prim_path):
        self.mat = OmniPBR(
            prim_path=mat_prim_path,
            name="Material",
            texture_path=texture_path,
            texture_scale=cfg.get("texture_scale"),
        )
        self.apply_visual_material(self.mat)
    else:
        self.mat.set_texture(
            texture_path,
        )
```

---

### 3. 相机位姿随机化

**配置示例**

```yaml
# 源文件：configs/manip/simbox/pick_and_place/lift2/single_pick/left/omniobject3d-banana.yaml
cameras:
  -
    name: lift2_hand_left
    translation: [0.07, 0.01, 0.08]
    orientation: [0.62, 0.33, -0.33, -0.62]
    camera_axes: usd
    params:
      camera_type: "RealSense"
      camera_params: [433.89, 433.38, 322.79, 243.14]
      resolution_width: 640
      resolution_height: 480
      frequency: 30
      pixel_size: 3
      f_number: 2.0
      focus_distance: 0.6
    parent: "lift2/lift2/lift2/fl/link6"
    apply_randomization: True
    max_translation_noise: 0.02
    max_orientation_noise: 2.5
```

**代码示例**

```python
# 源文件：workflows/simbox/core/tasks/banana.py
def _perturb_camera(self, camera, cfg, max_translation_noise=0.05, max_orientation_noise=10.0):
    translation = np.array(cfg["translation"])
    orientation = np.array(cfg["orientation"])

    random_direction = np.random.randn(3)
    random_direction /= np.linalg.norm(random_direction)
    random_distance = np.random.uniform(0, max_translation_noise)
    perturbed_translation = translation + random_direction * random_distance

    original_rot = R.from_quat(orientation, scalar_first=True)
    random_axis = np.random.randn(3)
    random_axis /= np.linalg.norm(random_axis)
    random_angle_deg = np.random.uniform(-max_orientation_noise, max_orientation_noise)
    random_angle_rad = np.radians(random_angle_deg)
    perturbation_rot = R.from_rotvec(random_axis * random_angle_rad)
    perturbed_rot = perturbation_rot * original_rot
    perturbed_orientation = perturbed_rot.as_quat(scalar_first=True)

    camera.set_local_pose(
        translation=perturbed_translation,
        orientation=perturbed_orientation,
        camera_axes=cfg["camera_axes"],
    )
```

---

### 4. 区域随机化

**配置示例**

```yaml
# 源文件：configs/manip/simbox/pick_and_place/lift2/single_pick/left/omniobject3d-banana.yaml
regions:
  -
    object: pick_object_left
    target: table
    random_type: A_on_B_region_sampler
    random_config:
      pos_range: [
        [-0.35, -0.25, 0.0],
        [0.05, 0.05, 0.0]
      ]
      yaw_rotation: [-180.0, 180.0]
  -
    object: lift2
    target: table
    random_type: A_on_B_region_sampler
    random_config:
      pos_range: [
        [-0.025, -0.80, -0.775],
        [0.025, -0.80, -0.67]
      ]
      yaw_rotation: [-0.0, 0.0]
```

**代码示例**

```python
# 源文件：workflows/simbox/core/tasks/banana.py
def _set_regions(self):
    """根据区域配置随机化物体位姿。"""
    random_region_list = deepcopy(self.random_region_list)
    for cfg in self.cfg["regions"]:
        obj = self._task_objects[cfg["object"]]
        tgt = self._task_objects[cfg["target"]]
        if "sub_tgt_prim" in cfg:
            tgt = XFormPrim(prim_path=tgt.prim_path + cfg["sub_tgt_prim"])
        if "priority" in cfg:
            if cfg["priority"]:
                idx = random.choice(cfg["priority"])
            else:
                idx = random.randint(0, len(random_region_list) - 1)
            random_config = (random_region_list.pop(idx))["random_config"]
            sampler_fn = getattr(RandomRegionSampler, cfg["random_type"])
            pose = sampler_fn(obj, tgt, **random_config)
            obj.set_local_pose(*pose)
        elif "container" in cfg:
            container = self._task_objects[cfg["container"]]
            obj_trans = container.get_local_pose()[0]
            x_bias = random.choice(container.gap) if container.gap else 0
            obj_trans[0] += x_bias
            obj_trans[2] += cfg["z_init"]
            obj_ori = obj.get_local_pose()[1]
            obj.set_local_pose(obj_trans, obj_ori)
        elif "target2" in cfg:
            tgt2 = self._task_objects[cfg["target2"]]
            sampler_fn = getattr(RandomRegionSampler, cfg["random_type"])
            pose = sampler_fn(obj, tgt, tgt2, **cfg["random_config"])
            obj.set_local_pose(*pose)
        else:
            sampler_fn = getattr(RandomRegionSampler, cfg["random_type"])
            pose = sampler_fn(obj, tgt, **cfg["random_config"])
            obj.set_local_pose(*pose)

# 源文件：workflows/simbox/core/utils/region_sampler.py
@staticmethod
def A_on_B_region_sampler(obj, tgt, pos_range, yaw_rotation):
    # 平移
    shift = np.random.uniform(*pos_range)
    bbox_obj = compute_bbox(obj.prim)
    obj_z_min = bbox_obj.min[2]
    bbox_tgt = compute_bbox(tgt.prim)
    tgt_center = (np.asarray(bbox_tgt.min) + np.asarray(bbox_tgt.max)) / 2
    tgt_z_max = bbox_tgt.max[2]
    place_pos = np.zeros(3)
    place_pos[0] = tgt_center[0]
    place_pos[1] = tgt_center[1]
    place_pos[2] = (
        tgt_z_max + (obj.get_local_pose()[0][2] - obj_z_min) + 0.001
    )  # 添加一个小值以避免穿透
    place_pos += shift
    # 方向
    yaw = np.random.uniform(*yaw_rotation)
    dr = R.from_euler("xyz", [0.0, 0.0, yaw], degrees=True)
    r = R.from_quat(obj.get_local_pose()[1], scalar_first=True)
    orientation = (dr * r).as_quat(scalar_first=True)
    return place_pos, orientation
```

## 随机化工具

### `dr.py` 模块

`dr.py` 模块提供域随机化工具：

```python
from workflows.simbox.core.utils.dr import (
    get_category_euler,
    get_category_scale,
)

# 获取类别的随机欧拉角
euler = get_category_euler("bottle")  # [rx, ry, rz]

# 获取类别的随机缩放
scale = get_category_scale("bottle")  # [sx, sy, sz]
```

### `constants.py` 模块

定义类别特定的随机化参数：

```python
from workflows.simbox.core.utils.constants import CATEGORIES

CATEGORIES = {
    "bottle": {
        "euler_range": [[80, 100], [-10, 10], [-180, 180]],
        "scale_range": [0.9, 1.1],
    },
    "box": {
        "euler_range": [[85, 95], [-5, 5], [-180, 180]],
        "scale_range": [0.95, 1.05],
    },
}
```

## 关键文件

| 文件 | 用途 |
|------|------|
| `utils/dr.py` | 随机化工具 |
| `utils/constants.py` | 类别参数 |
| `tasks/banana.py` | 随机化实现 |

## 参考资料

- [Omni6DPose: A Benchmark and Model for Universal 6D Object Pose Estimation and Tracking (ECCV 2024)](https://jiyao06.github.io/Omni6DPose/)