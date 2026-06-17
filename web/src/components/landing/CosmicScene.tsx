import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  starVertexShader,
  starFragmentShader,
  nebulaVertexShader,
  nebulaFragmentShader,
} from "./shaders";

/* ═══════════════════════════════════
   Theme-aware color palettes
   ═══════════════════════════════════ */
const PALETTES = {
  dark: {
    stars: "#e8dfc8",
    gold: "#d89b4a",
    nebula1a: "#d89b4a",
    nebula1b: "#6d7ea8",
    nebula2a: "#8d9d6f",
    nebula2b: "#d89b4a",
    card: "#d89b4a",
    core: "#d89b4a",
    dust: "#e8dfc8",
    coreLight: "#d89b4a",
    blending: THREE.AdditiveBlending,
    cardOpacity: 0.07,
    cardEdgeOpacity: 0.3,
    coreOpacity: 0.5,
    glowOpacity: 0.10,
    dustOpacity: 1.0,
    coreLightIntensity: 1.5,
    starSizeScale: 1.0,
    nebulaAlpha: 0.12,
    dustSize: 0.3,
  },
  light: {
    stars: "#3b5a72",
    gold: "#b5703a",
    nebula1a: "#3b5a72",
    nebula1b: "#4a6e48",
    nebula2a: "#4a6e48",
    nebula2b: "#3b5a72",
    card: "#3b5a72",
    core: "#b5703a",
    dust: "#3b5a72",
    coreLight: "#b5703a",
    blending: THREE.NormalBlending,
    cardOpacity: 0.12,
    cardEdgeOpacity: 0.28,
    coreOpacity: 0.4,
    glowOpacity: 0.08,
    dustOpacity: 0.68,
    coreLightIntensity: 1.2,
    starSizeScale: 1.4,
    nebulaAlpha: 0.10,
    dustSize: 0.38,
  },
} as const;

function getTheme(): "dark" | "light" {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

export function CosmicScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let currentTheme = getTheme();
    let palette = PALETTES[currentTheme];

    /* ── renderer ── */
    const renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio < 2,
      alpha: true,
    });
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    /* ── scene & camera ── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;

    /* ── mouse & scroll state ── */
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let scrollY = 0;

    /* ═══════════════════════════════
       STAR FIELD
       ═══════════════════════════════ */
    const STAR_COUNT = 2000;
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starSizes = new Float32Array(STAR_COUNT);
    const starPhases = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 200;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 200;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 200;
      starSizes[i] = Math.random() * 2.5 + 0.5;
      starPhases[i] = Math.random();
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("aSize", new THREE.BufferAttribute(starSizes, 1));
    starGeo.setAttribute("aPhase", new THREE.BufferAttribute(starPhases, 1));

    const starMat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
        uColor: { value: new THREE.Color(palette.stars) },
        uSizeScale: { value: palette.starSizeScale },
      },
      transparent: true,
      blending: palette.blending,
      depthWrite: false,
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    /* ═════════════════════════════
       ACCENT STARS — larger
       ═════════════════════════════ */
    const GOLD_COUNT = 150;
    const goldPos = new Float32Array(GOLD_COUNT * 3);
    const goldSizes = new Float32Array(GOLD_COUNT);
    const goldPhases = new Float32Array(GOLD_COUNT);

    for (let i = 0; i < GOLD_COUNT; i++) {
      goldPos[i * 3] = (Math.random() - 0.5) * 180;
      goldPos[i * 3 + 1] = (Math.random() - 0.5) * 180;
      goldPos[i * 3 + 2] = (Math.random() - 0.5) * 160;
      goldSizes[i] = Math.random() * 4 + 2;
      goldPhases[i] = Math.random();
    }

    const goldGeo = new THREE.BufferGeometry();
    goldGeo.setAttribute("position", new THREE.BufferAttribute(goldPos, 3));
    goldGeo.setAttribute("aSize", new THREE.BufferAttribute(goldSizes, 1));
    goldGeo.setAttribute("aPhase", new THREE.BufferAttribute(goldPhases, 1));

    const goldMat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
        uColor: { value: new THREE.Color(palette.gold) },
        uSizeScale: { value: palette.starSizeScale },
      },
      transparent: true,
      blending: palette.blending,
      depthWrite: false,
    });

    const goldStars = new THREE.Points(goldGeo, goldMat);
    scene.add(goldStars);

    /* ═══════════════════
       NEBULA CLOUDS
       ═══════════════════ */
    const nebulaMats: THREE.ShaderMaterial[] = [];
    const nebulae: THREE.Mesh[] = [];
    const nebulaConfigs = [
      {
        c1: palette.nebula1a,
        c2: palette.nebula1b,
        offset: 0,
        z: -25,
        scale: 90,
        rotSpeed: 0.0008,
      },
      {
        c1: palette.nebula2a,
        c2: palette.nebula2b,
        offset: 3.14,
        z: -40,
        scale: 70,
        rotSpeed: -0.0005,
      },
    ];

    for (const cfg of nebulaConfigs) {
      const geo = new THREE.PlaneGeometry(cfg.scale, cfg.scale);
      const mat = new THREE.ShaderMaterial({
        vertexShader: nebulaVertexShader,
        fragmentShader: nebulaFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColor1: { value: new THREE.Color(cfg.c1) },
          uColor2: { value: new THREE.Color(cfg.c2) },
          uOffset: { value: cfg.offset },
          uAlphaScale: { value: palette.nebulaAlpha },
        },
        transparent: true,
        blending: palette.blending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = cfg.z;
      mesh.userData.rotSpeed = cfg.rotSpeed;
      scene.add(mesh);
      nebulae.push(mesh);
      nebulaMats.push(mat);
    }

    /* ═══════════════════════════
       ORBITAL CONTENT FRAGMENTS
       ═══════════════════════════ */
    const fragments: THREE.Group[] = [];
    const cardMats: THREE.MeshBasicMaterial[] = [];
    const edgeMats: THREE.LineBasicMaterial[] = [];
    const FRAG_COUNT = 8;

    for (let i = 0; i < FRAG_COUNT; i++) {
      const group = new THREE.Group();

      const cardGeo = new THREE.PlaneGeometry(2.8, 1.8);
      const cardMat = new THREE.MeshBasicMaterial({
        color: palette.card,
        transparent: true,
        opacity: palette.cardOpacity,
        side: THREE.DoubleSide,
      });
      const card = new THREE.Mesh(cardGeo, cardMat);
      group.add(card);
      cardMats.push(cardMat);

      const edgeGeo = new THREE.EdgesGeometry(cardGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: palette.card,
        transparent: true,
        opacity: palette.cardEdgeOpacity,
      });
      group.add(new THREE.LineSegments(edgeGeo, edgeMat));
      edgeMats.push(edgeMat);

      scene.add(group);
      fragments.push(group);
    }

    /* ═══════════════
       CENTRAL CORE
       ═══════════════ */
    const coreMat = new THREE.MeshBasicMaterial({
      color: palette.core,
      transparent: true,
      opacity: palette.coreOpacity,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), coreMat);
    scene.add(core);

    const glowMat = new THREE.MeshBasicMaterial({
      color: palette.core,
      transparent: true,
      opacity: palette.glowOpacity,
    });
    const glowSphere = new THREE.Mesh(
      new THREE.SphereGeometry(3, 32, 32),
      glowMat
    );
    scene.add(glowSphere);

    const coreLight = new THREE.PointLight(
      palette.coreLight,
      palette.coreLightIntensity,
      60
    );
    scene.add(coreLight);

    /* ═══════════════════
       INTERACTIVE DUST
       ═══════════════════ */
    const DUST_COUNT = 500;
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustHome = new Float32Array(DUST_COUNT * 3);
    const dustVel = new Float32Array(DUST_COUNT * 3);
    const dustSizes = new Float32Array(DUST_COUNT);
    const dustPhases = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      const x = (Math.random() - 0.5) * 160;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 80;
      dustPositions[i * 3] = x;
      dustPositions[i * 3 + 1] = y;
      dustPositions[i * 3 + 2] = z;
      dustHome[i * 3] = x;
      dustHome[i * 3 + 1] = y;
      dustHome[i * 3 + 2] = z;
      dustSizes[i] = Math.random() * 2.0 + 1.5;
      dustPhases[i] = Math.random();
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(dustPositions, 3)
    );

    dustGeo.setAttribute("aSize", new THREE.BufferAttribute(dustSizes, 1));
    dustGeo.setAttribute("aPhase", new THREE.BufferAttribute(dustPhases, 1));

    const dustMat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
        uColor: { value: new THREE.Color(palette.dust) },
        uSizeScale: { value: palette.dustSize * 2.0 },
      },
      transparent: true,
      opacity: palette.dustOpacity,
      blending: palette.blending,
      depthWrite: false,
    });

    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ═══════════════════════════════════
       THEME SWITCHING — update all colors
       ═══════════════════════════════════ */
    function applyTheme(theme: "dark" | "light") {
      palette = PALETTES[theme];

      // Star fields
      starMat.uniforms.uColor.value.set(palette.stars);
      starMat.uniforms.uSizeScale.value = palette.starSizeScale;
      starMat.blending = palette.blending;
      starMat.needsUpdate = true;

      goldMat.uniforms.uColor.value.set(palette.gold);
      goldMat.uniforms.uSizeScale.value = palette.starSizeScale;
      goldMat.blending = palette.blending;
      goldMat.needsUpdate = true;

      // Nebulae
      const nebulaColors = [
        [palette.nebula1a, palette.nebula1b],
        [palette.nebula2a, palette.nebula2b],
      ];
      nebulaMats.forEach((mat, i) => {
        mat.uniforms.uColor1.value.set(nebulaColors[i][0]);
        mat.uniforms.uColor2.value.set(nebulaColors[i][1]);
        mat.uniforms.uAlphaScale.value = palette.nebulaAlpha;
        mat.blending = palette.blending;
        mat.needsUpdate = true;
      });

      // Fragments
      cardMats.forEach((m) => {
        m.color.set(palette.card);
        m.opacity = palette.cardOpacity;
      });
      edgeMats.forEach((m) => {
        m.color.set(palette.card);
        m.opacity = palette.cardEdgeOpacity;
      });

      // Core
      coreMat.color.set(palette.core);
      coreMat.opacity = palette.coreOpacity;
      glowMat.color.set(palette.core);
      glowMat.opacity = palette.glowOpacity;
      coreLight.color.set(palette.coreLight);
      coreLight.intensity = palette.coreLightIntensity;

      // Dust
      dustMat.uniforms.uColor.value.set(palette.dust);
      dustMat.uniforms.uSizeScale.value = palette.dustSize * 2.0;
      dustMat.opacity = palette.dustOpacity;
      dustMat.blending = palette.blending;
      dustMat.needsUpdate = true;
    }

    // Watch for theme changes on <html data-theme="...">
    const observer = new MutationObserver(() => {
      const next = getTheme();
      if (next !== currentTheme) {
        currentTheme = next;
        applyTheme(next);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    /* ══════════════════
       EVENT LISTENERS
       ══════════════════ */
    const onMouseMove = (e: MouseEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onScroll = () => {
      scrollY = window.scrollY;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    /* ══════════════════
       RENDER LOOP
       ══════════════════ */
    const clock = new THREE.Clock();
    let frameId: number;

    const render = () => {
      frameId = requestAnimationFrame(render);
      const t = clock.getElapsedTime();

      // Smooth mouse lerp
      mouse.x += (target.x - mouse.x) * 0.04;
      mouse.y += (target.y - mouse.y) * 0.04;

      // Camera parallax + scroll depth
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const scrollFrac = scrollY / maxScroll;
      camera.position.x = mouse.x * 3;
      camera.position.y = mouse.y * 2;
      camera.position.z = 50 - scrollFrac * 25;
      camera.lookAt(0, 0, 0);

      // Star rotation
      stars.rotation.y = t * 0.015;
      stars.rotation.x = t * 0.008;
      goldStars.rotation.y = -t * 0.012;

      // Update star/dust uniforms
      starMat.uniforms.uTime.value = t;
      goldMat.uniforms.uTime.value = t;
      dustMat.uniforms.uTime.value = t;

      // Nebula rotation + time
      for (const neb of nebulae) {
        (neb.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
        neb.rotation.z += neb.userData.rotSpeed;
      }

      // Orbital fragments
      for (let i = 0; i < FRAG_COUNT; i++) {
        const frag = fragments[i];
        const angle =
          t * 0.15 * (0.6 + i * 0.08) + (i * Math.PI * 2) / FRAG_COUNT;
        const radius = 10 + i * 1.8;
        frag.position.x = Math.cos(angle) * radius;
        frag.position.y = Math.sin(t * 0.25 + i * 0.7) * 3;
        frag.position.z = Math.sin(angle) * radius;
        frag.lookAt(camera.position);
      }

      // Core pulse
      const s = 1 + Math.sin(t * 0.7) * 0.12;
      core.scale.setScalar(s);
      glowSphere.scale.setScalar(s * 1.1);

      // Interactive dust
      const dustAttr = dustGeo.attributes.position as THREE.BufferAttribute;
      const dArr = dustAttr.array as Float32Array;
      const mx = mouse.x * 30;
      const my = mouse.y * 20;

      for (let i = 0; i < DUST_COUNT; i++) {
        const ix = i * 3;
        const dx = dArr[ix] - mx;
        const dy = dArr[ix + 1] - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 12) {
          const force = ((12 - dist) / 12) * 0.015;
          dustVel[ix] += dx * force;
          dustVel[ix + 1] += dy * force;
        }

        dustVel[ix] += (dustHome[ix] - dArr[ix]) * 0.003;
        dustVel[ix + 1] += (dustHome[ix + 1] - dArr[ix + 1]) * 0.003;

        dustVel[ix] *= 0.97;
        dustVel[ix + 1] *= 0.97;

        dArr[ix] += dustVel[ix];
        dArr[ix + 1] += dustVel[ix + 1];
        dArr[ix + 2] += Math.sin(t * 0.5 + i * 0.3) * 0.001;
      }
      dustAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    render();

    /* ══════════
       CLEANUP
       ══════════ */
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
        if (obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
    };
  }, []);

  return <div className="cosmic-canvas" ref={containerRef} aria-hidden="true" />;
}
