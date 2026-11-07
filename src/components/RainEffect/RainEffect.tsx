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
// 雨声音频路径
const RAIN_SOUND = import.meta.env.BASE_URL + 'music/rain.mp3';

interface Drop {
  x: number; // 雨丝底端 x
  y: number; // 雨丝底端 y（three 坐标，向上增长，顶部为 height）
  speed: number; // 下落速度 px/s
  active: boolean;
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
  topY: number;
}

export default function RainEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rainMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const splashMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { raining } = useRain();
  const { theme } = useTheme();

  const stateRef = useRef<{
    raining: boolean;
    drops: Drop[];
    particles: SplashParticle[];
    obstacles: Obstacle[];
    width: number;
    height: number;
    rainMesh: THREE.InstancedMesh;
    splashMesh: THREE.InstancedMesh;
    splashIndex: number;
  } | null>(null);

  // 场景创建 + 动画循环：挂载时创建、卸载时销毁；raining 只控制雨滴生成/停止
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const dropCount = isMobile ? 200 : 400;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, width, height, 0, -10, 10);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const rainGeo = new THREE.PlaneGeometry(RAIN_WIDTH, RAIN_LENGTH);
    const rainMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d4, transparent: true, opacity: 0.55 });
    const rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, dropCount);
    rainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(rainMesh);
    rainMaterialRef.current = rainMat;

    const splashGeo = new THREE.PlaneGeometry(SPLASH_SIZE, SPLASH_SIZE);
    const splashMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d4, transparent: true, opacity: 0.85 });
    const splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, SPLASH_COUNT);
    splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(splashMesh);
    splashMaterialRef.current = splashMat;

    // 雨滴初始 inactive，开启后从顶部陆续下落
    const drops: Drop[] = Array.from({ length: dropCount }, () => ({
      x: Math.random() * width,
      y: height + Math.random() * height,
      speed: 400 + Math.random() * 300,
      active: false,
    }));

    const particles: SplashParticle[] = Array.from({ length: SPLASH_COUNT }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false,
    }));

    const obstacles: Obstacle[] = [];

    const state = {
      raining: false,
      drops,
      particles,
      obstacles,
      width,
      height,
      rainMesh,
      splashMesh,
      splashIndex: 0,
    };
    stateRef.current = state;

    function updateObstacles() {
      state.obstacles.length = 0;
      document.querySelectorAll('[data-rain-obstacle]').forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        state.obstacles.push({ left: rect.left, right: rect.right, topY: state.height - rect.top });
      });
    }
    updateObstacles();

    const dummy = new THREE.Object3D();

    // 初始化实例矩阵（全部隐藏）
    for (let i = 0; i < dropCount; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      rainMesh.setMatrixAt(i, dummy.matrix);
    }
    rainMesh.instanceMatrix.needsUpdate = true;
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
        const p = state.particles[state.splashIndex];
        state.splashIndex = (state.splashIndex + 1) % SPLASH_COUNT;
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
      const { drops, obstacles, width, height } = state;
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        if (!d.active) continue;

        const newY = d.y - d.speed * dt;
        let hitY: number | null = null;
        for (const obs of obstacles) {
          if (d.x >= obs.left && d.x <= obs.right && d.y > obs.topY && newY <= obs.topY) {
            hitY = obs.topY;
            break;
          }
        }
        if (hitY === null && newY <= 0) hitY = 0;

        if (hitY !== null) {
          spawnSplash(d.x, hitY);
          if (state.raining) {
            // 继续下雨：重置回顶部
            d.x = Math.random() * width;
            d.y = height + RAIN_LENGTH;
            d.speed = 400 + Math.random() * 300;
          } else {
            // 停止下雨：这滴自然消失，不再产生
            d.active = false;
          }
        } else {
          d.y = newY;
        }

        if (d.active) {
          dummy.position.set(d.x, d.y + RAIN_LENGTH / 2, 0);
          dummy.scale.setScalar(1);
        } else {
          dummy.position.set(0, 0, 0);
          dummy.scale.setScalar(0);
        }
        dummy.updateMatrix();
        rainMesh.setMatrixAt(i, dummy.matrix);
      }
      rainMesh.instanceMatrix.needsUpdate = true;
    }

    function stepSplash(dt: number) {
      const { particles } = state;
      for (let i = 0; i < particles.length; i++) {
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
      // 没有任何雨滴/飞溅时不渲染，省 GPU
      const anyActive = state.drops.some((d) => d.active) || state.particles.some((p) => p.active);
      if (anyActive) {
        renderer.render(scene, camera);
      }
    }
    animate();

    function onResize() {
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      camera.left = 0;
      camera.right = state.width;
      camera.top = state.height;
      camera.bottom = 0;
      camera.updateProjectionMatrix();
      renderer.setSize(state.width, state.height);
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
      stateRef.current = null;
      rainMaterialRef.current = null;
      splashMaterialRef.current = null;
    };
  }, []);

  // raining 变化：开启时从顶部开始下落，关闭时顶部停止产生、已下落的自然落完
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.raining = raining;
    if (raining) {
      for (const d of state.drops) {
        d.active = true;
        d.x = Math.random() * state.width;
        d.y = state.height + Math.random() * state.height; // 顶部上方，陆续进入
        d.speed = 400 + Math.random() * 300;
      }
    }
  }, [raining]);

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

  // 主题切换时更新雨丝/飞溅颜色（暗色浅雨丝、亮色深雨丝）
  useEffect(() => {
    const color = theme === 'dark' ? 0xd4d4d4 : 0x333333;
    rainMaterialRef.current?.color.setHex(color);
    splashMaterialRef.current?.color.setHex(color);
  }, [theme]);

  return <div ref={containerRef} className={styles.rain} />;
}
