import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Cloud, Clouds, Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, GodRays, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { skyPalette } from '@/shared/ui/theme/sky';
import { hourAt, phaseAt, shootingStarWindow, type TimeOverride } from './time';
import { CLOUD_GROUPS, driftCloud } from './cloud-motion';
import cloudTexture from '@/assets/aldi-cloud.png.asset.json';
import { screenVertex, skyFragment, grassVertex, grassFragment, particleVertex, particleFragment, flowerVertex, flowerFragment } from './shaders';

type Props = { reduced: boolean; paused: boolean; override?: TimeOverride | undefined; onReady: () => void };
const KEYFRAMES = [
  { hour: 0, name: 'night', night: 1, sunset: 0, day: 0, sun: .2 },
  { hour: 5, name: 'night', night: 1, sunset: 0, day: 0, sun: .18 },
  { hour: 6, name: 'dawn', night: .15, sunset: .3, day: .6, sun: .27 },
  { hour: 7.5, name: 'day', night: 0, sunset: 0, day: 1, sun: .54 },
  { hour: 12, name: 'day', night: 0, sunset: 0, day: 1, sun: .85 },
  { hour: 17.5, name: 'day', night: 0, sunset: 0, day: 1, sun: .54 },
  { hour: 19, name: 'sunset', night: .05, sunset: 1, day: .8, sun: .27 },
  { hour: 20.5, name: 'night', night: 1, sunset: 0, day: 0, sun: .18 },
  { hour: 24, name: 'night', night: 1, sunset: 0, day: 0, sun: .2 },
] as const;

function random(seed: number) { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }

function CloudReady() {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    let frame = 0;
    const draw = () => { invalidate(); if (++frame < 5) requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
  }, [invalidate]);
  return null;
}

function makeFoliage(count: number, flowers: boolean) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(flowers
    ? [-.009, -.009, 0, .009, -.009, 0, -.009, .009, 0, .009, .009, 0]
    : [-.002, 0, 0, .002, 0, 0, -.0005, .028, 0, .0005, .028, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  const roots = new Float32Array(count * 3), seeds = new Float32Array(count), colors = new Float32Array(count * 3);
  const palette = [skyPalette.flowerLilac, skyPalette.flowerWhite, skyPalette.flowerBlue];
  for (let i = 0; i < count; i++) {
    const x = (random(i + 1) * 2 - 1) * 3;
    const top = -.82 + Math.sin(x * 2.3) * .048 + Math.sin(x * 4.9) * .018;
    roots.set([x, -1.025 + random(i + 91) * (top + 1.025), 0], i * 3);
    seeds[i] = random(i + 277);
    const color = new THREE.Color(palette[i % 3]);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('aRoot', new THREE.InstancedBufferAttribute(roots, 3));
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  geometry.instanceCount = count;
  return geometry;
}

function makeParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = [], seeds = [], sizes = [], colors = [];
  for (let i = 0; i < 135; i++) {
    const firefly = i < 42;
    positions.push((random(i + 301) * 2 - 1) * 2.8, firefly ? -.82 + random(i + 42) * .23 : -.65 + random(i + 66) * 1.4, 0);
    seeds.push(firefly ? random(i + 33) * .49 : .51 + random(i + 45) * .49);
    sizes.push(firefly ? 4 + random(i + 10) * 4 : 1.5 + random(i + 2) * 3);
    const color = new THREE.Color(firefly ? skyPalette.firefly : skyPalette.starWarm);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function World({ reduced, paused, override, onReady }: Props) {
  const { size, gl, invalidate, camera, scene } = useThree();
  const input = useRef(new THREE.Vector2());
  const elapsed = useRef(0);
  const last = useRef<number | undefined>(undefined);
  const ready = useRef(false);
  const cloudRoot = useRef<THREE.Group>(null);
  const cloudRefs = useRef<Array<THREE.Group | null>>([]);
  const sunlight = useRef<THREE.DirectionalLight>(null);
  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);
  const sunPoint = useMemo(() => new THREE.Vector3(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uAspect: { value: 1 }, uNight: { value: 0 }, uDay: { value: 1 }, uSunset: { value: 0 }, uSunY: { value: .85 }, uMeteor: { value: -1 }, uDpr: { value: 1 },
    uOffset: { value: new THREE.Vector2() },
    uSunPosition: { value: new THREE.Vector2(0, .7) },
    uZenith: { value: new THREE.Color() }, uMiddle: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uCloud: { value: new THREE.Color() },
    uShadow: { value: new THREE.Color() }, uHill: { value: new THREE.Color() }, uNear: { value: new THREE.Color() },
    uAuroraLilac: { value: new THREE.Color(skyPalette.auroraLilac) }, uAuroraTeal: { value: new THREE.Color(skyPalette.auroraTeal) }, uAuroraGreen: { value: new THREE.Color(skyPalette.auroraGreen) },
  }), []);
  const resources = useMemo(() => ({ grass: makeFoliage(8500, false), flowers: makeFoliage(360, true), particles: makeParticles() }), []);
  const targetColor = useMemo(() => new THREE.Color(), []);
  useEffect(() => () => { Object.values(resources).forEach(resource => resource.dispose()); }, [resources]);
  useEffect(() => { last.current = undefined; if (!paused) invalidate(); }, [paused, reduced, invalidate, size, override]);
  useEffect(() => {
    if (reduced) return;
    const mouse = (event: MouseEvent) => input.current.set((event.clientX / window.innerWidth - .5) * .025, (.5 - event.clientY / window.innerHeight) * .018);
    const orientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;
      input.current.set(THREE.MathUtils.clamp(event.gamma / 45, -1, 1) * .012, THREE.MathUtils.clamp((event.beta - 45) / 45, -1, 1) * .009);
    };
    window.addEventListener('mousemove', mouse, { passive: true });
    window.addEventListener('deviceorientation', orientation, { passive: true });
    return () => { window.removeEventListener('mousemove', mouse); window.removeEventListener('deviceorientation', orientation); };
  }, [reduced]);

  useFrame(() => {
    const now = performance.now();
    const delta = last.current === undefined ? 0 : Math.min((now - last.current) / 1000, .5);
    last.current = now;
    if (!reduced && !paused) elapsed.current += delta;
    const t = reduced ? 0 : elapsed.current;
    const hour = hourAt(override, t, new Date());
    gl.domElement.dataset['skyHour'] = String(hour);
    const patient = gl.domElement.closest<HTMLElement>('.theme-patient');
    if (patient) {
      const phase = phaseAt(hour);
      if (patient.dataset['skyPhase'] !== phase) patient.dataset['skyPhase'] = phase;
    }
    const index = Math.max(0, KEYFRAMES.findIndex((frame, i) => hour >= frame.hour && hour < (KEYFRAMES[i + 1]?.hour ?? 24)));
    const a = KEYFRAMES[index], b = KEYFRAMES[index + 1];
    if (!a || !b) return;
    const raw = (hour - a.hour) / (b.hour - a.hour), blend = raw * raw * (3 - 2 * raw);
    const pa = skyPalette[a.name], pb = skyPalette[b.name];
    const colorKeys = [['uZenith', 'zenith'], ['uMiddle', 'middle'], ['uHorizon', 'horizon'], ['uCloud', 'cloud'], ['uShadow', 'shadow'], ['uHill', 'hill'], ['uNear', 'near']] as const;
    colorKeys.forEach(([uniform, key]) => uniforms[uniform].value.set(pa[key]).lerp(targetColor.set(pb[key]), blend));
    uniforms.uNight.value = THREE.MathUtils.lerp(a.night, b.night, blend);
    uniforms.uDay.value = THREE.MathUtils.lerp(a.day, b.day, blend);
    uniforms.uSunset.value = THREE.MathUtils.lerp(a.sunset, b.sunset, blend);
    uniforms.uSunY.value = THREE.MathUtils.lerp(a.sun, b.sun, blend);
    uniforms.uTime.value = t;
    uniforms.uAspect.value = size.width / size.height;
    const orb = patient?.querySelector('.aldi-orb');
    if (orb) {
      const bounds = orb.getBoundingClientRect();
      uniforms.uSunPosition.value.set(((bounds.left + bounds.width / 2) / size.width - .5) * uniforms.uAspect.value, 1 - (bounds.top + bounds.height / 2) / size.height);
    }
    uniforms.uDpr.value = gl.getPixelRatio();
    const breathing = reduced ? 0 : Math.sin(t * Math.PI * 2 / 30) * .004;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, input.current.x, 2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, input.current.y, 2, delta);
    uniforms.uOffset.value.set(camera.position.x + breathing, camera.position.y + breathing * .6);
    const lightingA = skyPalette.cloudLighting[a.name], lightingB = skyPalette.cloudLighting[b.name];
    const cloudColor = tint.set(lightingA.cloud).lerp(targetColor.set(lightingB.cloud), blend);
    const cloudOpacity = THREE.MathUtils.lerp(lightingA.opacity, lightingB.opacity, blend);
    if (sunlight.current) {
      sunlight.current.color.set(lightingA.light).lerp(targetColor.set(lightingB.light), blend);
      sunlight.current.intensity = THREE.MathUtils.lerp(lightingA.intensity, lightingB.intensity, blend);
    }
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(uniforms.uHorizon.value);
    cloudRefs.current.forEach((group, i) => {
      const config = CLOUD_GROUPS[i];
      if (!group || !config) return;
      const edge = Math.abs(config.z) * Math.tan(THREE.MathUtils.degToRad(25)) * uniforms.uAspect.value + config.bounds[0] + config.volume + 12;
      if (!reduced && !paused) group.position.x = driftCloud(group.position.x, Math.min(delta, .05), edge);
    });
    cloudRoot.current?.traverse(object => {
      if (!(object instanceof THREE.InstancedMesh)) return;
      const material = object.material;
      if (material instanceof THREE.MeshLambertMaterial) {
        material.opacity = cloudOpacity / .9;
        material.color.copy(cloudColor);
        material.alphaTest = .015;
        material.depthWrite = true;
      }
    });
    sunPoint.set(uniforms.uSunPosition.value.x / uniforms.uAspect.value * 2, uniforms.uSunPosition.value.y * 2 - 1, .999).unproject(camera);
    if (sunMesh) {
      sunMesh.position.copy(sunPoint);
      if (sunMesh.material instanceof THREE.MeshBasicMaterial) sunMesh.material.color.set(lightingA.light).lerp(targetColor.set(lightingB.light), blend).multiplyScalar(1-uniforms.uNight.value*.95);
    }
    if (sunlight.current) sunlight.current.position.copy(sunPoint);
    if (import.meta.env.DEV) {
      gl.domElement.dataset['cloudX'] = cloudRefs.current.map(group => group?.position.x.toFixed(5) ?? '').join(',');
      gl.domElement.dataset['cloudOpacity'] = String(cloudOpacity);
    }
    uniforms.uMeteor.value = -1;
    if (!reduced) {
      const nearest = Math.max(0, Math.floor((t - 24) / 30));
      for (let i = Math.max(0, nearest - 1); i <= nearest + 1; i++) {
        const window = shootingStarWindow(i);
        if (t >= window.start && t < window.start + window.duration) uniforms.uMeteor.value = (t - window.start) / window.duration;
      }
    }
    if (!ready.current) { ready.current = true; requestAnimationFrame(() => { invalidate(); requestAnimationFrame(onReady); }); }
  }, -1);

  return <>
    <fog attach="fog" args={[skyPalette.day.horizon, 30, 90]} />
    <hemisphereLight args={[skyPalette.cloudSkyLight, skyPalette.cloudGroundLight, .6]} />
    <ambientLight intensity={.3} />
    <directionalLight ref={sunlight} color={skyPalette.cloudLighting.day.light} intensity={2} position={[0, 30, -10]} />
    <mesh ref={setSunMesh} renderOrder={-9}>
      <sphereGeometry args={[1.2, 24, 16]} />
      <meshBasicMaterial color={skyPalette.cloudLighting.day.light} fog={false} depthWrite={false} />
    </mesh>
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial uniforms={uniforms} onUpdate={material => { material.uniforms = uniforms; }} vertexShader={screenVertex} fragmentShader={skyFragment} depthTest={false} depthWrite={false} />
    </mesh>
    <Suspense fallback={null}>
      <CloudReady />
      <Clouds ref={cloudRoot} material={THREE.MeshLambertMaterial} limit={400} texture={cloudTexture.url}>
        {CLOUD_GROUPS.map((config, i) => <Cloud key={config.seed} ref={group => { cloudRefs.current[i] = group; }} seed={config.seed} position={[config.x, config.y, config.z]} segments={config.segments} bounds={[...config.bounds]} volume={config.volume} growth={4} speed={reduced || paused ? 0 : .1} fade={30} opacity={.9} color={skyPalette.cloudWhite} />)}
      </Clouds>
    </Suspense>
    <mesh geometry={resources.grass} frustumCulled={false} renderOrder={1}>
      <shaderMaterial uniforms={uniforms} onUpdate={material => { material.uniforms = uniforms; }} vertexShader={grassVertex} fragmentShader={grassFragment} depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={resources.flowers} frustumCulled={false} renderOrder={2}>
      <shaderMaterial uniforms={uniforms} onUpdate={material => { material.uniforms = uniforms; }} vertexShader={flowerVertex} fragmentShader={flowerFragment} depthTest={false} depthWrite={false} transparent />
    </mesh>
    <points geometry={resources.particles} frustumCulled={false} renderOrder={3}>
      <shaderMaterial uniforms={uniforms} onUpdate={material => { material.uniforms = uniforms; }} vertexShader={particleVertex} fragmentShader={particleFragment} depthTest={false} depthWrite={false} transparent blending={THREE.AdditiveBlending} />
    </points>
    <Environment resolution={32} frames={1}>
      <Lightformer intensity={1} color={skyPalette.day.middle} position={[0, 5, 0]} scale={[10, 10, 1]} />
      <Lightformer intensity={.5} color={skyPalette.day.horizon} position={[-5, 0, 0]} rotation-y={Math.PI / 2} scale={[10, 10, 1]} />
    </Environment>
    <EffectComposer multisampling={0} autoClear={false}>
      {sunMesh ? <GodRays sun={sunMesh} samples={60} density={.96} decay={.94} weight={.25} exposure={.2} clampMax={.35} blur /> : <></>}
      <Bloom intensity={.28} luminanceThreshold={1.05} luminanceSmoothing={.35} mipmapBlur />
      <Noise opacity={.012} premultiply />
      <Vignette offset={.2} darkness={.22} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  </>;
}

export default function SkyScene(props: Props) {
  return <Canvas frameloop={props.paused ? 'never' : props.reduced ? 'demand' : 'always'} dpr={[1, 2]} gl={{ antialias: false, alpha: false, toneMapping: THREE.NoToneMapping }} camera={{ position: [0, 0, 0], rotation: [.12, 0, 0], fov: 50, far: 150 }}>
    <World {...props} />
  </Canvas>;
}