import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useRain } from '../../contexts/RainContext';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './RainEffect.module.css';

// 像素雨丝尺寸（像素）
const RAIN_WIDTH = 2;
const RAIN_LENGTH = 18;
// 飞溅粒子尺寸
const SPLASH_SIZE = 3;
// 飞溅粒子池大小
const SPLASH_COUNT = 200;
// 雨声音频路径（与 MusicPlayer 一样用 BASE_URL 前缀）
const RAIN_SOUND = import.meta.env.BASE_URL + 'music/rain.mp3';

interface Drop {
  x: number; // 雨丝底端 x
  y: number; // 雨丝底端 y（three 坐标，向上增长，顶部为 height）
  speed: number; // 下落速度 px/s
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
}

interface Obstacle {
  left: number;
  right: number;
  topY: number; // 障碍物顶部的 three y
}

export default function RainEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rainMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const splashMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { raining } = useRain();
  const { theme } = useTheme();

  useEffect(() => {
    if (!raining || !containerRef.current) return;
    const container = containerRef.current;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const isMobile = width < 768;
    const dropCount = isMobile ? 200 : 400;

    // 场景与正交相机（three 坐标 y 向上，屏幕坐标 y 向下，转换见 updateObstacles）
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, width, height, 0, -10, 10);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 雨丝（细长像素条）
    const rainGeo = new THREE.PlaneGeometry(RAIN_WIDTH, RAIN_LENGTH);
    const rainMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d4, transparent: true, opacity: 0.55 });
    const rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, dropCount);
    rainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(rainMesh);
    rainMaterialRef.current = rainMat;

    // 飞溅粒子（小像素方块）
    const splashGeo = new THREE.PlaneGeometry(SPLASH_SIZE, SPLASH_SIZE);
    const splashMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d4, transparent: true, opacity: 0.85 });
    const splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, SPLASH_COUNT);
    splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(splashMesh);
    splashMaterialRef.current = splashMat;

    // 雨滴数据
    const drops: Drop[] = Array.from({ length: dropCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 400 + Math.random() * 300,
    }));

    // 飞溅粒子池
    const particles: SplashParticle[] = Array.from({ length: SPLASH_COUNT }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false,
    }));
    let splashIndex = 0;

    // 障碍物：四个卡片顶部 + 屏幕底部
    let obstacles: Obstacle[] = [];
    function updateObstacles() {
      obstacles = [];
      document.querySelectorAll('[data-rain-obstacle]').forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        obstacles.push({ left: rect.left, right: rect.right, topY: height - rect.top });
      });
    }
    updateObstacles();

    const dummy = new THREE.Object3D();

    // 初始化雨丝实例矩阵
    for (let i = 0; i < dropCount; i++) {
      const d = drops[i];
      dummy.position.set(d.x, d.y + RAIN_LENGTH / 2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      rainMesh.setMatrixAt(i, dummy.matrix);
    }
    rainMesh.instanceMatrix.needsUpdate = true;

    // 初始化飞溅实例矩阵（全部隐藏）
    for (let i = 0; i < SPLASH_COUNT; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      splashMesh.setMatrixAt(i, dummy.matrix);
    }
    splashMesh.instanceMatrix.needsUpdate = true;

    function spawnSplash(x: number, y: number) {
      const n = 6 + Math.floor(Math.random() * 5); // 6~10 个
      for (let i = 0; i < n; i++) {
        const p = particles[splashIndex];
        splashIndex = (splashIndex + 1) % SPLASH_COUNT;
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.2 * Math.PI; // 朝上散开
        const speed = 60 + Math.random() * 120;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 0.3 + Math.random() * 0.25;
        p.active = true;
      }
    }

    function stepRain(dt: number) {
      for (let i = 0; i < dropCount; i++) {
        const d = drops[i];
        const newY = d.y - d.speed * dt;

        // 碰撞检测：雨丝底端跨越障碍物顶部
        let hitY: number | null = null;
        for (const obs of obstacles) {
          if (d.x >= obs.left && d.x <= obs.right && d.y > obs.topY && newY <= obs.topY) {
            hitY = obs.topY;
            break;
          }
        }
        if (hitY === null && newY <= 0) hitY = 0; // 屏幕底部

        if (hitY !== null) {
          spawnSplash(d.x, hitY);
          d.x = Math.random() * width;
          d.y = height + RAIN_LENGTH;
          d.speed = 400 + Math.random() * 300;
        } else {
          d.y = newY;
        }

        dummy.position.set(d.x, d.y + RAIN_LENGTH / 2, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        rainMesh.setMatrixAt(i, dummy.matrix);
      }
      rainMesh.instanceMatrix.needsUpdate = true;
    }

    function stepSplash(dt: number) {
      for (let i = 0; i < SPLASH_COUNT; i++) {
        const p = particles[i];
        if (p.active) {
          p.vy -= 500 * dt; // 重力
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) p.active = false;
        }
        if (p.active) {
          dummy.position.set(p.x, p.y, 0);
          dummy.scale.setScalar(1);
        } else {
          dummy.position.set(0, 0, 0);
          dummy.scale.setScalar(0);
        }
        dummy.updateMatrix();
        splashMesh.setMatrixAt(i, dummy.matrix);
      }
      splashMesh.instanceMatrix.needsUpdate = true;
    }

    const clock = new THREE.Clock();
    let rafId = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      stepRain(dt);
      stepSplash(dt);
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.left = 0;
      camera.right = width;
      camera.top = height;
      camera.bottom = 0;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      updateObstacles();
    }
    function onScroll() {
      updateObstacles();
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      rainGeo.dispose();
      rainMat.dispose();
      splashGeo.dispose();
      splashMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      rainMaterialRef.current = null;
      splashMaterialRef.current = null;
    };
  }, [raining]);

  // 主题切换时更新雨丝/飞溅颜色（暗色浅雨丝、亮色深雨丝）
  useEffect(() => {
    const color = theme === 'dark' ? 0xd4d4d4 : 0x333333;
    rainMaterialRef.current?.color.setHex(color);
    splashMaterialRef.current?.color.setHex(color);
  }, [theme]);

  // 雨声：开启播放、关闭停止；独立 audio 元素，与音乐播放器叠加不冲突
  useEffect(() => {
    if (!raining) {
      audioRef.current?.pause();
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(RAIN_SOUND);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.6;
    }
    audioRef.current.play().catch(() => {});
  }, [raining]);

  // 卸载时停止雨声
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  if (!raining) return null;
  return <div ref={containerRef} className={styles.rain} />;
}
