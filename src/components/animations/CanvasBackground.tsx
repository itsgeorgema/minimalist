"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Shaders – inlined to avoid GLSL loader config in Next.js
// ---------------------------------------------------------------------------

const VERT = /* glsl */ `
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// GLSL ES 1.00 does not support function overloading, so mod289 is split
// into two names to stay compatible with WebGL 1 contexts.
const FRAG = /* glsl */ `
precision highp float;

uniform sampler2D grainTex;
uniform sampler2D blurTex;
uniform float time;
uniform float seed;
uniform vec3 back;
uniform float style;
uniform float param1;
uniform float param2;
uniform float param3;

varying vec2 vUv;

#define PI 3.14159265358979323

vec3 mod289v3(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec2 mod289v2(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec3 permute(vec3 x) {
  return mod289v3(((x * 34.0) + 10.0) * x);
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
   -0.577350269189626,
    0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy  -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                          + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(
    0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
    0.0
  );
  m = m * m;
  m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.792842914001590 - 0.853734720953140 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz  + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float snoise01(vec2 v) {
  return (1.0 + snoise(v)) * 0.5;
}

float noise2d(vec2 st) {
  return snoise01(vec2(st.x + time * 0.02, st.y - time * 0.04 + seed));
}

float pattern(vec2 p) {
  vec2 q = vec2(
    noise2d(p + vec2(0.0, 0.0)),
    noise2d(p + vec2(5.2, 1.3))
  );
  vec2 r = vec2(
    noise2d(p + 4.0 * q + vec2(1.7, 9.2)),
    noise2d(p + 4.0 * q + vec2(8.3, 2.8))
  );
  return noise2d(p + 1.0 * r);
}

void main() {
  vec2 uv = vUv;
  vec2 p  = gl_FragCoord.xy;

  // monospaced: snap UVs to a 50×50 cell grid
  uv = style > 0.0 ? ceil(uv * 50.0) / 50.0 : uv;

  // grain texture – tiled in screen-space pixels
  vec3 grainColor = texture2D(grainTex, mod(p * param1 * 5.0, 1024.0) / 1024.0).rgb;
  float blurAlpha = texture2D(blurTex, uv).a;

  float gr = pow(grainColor.r, 1.5) + 0.5 * (1.0 - blurAlpha);
  float gg = grainColor.g;

  float ax = param2 * gr * cos(gg * 2.0 * PI);
  float ay = param2 * gr * sin(gg * 2.0 * PI);

  float ndx = param3       + 0.1 * (1.0 - blurAlpha);
  float ndy = 2.0 * param3 + 0.1 * (1.0 - blurAlpha);
  float nx  = uv.x * ndx + ax;
  float ny  = uv.y * ndy + ay;

  float n = pattern(vec2(nx, ny));
  n = pow(n * 1.1, 3.5);
  n = smoothstep(0.0, 1.0, n);
  // Guarantee a minimum visible effect weighted by center proximity,
  // so the center is never a dead zone regardless of the random seed.
  n = max(n, 0.13 * blurAlpha);

  vec3 front  = vec3(0.5);
  vec3 result = mix(back, front, n);

  gl_FragColor = vec4(result, blurAlpha);
}
`;

// ---------------------------------------------------------------------------
// Procedural textures (replace the pre-baked grain.webp / blur.webp assets)
// ---------------------------------------------------------------------------

function makeGrainTexture(): THREE.DataTexture {
  const SIZE = 1024;
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    // r → grain intensity  |  g → grain direction angle (0–1 → 0–2π)
    data[i * 4 + 0] = Math.random() * 255;
    data[i * 4 + 1] = Math.random() * 255;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function makeBlurTexture(): THREE.DataTexture {
  // Full alpha = 1 everywhere so the canvas covers the entire background.
  // A very gentle vignette at the outermost edges softens the boundary.
  const SIZE = 512;
  const data = new Uint8Array(SIZE * SIZE * 4);
  const cx = 0.5;
  const cy = 0.5;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const fx = x / (SIZE - 1);
      const fy = y / (SIZE - 1);
      const dx = (fx - cx) * 2.0;
      const dy = (fy - cy) * 2.0;
      const dist = Math.sqrt(dx * dx + dy * dy); // 0 at center, √2 at corners
      // Vignette: full opacity inside r=0.9, smooth fade-out to r=1.2
      const t = Math.max(0, Math.min(1, (dist - 0.9) / 0.3));
      const alpha = 1.0 - t * t * (3.0 - 2.0 * t); // smoothstep
      const idx = (y * SIZE + x) * 4;
      data[idx + 0] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scene
    const scene = new THREE.Scene();

    // Orthographic camera: -1..1 on both axes → the 2×2 plane fills the view
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    };
    handleResize();

    // Textures
    const grainTex = makeGrainTexture();
    const blurTex  = makeBlurTexture();

    // Mesh
    const geometry = new THREE.PlaneGeometry(2, 2);

    // back colour = site background #edeae4 → rgb(237,234,228)/255
    const backColor = new THREE.Vector3(237 / 255, 234 / 255, 228 / 255);

    const material = new THREE.RawShaderMaterial({
      uniforms: {
        grainTex: { value: grainTex },
        blurTex:  { value: blurTex  },
        time:     { value: 0.0 },
        seed:     { value: Math.random() * 100.0 },
        back:     { value: backColor },
        style:    { value: 1.0 },   // monospaced: snaps UVs to 50×50 grid
        param1:   { value: 1.0 },   // grain scale
        param2:   { value: 0.06 },  // grain displacement strength
        param3:   { value: 0.22 },  // noise density
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // RAF loop
    const start = performance.now();
    let rafId: number;
    let firstFrame = true;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      material.uniforms.time.value = (performance.now() - start) * 0.001;
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        // Fade in after the first frame is fully rendered so the canvas
        // never shows a blank period on load.
        requestAnimationFrame(() => {
          canvas.style.transition = "opacity 400ms ease";
          canvas.style.opacity = "1";
        });
      }
    };
    tick();

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      grainTex.dispose();
      blurTex.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        display: "block",
        opacity: 0,
      }}
    />
  );
}
