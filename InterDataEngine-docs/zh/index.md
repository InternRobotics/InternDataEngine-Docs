---
layout: home

hero:
  name: "InternDataEngine"
  text: "仿真数据生成引擎"
  tagline: 面向机器人操作学习的可扩展仿真平台
  image:
    src: /hero-image.svg
    alt: InternDataEngine
  actions:
    - theme: brand
      text: 开始使用
      link: /zh/guides/introduction
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/your-org/InternDataEngine

features:
  - icon: 🤖
    title: 双臂机器人
    details: 支持多种双臂机器人平台，包括 Lift2、Split Aloha、Genie1 和 Franka 系列
  - icon: ⚡
    title: CuRobo 集成
    details: 基于 CuRobo 的高效运动规划，支持 GPU 加速的碰撞检测
  - icon: 🎲
    title: 域随机化
    details: 内置纹理、光照、相机位姿和物体放置的域随机化功能
  - icon: 🌐
    title: Isaac Sim 后端
    details: 基于 NVIDIA Isaac Sim 的物理精确仿真，支持照片级渲染
  - icon: 📦
    title: YAML 配置
    details: 使用 YAML 文件进行简单灵活的任务配置
  - icon: 🔧
    title: 可扩展架构
    details: 模块化设计，轻松添加新机器人、技能和任务
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #bd34fe 50%, #47caff 50%);
  --vp-home-hero-image-filter: blur(44px);
}
</style>