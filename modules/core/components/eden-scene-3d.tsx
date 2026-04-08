"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const ACCENT_RGB = { r: 0.176, g: 0.831, b: 0.749 }; // #2dd4bf in 0-1 range
const SCENE_BG = 0x0b1622;
const FOG_NEAR = 8;
const FOG_FAR = 45;

const SHAPE_COUNT = 38;
const PARALLAX_STRENGTH = 0.4;

type Shape = {
  mesh: THREE.Mesh;
  driftSpeed: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  basePosition: THREE.Vector3;
};

export function EdenScene3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const container = containerRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // ── Scene setup ──────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_BG);
    scene.fog = new THREE.Fog(SCENE_BG, FOG_NEAR, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    container.appendChild(renderer.domElement);

    // ── Lights ───────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x4a8b9c, 0.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x2dd4bf, 0.8);
    keyLight.position.set(10, 8, 12);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x84e1d4, 0.3);
    rimLight.position.set(-10, -5, -8);
    scene.add(rimLight);

    const centerGlow = new THREE.PointLight(0x2dd4bf, 1.2, 25, 1.5);
    centerGlow.position.set(0, 0, 0);
    scene.add(centerGlow);

    // ── Shape factory ────────────────────────────────────
    const geometries = [
      new THREE.IcosahedronGeometry(0.8, 0),
      new THREE.OctahedronGeometry(0.9, 0),
      new THREE.TorusKnotGeometry(0.5, 0.18, 64, 8),
      new THREE.TetrahedronGeometry(1.0, 0),
      new THREE.DodecahedronGeometry(0.7, 0),
    ];

    const shapes: Shape[] = [];

    for (let i = 0; i < SHAPE_COUNT; i++) {
      const geometry = geometries[i % geometries.length];

      const opacity = 0.12 + Math.random() * 0.18;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(ACCENT_RGB.r, ACCENT_RGB.g, ACCENT_RGB.b),
        emissive: new THREE.Color(ACCENT_RGB.r * 0.5, ACCENT_RGB.g * 0.5, ACCENT_RGB.b * 0.5),
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity,
        wireframe: Math.random() > 0.6,
      });

      const mesh = new THREE.Mesh(geometry, material);

      const radius = 8 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi) - 5;

      mesh.position.set(x, y, z);

      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      const scale = 0.4 + Math.random() * 1.2;
      mesh.scale.setScalar(scale);

      scene.add(mesh);

      shapes.push({
        mesh,
        driftSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.002
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004
        ),
        basePosition: new THREE.Vector3(x, y, z),
      });
    }

    // ── Mouse parallax ───────────────────────────────────
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    function handleMouseMove(e: MouseEvent) {
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    window.addEventListener("mousemove", handleMouseMove);

    // ── Resize ───────────────────────────────────────────
    function handleResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    // ── Animation loop ───────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      const elapsed = clock.getElapsedTime();

      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x * PARALLAX_STRENGTH;
      camera.position.y = -mouse.y * PARALLAX_STRENGTH;
      camera.lookAt(0, 0, 0);

      for (const shape of shapes) {
        shape.mesh.rotation.x += shape.rotationSpeed.x;
        shape.mesh.rotation.y += shape.rotationSpeed.y;
        shape.mesh.rotation.z += shape.rotationSpeed.z;

        shape.mesh.position.x = shape.basePosition.x + Math.sin(elapsed * 0.3 + shape.basePosition.y) * 0.5;
        shape.mesh.position.y = shape.basePosition.y + Math.cos(elapsed * 0.25 + shape.basePosition.x) * 0.5;
        shape.mesh.position.z = shape.basePosition.z + Math.sin(elapsed * 0.2 + shape.basePosition.z) * 0.3;
      }

      centerGlow.intensity = 1.0 + Math.sin(elapsed * 0.8) * 0.3;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    }
    animate();

    // ── Cleanup ──────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      shapes.forEach((s) => {
        if (s.mesh.material instanceof THREE.Material) s.mesh.material.dispose();
      });
      geometries.forEach((g) => g.dispose());

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}
