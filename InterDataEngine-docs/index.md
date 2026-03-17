---
layout: home

hero:
  name: "InternDataEngine"
  tagline: Pioneering High-Fidelity Synthetic Data Generator for Robotic Manipulation
  image:
    src: public/logo.png
    alt: InternDataEngine
  actions:
    - theme: brand
      text: Get Started
      link: /guides/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/InternRobotics/InternDataEngine

features:
  - icon: 🤖
    title: Dual-Arm Robots
    details: Support for multiple dual-arm robot platforms including Lift2, Split Aloha, Genie1, and Franka series
  - icon: ⚡
    title: CuRobo Integration
    details: Efficient motion planning powered by CuRobo with GPU-accelerated collision checking
  - icon: 🎲
    title: Domain Randomization
    details: Built-in domain randomization for textures, lighting, camera poses, and object placements
  - icon: 🌐
    title: Isaac Sim Backend
    details: Physics-accurate simulation using NVIDIA Isaac Sim with photorealistic rendering
  - icon: 📦
    title: YAML Configuration
    details: Simple and flexible task configuration using YAML files
  - icon: 🔧
    title: Extensible Architecture
    details: Easy to add new robots, skills, and tasks through modular design
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);
}

/* Adjust hero section spacing */
.VPHero {
  padding-top: 80px !important;
  padding-bottom: 20px !important;
}

/* Adjust name size */
.VPHero .name {
  font-size: 3.5rem !important;
  margin-bottom: 1rem !important;
}

/* Adjust tagline size */
.VPHero .tagline {
  font-size: 1.25rem !important;
  line-height: 1.6 !important;
}

/* Enlarge hero image */
.VPHero .image {
  width: 600px !important;
  height: 600px !important;
}

.VPHero .image img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
}

/* Align left content and right image vertically */
.VPHero .container {
  align-items: center !important;
}

.VPHero .main {
  margin: auto 0 !important;
}

/* Add section title before features */
.VPFeatures {
  padding-top: 20px !important;
  margin-top: 0 !important;
}

.VPFeatures .container {
  display: flex;
  flex-direction: column;
}

.VPFeatures .items {
  margin-top: 50px;
  position: relative;
  overflow: visible;
}

.VPFeatures .items::before {
  content: 'Key Features';
  position: absolute;
  top: -140px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.4;
  background: linear-gradient(120deg, #bd34fe 30%, #41d1ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  overflow: visible;
}

.VPFeatures .items::after {
  content: 'Explore the powerful capabilities that make InternDataEngine the ideal choice for robotic manipulation data generation.';
  position: absolute;
  top: -70px;
  left: 0;
  right: 0;
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 1.1rem;
  line-height: 1.4;
}

/* Enlarge feature text */
.VPFeature .title {
  font-size: 1.25rem !important;
}

.VPFeature .details {
  font-size: 1rem !important;
  line-height: 1.6 !important;
}

.VPFeature .icon {
  font-size: 2.5rem !important;
}
</style>